# Codrop — variaciones de mascota

## Auditoría y contrato visual

Paleta existente conservada: brand 50 `#EAF7F1`, 100 `#CFE4D6`, 500 `#28B586`, 600 `#239C76`, 700 `#1C7F62`; navy 700 `#2E4A5A`, 800 `#1F3141`, 900 `#172838`. Tipografía existente: Inter, sans-serif. No se agregaron fuentes ni dependencias.

Referencia: `src/assets/mascot/mascot-running.png` y `mascot-stopped.png`. Conservar hocico largo ascendente, silueta redondeada, vientre claro, cresta triangular oscura, ojo curvo amigable y extremidades cortas. Los SVG del componente son adaptaciones vectoriales simplificadas; las referencias raster conservan más textura y volumen.

## Prompts exactos para render externo

Adjuntar las referencias originales junto con cada prompt. Exportar con fondo transparente, sin sombra exterior, sin texto ni marca de agua, encuadre completo y margen de 8%, 1600 × 1200 px.

### walking
“Ilustración de mascota Codrop caminando de perfil hacia la derecha; conservar exactamente la identidad del cocodrilo de referencia: hocico largo ascendente, cabeza redondeada, sonrisa con pequeños dientes triangulares blancos, ojo curvo feliz, patas cortas alternadas, cola curva y cresta triangular. Cuerpo #28B586, sombras #239C76, vientre #CFE4D6, cresta #1C7F62, contornos y ojos #172838; luces #EAF7F1. Estilo vectorial plano modular, contorno redondeado uniforme de 3 px a escala 200 × 150, sin degradados ni textura fotográfica. Patas apoyadas sobre una misma línea base para colocar sobre el borde superior de una tarjeta. Fondo transparente, sin texto, encuadre completo, margen 8%, 1600 × 1200 px.”

### peeking
“Ilustración de mascota Codrop asomándose por detrás de un borde horizontal invisible, cabeza y dos patitas visibles; conservar exactamente la geometría del cocodrilo de referencia: hocico largo ascendente, cabeza redondeada, ojo curvo feliz y cresta triangular. Cuerpo #28B586, sombras #239C76, vientre #CFE4D6, cresta #1C7F62, contornos y ojos #172838, luces #EAF7F1 y dientes blancos. Estilo vectorial plano modular, contorno redondeado uniforme de 3 px a escala 200 × 150, sin degradados. Mirada acogedora, sin accesorios. Fondo transparente, sin texto, encuadre completo, margen 8%, 1600 × 1200 px.”

### inspector
“Ilustración de mascota Codrop inspeccionando un sitio saludable, con casco verde claro y pequeña lupa en una pata; conservar exactamente la geometría del cocodrilo de referencia: hocico largo ascendente, cabeza redondeada, ojo curvo feliz, cola curva, patas cortas y cresta triangular. Cuerpo #28B586, sombras #239C76, vientre y casco #CFE4D6, cresta #1C7F62, contornos y ojos #172838, cristal de lupa #EAF7F1 y dientes blancos. Estilo vectorial plano modular, contorno redondeado uniforme de 3 px a escala 200 × 150, sin degradados. Pose tranquila y competente. Fondo transparente, sin texto, encuadre completo, margen 8%, 1600 × 1200 px.”

### clerk
“Ilustración de mascota Codrop sosteniendo un recibo pequeño con líneas abstractas, sin números ni texto; conservar exactamente la geometría del cocodrilo de referencia: hocico largo ascendente, cabeza redondeada, ojo curvo feliz, cola curva, patas cortas y cresta triangular. Cuerpo #28B586, sombras #239C76, vientre #CFE4D6, cresta y líneas del recibo #1C7F62, contornos y ojos #172838, papel #EAF7F1 y dientes blancos. Estilo vectorial plano modular, contorno redondeado uniforme de 3 px a escala 200 × 150, sin degradados. Pose servicial y serena. Fondo transparente, encuadre completo, margen 8%, 1600 × 1200 px.”

### sleeping
“Ilustración de mascota Codrop durmiendo tranquilamente con la cola enrollada alrededor del cuerpo y ojos cerrados; conservar exactamente la identidad del cocodrilo dormido de referencia: silueta redondeada, hocico largo, vientre claro y cresta triangular. Cuerpo #28B586, sombras #239C76, vientre #CFE4D6, cresta #1C7F62, contornos y ojos #172838, luces #EAF7F1. Estilo vectorial plano modular, contorno redondeado uniforme de 3 px a escala 200 × 150, sin degradados. Postura compacta y relajada. Fondo transparente, sin texto, encuadre completo, margen 8%, 1600 × 1200 px.”

## Uso preparado para las siguientes fases

`CrocodileMascot` admite `variant="walking|peeking|inspector|clerk|sleeping"`, `position="inline|edge-top|corner-bottom"`, `src`, `alt` y `className`. El contenedor de posiciones absolutas debe tener `position: relative`, espacio reservado y overflow visible. `edge-top` usa `bottom: 100%`. Por defecto la mascota es decorativa y no captura interacciones. Usar `alt` cuando comunique información que no aparezca en texto cercano. Para sustituir el SVG: `<CrocodileMascot variant="clerk" src="/images/clerk.png" />`.

Bases: `Card` admite `header`, `accent`, `interactive`; `Button` reutiliza `LoadingButton`; `Badge` reutiliza `StatusBadge`; `Input` conserva atributos nativos y ref, requiere label asociado en la vista. Usar `.progress-brand-stripes` sobre el relleno de una barra con semántica de progreso en su contenedor. `.bg-brand-stripes-subtle` y `.accent-stripes` son optativas; no se aplican automáticamente a las vistas. El movimiento respeta prefers-reduced-motion.
