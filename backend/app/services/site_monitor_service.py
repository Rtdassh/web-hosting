"""HTTP availability samples and aggregate access-log statistics without storing visitors."""
import http.client
import re
import time
from datetime import datetime, timezone
from app.core.config import settings
from app.services.site_storage_service import atomic_json, read_json, site_data_dir

ACCESS_LINE = re.compile(r'"(?P<method>GET|HEAD|POST|PUT|DELETE|OPTIONS|PATCH) [^"\r\n]+ HTTP/[0-9.]+" (?P<status>[0-9]{3}) (?P<bytes>[0-9]+|-)')


def summarize_access_logs(lines: list[str]) -> dict:
    requests = transferred = errors = 0
    for line in lines:
        match = ACCESS_LINE.search(line)
        if not match or match['method'] == 'HEAD':
            continue  # Monitoring uses HEAD and does not inflate user requests.
        requests += 1
        transferred += int(match['bytes']) if match['bytes'].isdigit() else 0
        errors += int(int(match['status']) >= 400)
    return {"requests": requests, "response_body_bytes": transferred, "errors": errors,
            "scope": "Últimas 1000 líneas disponibles del contenedor actual; no son visitantes únicos ni tráfico histórico total."}


class SiteMonitorService:
    def probe(self, port: int) -> dict:
        if not settings.PORT_RANGE_START <= port <= settings.PORT_RANGE_END:
            raise ValueError("Port outside hosting pool")
        start = time.monotonic()
        connection = http.client.HTTPConnection(settings.MONITOR_HOST, port, timeout=settings.MONITOR_TIMEOUT_SECONDS)
        code = None
        try:
            connection.request("HEAD", "/", headers={"Host": "localhost", "User-Agent": "Codrop-Monitor/1.0"})
            response = connection.getresponse()
            code = response.status
        except (OSError, http.client.HTTPException):
            pass
        finally:
            connection.close()
        return {"status": "up" if code is not None and 200 <= code < 400 else "down",
                "http_status": code, "latency_ms": round((time.monotonic() - start) * 1000, 1)}

    def capture(self, instance) -> dict:
        sample = {"checked_at": datetime.now(timezone.utc).isoformat()}
        status = getattr(instance.status, "value", instance.status)
        sample.update(self.probe(instance.assigned_port) if status == "running" else {"status": "stopped" if status == "stopped" else "down", "http_status": None, "latency_ms": None})
        path = site_data_dir(instance) / "monitor.json"
        history = read_json(path, [])
        history.append(sample)
        atomic_json(path, history[-settings.MONITOR_SAMPLES:])
        return sample

    def report(self, instance) -> dict:
        history = read_json(site_data_dir(instance) / "monitor.json", [])
        active = [sample for sample in history if sample['status'] != 'stopped']
        latest = history[-1] if history else None
        stale = latest is None or (datetime.now(timezone.utc) - datetime.fromisoformat(latest['checked_at'])).total_seconds() > 120
        return {"latest": latest, "stale": stale, "samples": len(history),
                "availability_percent": round(100 * sum(s['status'] == 'up' for s in active) / len(active), 2) if active else None,
                "recent": history[-60:], "interval_seconds": 30}


site_monitor_service = SiteMonitorService()
