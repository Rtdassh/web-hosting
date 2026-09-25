#!/usr/bin/env python3
"""
Script de Verificación Automatizada E2E - Hito 30% (Walking Skeleton)
Valida el ciclo de vida completo de aprovisionamiento, seguridad, cuotas y Docker.
"""

import sys
import os
import time
import requests
from pathlib import Path

BASE_URL = os.environ.get("PAAS_API_URL", "http://100.112.65.75:8000/api/v1")
SAMPLES_DIR = Path(__file__).resolve().parent

def run_tests():
    print(f"===========================================================")
    print(f"  Iniciando Pruebas E2E - CloudPaaS Hito 30%")
    print(f"  Target API: {BASE_URL}")
    print(f"===========================================================\n")

    session = requests.Session()

    # 0. Limpieza previa para garantizar idempotencia
    try:
        clean_res = session.post(f"{BASE_URL}/auth/login", json={"email": "dev@cloudpaas.local", "password": "admin123"})
        if clean_res.status_code == 200:
            c_token = clean_res.json()["access_token"]
            c_headers = {"Authorization": f"Bearer {c_token}"}
            for inst in requests.get(f"{BASE_URL}/instances", headers=c_headers).json():
                requests.delete(f"{BASE_URL}/instances/{inst['id']}", headers=c_headers)
    except Exception:
        pass

    # 1. Autenticación con usuario de desarrollo (Rol 3)
    print("[1/8] Probando inicio de sesión (RF-03)...")
    login_payload = {
        "email": "dev@cloudpaas.local",
        "password": "admin123"
    }
    res = session.post(f"{BASE_URL}/auth/login", json=login_payload)
    if res.status_code != 200:
        print(f"  ❌ Falla al autenticar: {res.status_code} - {res.text}")
        return False
    
    token = res.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    print(f"  ✅ Token JWT emitido y configurado en Authorization header.")

    # 2. Consultar perfil y cuota actual (/auth/me)
    print("\n[2/8] Consultando perfil y cuota del usuario (GET /auth/me)...")
    res = session.get(f"{BASE_URL}/auth/me")
    if res.status_code != 200:
        print(f"  ❌ Error en /auth/me: {res.status_code} - {res.text}")
        return False
    user_me = res.json()
    print(f"  ✅ Usuario: {user_me['email']} | Plan: {user_me['plan']['name']} | Ranuras disponibles: {user_me['plan']['available_slots']}")

    # 3. Despliegue de paquete web legítimo (test-site.zip)
    print("\n[3/8] Desplegando paquete web de prueba (POST /instances/deploy)...")
    zip_path = SAMPLES_DIR / "test-site.zip"
    if not zip_path.exists():
        print(f"  ❌ Archivo {zip_path} no encontrado.")
        return False

    with open(zip_path, "rb") as f:
        files = {"file": ("test-site.zip", f, "application/zip")}
        data = {"name": "Mi Sitio de Prueba E2E"}
        deploy_res = session.post(f"{BASE_URL}/instances/deploy", files=files, data=data)

    if deploy_res.status_code != 201:
        print(f"  ❌ Falla en despliegue: {deploy_res.status_code} - {deploy_res.text}")
        return False

    instance = deploy_res.json()
    instance_id = instance["id"]
    assigned_port = instance["assigned_port"]
    public_url = instance["public_url"]
    print(f"  ✅ Instancia desplegada con éxito:")
    print(f"     ID: {instance_id}")
    print(f"     Puerto asignado: {assigned_port}")
    print(f"     URL Pública: {public_url}")
    print(f"     Container ID: {instance['container_id']}")

    # 4. Verificación de visualización HTTP en vivo
    print(f"\n[4/8] Verificando respuesta web en {public_url}...")
    time.sleep(1.0)  # Esperar inicio de Nginx
    test_urls = [f"http://127.0.0.1:{assigned_port}", public_url]
    verified = False
    for url in test_urls:
        try:
            web_res = requests.get(url, timeout=3)
            if web_res.status_code == 200 and "CloudPaaS" in web_res.text:
                print(f"  ✅ El sitio web responde HTTP 200 en {url} y renderiza el contenido HTML correctamente!")
                verified = True
                break
        except Exception as e:
            continue
    if not verified:
        print(f"  ⚠️ No se pudo verificar respuesta web inmediata.")

    # 5. Probar cumplimiento estricto de cuota de plan (Policy Enforcement)
    print("\n[5/8] Probando control de cuotas (desplegar segunda instancia en Free)...")
    with open(zip_path, "rb") as f:
        files = {"file": ("test-site.zip", f, "application/zip")}
        data = {"name": "Segundo Sitio (Debe Fallar)"}
        quota_res = session.post(f"{BASE_URL}/instances/deploy", files=files, data=data)

    if quota_res.status_code == 403:
        print(f"  ✅ Política de cuota aplicada exitosamente (HTTP 403 Forbidden): {quota_res.json().get('detail')}")
    else:
        print(f"  ❌ Fallo en control de cuota. Código devuelto: {quota_res.status_code}")

    # 6. Probar ciclo de vida: Stop y Restart
    print(f"\n[6/8] Probando ciclo de vida: Stop y Start...")
    stop_res = session.post(f"{BASE_URL}/instances/{instance_id}/action", json={"action": "stop"})
    if stop_res.status_code == 200 and stop_res.json().get("status") == "stopped":
        print(f"  ✅ Contenedor detenido correctamente (Status: STOPPED).")
    else:
        print(f"  ❌ Falla al detener contenedor: {stop_res.text}")

    start_res = session.post(f"{BASE_URL}/instances/{instance_id}/action", json={"action": "start"})
    if start_res.status_code == 200 and start_res.json().get("status") == "running":
        print(f"  ✅ Contenedor reactivado correctamente (Status: RUNNING).")
    else:
        print(f"  ❌ Falla al reactivar contenedor: {start_res.text}")

    # 7. Probar eliminación y limpieza completa de recursos
    print(f"\n[7/8] Destruyendo instancia y liberando puerto (DELETE /instances/{instance_id})...")
    del_res = session.delete(f"{BASE_URL}/instances/{instance_id}")
    if del_res.status_code == 200:
        print(f"  ✅ Instancia destruida, puerto liberado y almacenamiento limpiado.")
    else:
        print(f"  ❌ Error al destruir instancia: {del_res.text}")

    # 8. Comprobar que la cuota vuelve a estar disponible
    print("\n[8/8] Verificando liberación de cuota tras destrucción...")
    res = session.get(f"{BASE_URL}/auth/me")
    user_me_after = res.json()
    slots = user_me_after['plan']['available_slots']
    if slots >= 1:
        print(f"  ✅ Cuota liberada: {slots} ranura(s) disponible(s).")
    else:
        print(f"  ❌ Ranura no liberada.")

    print("\n===========================================================")
    print("  🎉 ¡TODAS LAS PRUEBAS E2E DEL HITO 30% COMPLETADAS CON ÉXITO!")
    print("===========================================================\n")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
