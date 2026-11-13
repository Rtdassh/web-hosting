import { useEffect } from 'react';
import { instanceService } from '../../services/api';
import { toast } from '../ui/Toast';

export default function SiteHealthNotifications() {
  useEffect(() => {
    let stopped = false;
    const previous = new Map();
    const poll = async () => {
      try {
        const sites = await instanceService.getHealth();
        if (stopped) return;
        const ids = new Set(sites.map((site) => site.id));
        previous.forEach((_, id) => { if (!ids.has(id)) previous.delete(id); });
        sites.forEach(({ id, name, monitor }) => {
          if (monitor.stale || !monitor.latest) return;
          const status = monitor.latest.status;
          if (status === 'down' && previous.get(id) !== 'down') toast.warning(`El sitio "${name}" no responde correctamente. Revisa su disponibilidad.`, { title: 'Alerta de sitio', duration: 8000 });
          if (status === 'up' && previous.get(id) === 'down') toast.success(`El sitio "${name}" vuelve a responder.`, { title: 'Servicio recuperado' });
          previous.set(id, status);
        });
      } catch { /* Monitoring failures must not masquerade as site outages. */ }
    };
    poll(); const timer = setInterval(poll, 30000);
    return () => { stopped = true; clearInterval(timer); };
  }, []);
  return null;
}
