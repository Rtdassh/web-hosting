# Reconciliación Debian: inventarios revisados de 2 y 3 instancias

Base: `4d3a938`. Rama local independiente: `fix/debian-80-inventario-dos`.
No se modifica GitHub ni se conecta a Debian o a su copia durante este cambio.

## Cambio

Se conservan intactos `COUNTS` y `ASSIGNMENTS` históricos. `ReviewedInventory`, inmutable, enumera únicamente dos escenarios autorizados:

| Escenario | Instancias y puertos | Estado |
| --- | --- | --- |
| Histórico | 14→30002, 19→30001, 22→30003 | Política histórica de estados sin cambios |
| Confirmado 3-nov-2026 | 14→30002, 22→30003 | Ambas RUNNING |

El conteo selecciona el escenario; no basta para aprobarlo. Se exige la lista exacta de asignaciones obtenida de la unión con `port_allocations`, puertos reservados y `template_id NULL`. Para el escenario nuevo también se comprueba RUNNING. No se elimina la instancia 19 ni se cambia ningún dato: simplemente se admite un segundo inventario completo y conocido.

Ambos pasan por los mismos controles de 21 tablas, 7 usuarios, 3 planes, 7 suscripciones, 100 registros en cada tabla de puertos y cero pagos. Se mantienen las validaciones de tipos, nulabilidad, FKs, índices, enums, restricciones validadas, suscripciones duplicadas, RLS y triggers.

Se conservan sin cambios el SHA256 del manifiesto, la comparación de la captura actual bajo bloqueo antes de DDL y el postcheck de filas/hashes, tablas heredadas y secuencias. `instances_id_seq` sigue exigiendo last_value=22, is_called=true, incremento positivo y sin ciclo; el siguiente ID no se reinicia a partir del número de filas.

No cambian los archivos de revisiones d0001–d0004 ni su DDL. No se introduce stamp, backfill ni una opción para omitir comprobaciones.

## Ensayo únicamente sobre la copia restaurada

Estos comandos se ejecutan en la máquina que tiene la copia, desde `backend/`, con su entorno virtual activo y este cambio importado. No apuntar a Debian compartido.

1. Confirmar el host local, puerto exclusivo de la copia, nombre de base y usuario. El comando de diagnóstico preparado en el commit base pide esos datos y confirma la identidad antes de consultar:

```powershell
python tools/diagnose_debian_readonly.py --host 127.0.0.1 --port PUERTO_COPIA --database BASE_COPIA --user USUARIO_COPIA
```

Sustituir los tres marcadores; no suponer que el puerto sea 5432 ni cambiarlo al servidor Debian. Confirmar PostgreSQL 17.11, inventario de 2 instancias y ausencia de versión Alembic.

2. Configurar `CODROP_MIGRATION_DATABASE_URL` exclusivamente con esa identidad. Puede hacerse en un proceso Python sin mostrar ni guardar la contraseña; desde PowerShell, ejecutar este bloque. Solo configura la URL y comprueba la conexión de **lectura**; no migra:

```powershell
@'
import getpass, os, sys
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
host = "127.0.0.1"
port = int(input("Puerto exclusivo de la copia local: "))
database = input("Nombre confirmado de la base COPIA: ").strip()
user = input("Usuario de la copia: ").strip()
print(f"Destino: {host}:{port} / {database} / {user}")
if input("Escribe el nombre de la base para confirmar COPIA aislada: ") != database or not database:
    raise SystemExit("Cancelado")
url = URL.create("postgresql+psycopg2", host=host, port=port, database=database,
                 username=user, password=getpass.getpass("Contraseña (oculta): "))
engine = create_engine(url, hide_parameters=True,
    connect_args={"connect_timeout": 10, "options": "-c default_transaction_read_only=on"})
with engine.connect() as connection:
    identity = connection.execute(text("SELECT current_database(), current_user, inet_server_addr(), inet_server_port(), current_setting('server_version')")).one()
    print("Identidad efectiva:", tuple(identity))
    if identity[0] != database or identity[1] != user:
        raise SystemExit("Identidad inesperada")
engine.dispose()
# La variable vive solo en este proceso; los subcomandos la heredan.
os.environ["CODROP_MIGRATION_DATABASE_URL"] = url.render_as_string(hide_password=False)
import subprocess
subprocess.run([sys.executable, "-B", "-m", "alembic_debian.audit", "--capture", ".env.copy-two-before.json"], check=True)
'@ | Set-Content -Encoding utf8 .env.copy-only-runner.py
python .env.copy-only-runner.py
```

