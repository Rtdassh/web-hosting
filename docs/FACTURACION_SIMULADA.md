# Checkout de facturación simulada

El checkout valida formato, marca, longitud, CVV, Luhn y vencimiento antes de
persistir datos. El número completo y el CVV solo se usan en memoria durante la
solicitud; se persisten únicamente la marca y los últimos cuatro dígitos. Los
errores de validación del endpoint de checkout omiten valores de entrada y los
errores de persistencia devuelven un mensaje genérico mientras el detalle
técnico se registra en el backend.

La transacción, la factura y la actualización o creación de la suscripción se
guardan en una única transacción SQLAlchemy. Un fallo de `flush` o `commit`
provoca rollback explícito.

Los planes se ofrecen solo cuando `is_active` es verdadero y el checkout actual
acepta `billing_period="monthly"`. Al confirmar una compra, `current_period_start`
y `current_period_end` se actualizan junto con la transacción y la factura. El fin
se calcula como el mismo instante del mes siguiente, ajustando al último día
cuando ese mes tiene menos días (por ejemplo, 31 de enero a 28/29 de febrero).
No se activa la renovación automática. Los valores heredados `start_date`,
`end_date` y `auto_renew` de una suscripción existente no se sobrescriben; los
nuevos períodos representan el período de la compra actual.

El endpoint no implementa idempotencia: cada solicitud de checkout que se
confirma correctamente genera una transacción y factura nuevas, incluso si el
cliente repite la misma solicitud. Esto se mantiene deliberadamente para la
simulación universitaria; una pasarela real requeriría una clave de idempotencia
y controles transaccionales adicionales.

Los cambios con `POST /subscriptions/change-plan` no cobran ni crean
transacciones. El cambio a Free está permitido sujeto a la cuota; si no existe
una suscripción activa, el servicio puede crear una suscripción Free. Los
cambios directos a planes de pago de precio igual o menor requieren una
suscripción activa y vigente. Un cambio a un plan de mayor precio requiere
checkout, por lo que `change-plan` no concede upgrades gratuitos. Este endpoint
no crea suscripciones de pago ni reactiva períodos vencidos. El checkout sigue
siendo el único flujo que registra el pago, emite la factura y cambia
inmediatamente al plan comprado.

El plan Free se asigna al registrar una cuenta sin fechas de período y sin
renovación automática. La validación de vigencia considera vigente una
suscripción Free sin fecha final. No se asigna un vencimiento nuevo al cambiar
de plan; las fechas existentes se conservan. La política comercial para
cambios directos entre planes de pago de precio igual o menor queda pendiente
de confirmación; por ahora se conserva ese comportamiento limitado porque no
concede un plan de mayor precio.

La validación de cuota de `change-plan` cuenta actualmente instancias `RUNNING`
y `PENDING`. El contrato de T4.2 del Rol 4 define contar toda instancia cuyo
estado no sea `destroyed`; hay que coordinar con Rol 4 cómo representar
instancias destruidas y alinear esa validación. Este cambio de Rol 3 no modifica
el conteo existente.

## Conservación del historial financiero

Cada transacción guarda `plan_name_snapshot` al momento del checkout. El
historial usa ese valor y no el nombre actual del plan. Las compras anteriores
a esta columna quedan con `NULL`; se muestran como **«Nombre del plan no
registrado»** porque el nombre histórico no puede reconstruirse con certeza.
La migración no rellena esos valores.

Las revisiones Alembic posteriores a V3 para Fresh/Legacy y Debian sintético
instalan triggers PostgreSQL que rechazan `UPDATE`, `DELETE` y `TRUNCATE` en
`payment_transactions` e `invoices`. También cambian las FKs de usuario a
`ON DELETE RESTRICT`, por lo que un usuario con historial financiero no puede
eliminarse. El checkout conserva sus inserciones y no actualiza ni elimina
transacciones o facturas.

Esta protección evita modificaciones accidentales mediante SQL ordinario, pero
no es una barrera frente al propietario o superusuario de PostgreSQL, quien
puede desactivar triggers o cambiar el esquema. Las migraciones no ofrecen
downgrade destructivo; una reversión de aplicación debe conservar las columnas,
las restricciones y los triggers.
