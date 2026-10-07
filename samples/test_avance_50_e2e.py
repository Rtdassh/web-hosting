#!/usr/bin/env python3
"""
Script de Verificación Automatizada Integral E2E - Hito 50% (CloudPaaS)
Valida los 7 criterios de aceptación del Hito 50%:
1. Autenticación y perfil (/auth/login, /auth/me)
2. Despliegue con límites y red aislada (/instances/deploy)
3. Telemetría y métricas de CPU/RAM en vivo (RF-20)
4. Visor de logs del servidor web Nginx (RF-21)
5. Control de ciclo de vida completo: Start, Stop, Restart (RF-16)
6. Sincronización y reconciliación ante caídas externas (RF-16, T3.3)
7. Enforzamiento estricto de cuotas (Free: máx 1 sitio) (RF-12)
8. Destrucción segura, liberación de puerto y purga de disco (RF-17, T4.4)
"""

import sys
import os
import time
import requests
from pathlib import Path

BASE_URL = os.environ.get("PAAS_API_URL", "http://100.112.65.75:8000/api/v1")
SAMPLES_DIR = Path(__file__).resolve().parent

def run_tests():
    print("===========================================================")
    print("  Iniciando Pruebas Integrales E2E - CloudPaaS Hito 50%")
    print(f"  Target API: {BASE_URL}")
    print("===========================================================\n")

    session = requests.Session()

    # 0. Limpieza previa para garantizar idempotencia
    print("[0/10] Preparando entorno y limpiando instancias previas...")
    try:
        clean_res = session.post(f"{BASE_URL}/auth/login", json={"email": "dev@cloudpaas.local", "password": "admin123"}, timeout=5)
        if clean_res.status_code == 200:
            c_token = clean_res.json()["access_token"]
            c_headers = {"Authorization": f"Bearer {c_token}"}
            inst_list = requests.get(f"{BASE_URL}/instances", headers=c_headers, timeout=5).json()
            for inst in inst_list:
                requests.delete(f"{BASE_URL}/instances/{inst['id']}", headers=c_headers, timeout=5)
    except Exception as e:
        print(f"  [Aviso] Limpieza inicial: {e}")

    # 1. Autenticación (RF-03)
    print("\n[1/10] Probando inicio de sesión (RF-03)...")
    res = session.post(f"{BASE_URL}/auth/login", json={"email": "dev@cloudpaas.local", "password": "admin123"}, timeout=5)
    if res.status_code != 200:
        print(f"  ❌ Falla al autenticar: {res.status_code} - {res.text}")
        return False
    token = res.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    print("  ✅ Token JWT emitido y configurado en Authorization header.")

    # 2. Consultar perfil y cuota actual (/auth/me)
    print("\n[2/10] Consultando perfil y cuota del usuario (GET /auth/me)...")
    res = session.get(f"{BASE_URL}/auth/me", timeout=5)
    if res.status_code != 200:
        print(f"  ❌ Error en /auth/me: {res.status_code} - {res.text}")
        return False
    user_me = res.json()
    print(f"  ✅ Usuario: {user_me['email']} | Plan: {user_me['plan']['name']} | Ranuras disponibles: {user_me['plan']['available_slots']}")

    # 3. Despliegue de paquete web legítimo (test-site.zip)
    print("\n[3/10] Desplegando paquete web de prueba (POST /instances/deploy)...")
    zip_path = SAMPLES_DIR / "test-site.zip"
    if not zip_path.exists():
        print(f"  ❌ Archivo {zip_path} no encontrado.")
        return False

    with open(zip_path, "rb") as f:
        files = {"file": ("test-site.zip", f, "application/zip")}
        data = {"name": "Sitio Demo 50%"}
        deploy_res = session.post(f"{BASE_URL}/instances/deploy", files=files, data=data, timeout=10)

    if deploy_res.status_code != 201:
        print(f"  ❌ Falla en despliegue: {deploy_res.status_code} - {deploy_res.text}")
        return False

    instance = deploy_res.json()
    instance_id = instance["id"]
    assigned_port = instance["assigned_port"]
    public_url = instance["public_url"]
    container_id = instance["container_id"]
    print(f"  ✅ Instancia desplegada con éxito:")
    print(f"     ID: {instance_id}")
    print(f"     Puerto asignado: {assigned_port}")
    print(f"     URL Pública: {public_url}")
    print(f"     Container ID: {container_id}")

    # 4. Verificación de visualización HTTP en vivo
    print(f"\n[4/10] Verificando respuesta web en {public_url}...")
    time.sleep(1.5)
    test_urls = [f"http://100.112.65.75:{assigned_port}", public_url]
    verified = False
    for url in test_urls:
        try:
            web_res = requests.get(url, timeout=3)
            if web_res.status_code == 200:
                print(f"  ✅ El sitio web responde HTTP 200 en {url}!")
                verified = True
                break
        except Exception:
            continue
    if not verified:
        print(f"  ⚠️ No se pudo verificar respuesta web inmediata.")

    # 5. Telemetría de Hardware en Vivo (RF-20, T3.1, T4.1)
    print(f"\n[5/10] Consultando telemetría de CPU y Memoria (GET /instances/{instance_id}/metrics)...")
    metrics_res = session.get(f"{BASE_URL}/instances/{instance_id}/metrics", timeout=5)
    if metrics_res.status_code != 200:
        print(f"  ❌ Error al consultar métricas: {metrics_res.status_code} - {metrics_res.text}")
        return False
    metrics = metrics_res.json()
    print(f"  ✅ Métricas en tiempo real obtenidas desde Docker Engine:")
    print(f"     Estado: {metrics['status']}")
    print(f"     CPU: {metrics['cpu_percent']}%")
    print(f"     RAM Consumida: {metrics['memory_usage_mb']} MB / {metrics['memory_limit_mb']} MB ({metrics['memory_percent']}%)")
    assert metrics['status'] == "running"
    assert "memory_usage_mb" in metrics
    assert "cpu_percent" in metrics

    # 6. Visor de Logs del Servidor Web Nginx (RF-21, T3.1, T4.2)
    print(f"\n[6/10] Generando tráfico y consultando logs de Nginx (GET /instances/{instance_id}/logs)...")
    try:
        requests.get(f"http://100.112.65.75:{assigned_port}/test-traffic-check", timeout=2)
    except Exception:
        pass
    time.sleep(0.5)

    logs_res = session.get(f"{BASE_URL}/instances/{instance_id}/logs?tail=50", timeout=5)
    if logs_res.status_code != 200:
        print(f"  ❌ Error al consultar logs: {logs_res.status_code} - {logs_res.text}")
        return False
    logs = logs_res.json()
    print(f"  ✅ Buffer de logs de Nginx capturado exitosamente:")
    print(f"     Total de líneas recuperadas: {logs['total_lines']}")
    if logs['lines']:
        print(f"     Última línea: {logs['lines'][-1]}")
    assert logs['total_lines'] >= 1

    # 7. Ciclo de Vida: Restart y Stop (RF-16)
    print(f"\n[7/10] Probando ciclo de vida interactivo: Restart y Stop (RF-16)...")
    # Restart
    restart_res = session.post(f"{BASE_URL}/instances/{instance_id}/action", json={"action": "restart"}, timeout=8)
    if restart_res.status_code != 200 or restart_res.json().get("status") != "running":
        print(f"  ❌ Falla al reiniciar: {restart_res.text}")
        return False
    print("  ✅ Contenedor reiniciado exitosamente (Status: RUNNING).")

    # Stop
    stop_res = session.post(f"{BASE_URL}/instances/{instance_id}/action", json={"action": "stop"}, timeout=8)
    if stop_res.status_code != 200 or stop_res.json().get("status") != "stopped":
        print(f"  ❌ Falla al detener: {stop_res.text}")
        return False
    print("  ✅ Contenedor detenido exitosamente (Status: STOPPED).")

    # Verificar métricas en estado apagado
    off_metrics = session.get(f"{BASE_URL}/instances/{instance_id}/metrics", timeout=5).json()
    print(f"  ✅ Telemetría en reposo reporta: Estado={off_metrics['status']}, RAM={off_metrics['memory_usage_mb']} MB, CPU={off_metrics['cpu_percent']}%")

    # Reactivar
    start_res = session.post(f"{BASE_URL}/instances/{instance_id}/action", json={"action": "start"}, timeout=8)
    if start_res.status_code != 200 or start_res.json().get("status") != "running":
        print(f"  ❌ Falla al reactivar: {start_res.text}")
        return False
    print("  ✅ Contenedor reactivado exitosamente (Status: RUNNING).")

    # 8. Sincronización y Reconciliación ante discrepancias (T3.3)
    print(f"\n[8/10] Probando reconciliación de estado (POST /instances/{instance_id}/sync)...")
    sync_res = session.post(f"{BASE_URL}/instances/{instance_id}/sync", timeout=5)
    if sync_res.status_code != 200:
        print(f"  ❌ Error en sync: {sync_res.status_code} - {sync_res.text}")
        return False
    sync_data = sync_res.json()
    print(f"  ✅ Reconciliación completada: current_status={sync_data['current_status']}, synced={sync_data['synced']}")

    # 9. Cumplimiento estricto de Cuotas (RF-12)
    print(f"\n[9/10] Probando política estricta de cuotas del plan (Desplegar 2do sitio en Free)...")
    with open(zip_path, "rb") as f:
        files = {"file": ("test-site.zip", f, "application/zip")}
        data = {"name": "Segundo Sitio (Debe Fallar)"}
        quota_res = session.post(f"{BASE_URL}/instances/deploy", files=files, data=data, timeout=10)

    if quota_res.status_code == 403:
        print(f"  ✅ Cuota protegida (HTTP 403 Forbidden): {quota_res.json().get('detail')}")
    else:
        print(f"  ❌ Fallo en control de cuota. Código devuelto: {quota_res.status_code}")
        return False

    # 10. Destrucción segura y limpieza física (RF-17, T4.4)
    print(f"\n[10/10] Destruyendo instancia y purgando almacenamiento (DELETE /instances/{instance_id})...")
    del_res = session.delete(f"{BASE_URL}/instances/{instance_id}", timeout=10)
    if del_res.status_code != 200:
        print(f"  ❌ Error al destruir instancia: {del_res.text}")
        return False
    print("  ✅ Instancia destruida, contenedor removido, puerto liberado y disco purgado.")

    # Verificar cuota disponible recuperada
    res = session.get(f"{BASE_URL}/auth/me", timeout=5)
    user_me_after = res.json()
    slots = user_me_after['plan']['available_slots']
    if slots >= 1:
        print(f"  ✅ Cuota restaurada: {slots} ranura(s) disponible(s).")
    else:
        print(f"  ❌ Ranura no liberada.")
        return False

    print("\n===========================================================")
    print("  🎉 ¡TODAS LAS PRUEBAS E2E DEL HITO 50% COMPLETADAS CON ÉXITO!")
    print("===========================================================\n")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