El archivo debe ser nuevo; no sobrescribir un manifiesto anterior. El programa imprime `Evidence SHA256` y debe terminar con `Read-only verification OK`. Esta captura se toma de la copia, no de una evidencia vieja del servidor. Mantener la copia sin escrituras concurrentes.

3. Para ejecutar d0001–d0004, editar `.env.copy-only-runner.py` **cambiando únicamente** su última llamada `subprocess.run(...)` por las siguientes líneas y ejecutar otra vez `python .env.copy-only-runner.py`. No modificar `url`, `host` ni la comprobación de identidad. Pide nuevamente contraseña y el SHA impreso y revisado en el paso anterior:

```python
subprocess.run([sys.executable, "-B", "-m", "alembic_debian.audit", "--verify-before", ".env.copy-two-before.json"], check=True)
digest = input("Evidence SHA256 revisado de la copia: ").strip()
subprocess.run([sys.executable, "-B", "-m", "alembic", "-c", "alembic-debian.ini", "-x", "manifest=.env.copy-two-before.json", "-x", "evidence_sha256=" + digest, "upgrade", "head"], check=True)
subprocess.run([sys.executable, "-B", "-m", "alembic_debian.audit", "--verify-after", ".env.copy-two-before.json"], check=True)
```

`check=True` detiene el proceso ante el primer error. Usar el SHA canónico que imprime la auditoría, no el hash de otro archivo JSON formateado. No usar `--use-project-database`: podría seleccionar la conexión compartida del backend.

4. Verificar destino `d0004_financial_history`, tablas/columnas nuevas y cuatro triggers financieros habilitados. El postcheck debe confirmar conservación de historia, definiciones heredadas y secuencias. Guardar los resultados. Si falla una validación, detenerse y revisar la diferencia; no cambiar conteos ni borrar filas para forzarla.

La restauración de la copia fue confirmada por el usuario; no se certifica aquí de nuevo ni se afirma haber ejecutado las migraciones. La base Debian real permanece fuera del alcance.

## Pruebas

`tests/test_debian_reviewed_inventories.py` recorre ambos preflights completos con catálogos y respuestas SQL sintéticos. Cubre aceptación, asignaciones mezcladas, pérdida de vínculo de puerto, conteos, secuencia incorrecta/no llamada, pagos existentes, FK de plantilla, enums, estados del nuevo escenario, SHA inválido, deriva de datos/secuencias y postcheck de conservación. También verifica la entrada completa a reconciliación con un manifiesto válido en ambos escenarios, sin ejecutar DDL real.

Desde backend:

```powershell
python -m pytest -q tests/test_debian_reviewed_inventories.py tests/test_debian_reconciliation.py
python -m pytest -q
```

Las pruebas PostgreSQL opt-in siguen necesitando su servidor desechable y no se habilitan contra Debian ni contra la copia de respaldo por defecto.

Resultado ejecutado en este entorno: **260 pruebas aprobadas, 4 omitidas y 36 subpruebas aprobadas**. Se añadieron **38 casos** para los dos inventarios. Las omisiones son las integraciones PostgreSQL opt-in; no se ejecutaron d0001–d0004 sobre un servidor real aquí. No hubo cambios de frontend, por lo que no se repitió su suite.
