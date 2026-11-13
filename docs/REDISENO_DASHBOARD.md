# Rediseño del dashboard

## Plan aplicado

1. Conservar en la cabecera la marca, cuota e identidad; mover planes, suscripción, facturación y consola administrativa a una navegación lateral compartida.
2. Mantener el resumen general y sus indicadores de sitios desplegados, activos y proyectos.
3. Incorporar un selector de los proyectos obtenidos de la API del usuario. Utilizar el ID del proyecto como identidad, permitiendo nombres repetidos o cambios de nombre.
4. Al elegir un proyecto, mostrar en el lateral sus apartados: resumen, configuración y respaldo, archivos, actividad, publicaciones y disponibilidad, servidor y rendimiento y eliminación.
5. Mostrar únicamente el apartado seleccionado en el centro. Restablecer el resumen al cambiar de sitio; mantener la confirmación existente para eliminar y restaurar versiones.
6. Mantener accesibles las opciones en pantallas pequeñas: navegación arriba del contenido y apartados en dos columnas; lateral fijo dentro de la ventana en escritorio.

## Design system

Se reutilizan los colores brand y navy, fondos claros, bordes verdes suaves, radios, sombras discretas, iconos Lucide y LoadingButton existentes. La selección tiene fondo brand-50, texto brand-700 y borde brand-100. Se conservan estados de carga, errores y controles de foco. No se agregan dependencias.

## Alcance y validación

Refactorización de presentación sin modificar el backend ni contratos de autorización. Las consultas y acciones siguen recibiendo el ID del sitio seleccionado. Los archivos y métricas se cargan al entrar al apartado correspondiente. Los planes y recibos conservan su comportamiento existente.

Pruebas de navegación entre proyectos y apartados, retorno al listado, acceso a planes, operaciones existentes de archivos/publicaciones y compilación de producción.

## Consistencia del marco y perfil

El marco autenticado comparte una sola columna lateral de 260 px, márgenes de contenido, fondo y cuota. El menú de cuenta permanece montado al cambiar entre sitios, planes, recibos y perfil. El navegador reserva el espacio de la barra de desplazamiento para evitar saltos horizontales. Las páginas de planes y recibos no agregan fondos propios al marco.

La navegación contextual del sitio se muestra en la columna compartida mediante un portal React únicamente al abrir un proyecto. No contiene un botón de creación. Volver a proyectos utiliza el acento de marca; la opción de eliminación utiliza el estado rojo y conserva la confirmación destructiva.

Perfil y ajustes muestra los datos actuales de cuenta en lectura, solicitud de cambio de contraseña por el flujo de recuperación existente, preferencia local de filas compactas y cierre de sesión con confirmación. La preferencia se aplica al listado y se almacena únicamente en este navegador. No modifica datos de identidad ni incorpora un endpoint de contraseñas nuevo.

## Diálogos globales

Estado de plataforma, registros, despliegue, vista previa de plantillas, checkout, recibos, eliminación, confirmaciones administrativas y cierre de sesión utilizan `ModalLayer`. Se montan con un portal en `document.body`, fuera de los contenedores animados que podían limitar su posición al área central. El fondo se atenúa sin desenfoque. La capa bloquea el desplazamiento de la página, mantiene la navegación de teclado dentro del diálogo y devuelve el foco al origen al cerrar. Las capas anidadas mantienen el orden visual y de teclado. Los logs usan cabecera y controles claros del design system con una superficie de terminal oscura para los registros.
