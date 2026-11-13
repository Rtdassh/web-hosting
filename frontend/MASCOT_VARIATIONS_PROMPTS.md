# Codrop — variaciones de la mascota original

Generadas con `image_gen`, la herramienta de imágenes integrada de ChatGPT, una llamada por pose con `transparent_background: true`. Se sustituyó la interpretación SVG por ilustraciones raster basadas en los originales. Se mantienen intactos los assets originales del ciclo de vida del servidor.

## Referencias e identidad

Referencia principal: `src/assets/codrop-isotipo.png`. Segunda referencia: `src/assets/mascot/mascot-running.png`, excepto sleeping que usa `mascot-stopped.png`. Conservar hocico largo redondeado, cuerpo macizo, patas anchas cortas, cola gruesa curva, escamas triangulares oscuras, vientre menta, ojo curvo y sombreado suave. La paleta de la interfaz e Inter permanecen sin cambios.

## Prompts exactos

Cada prompt se envió con las dos referencias indicadas arriba. Los colores son guías del sistema; las ilustraciones conservan variaciones tonales del original.

### walking

Archivo: `src/assets/mascot/brand-walking.png`.

```text
Use case: identity-preserve. Create one production raster mascot asset for Codrop web UI, using the attached ORIGINAL crocodile as strict character identity reference, not the crude SVG screenshot. Preserve its exact emerald/teal green color (#28B586 family with #239C76 shading), soft mint belly #CFE4D6, deep teal dorsal triangular scutes #1C7F62/navy #172838, rounded solid body, thick curved tail, short broad limbs, very long rounded upward snout with two nostrils, happy curved eye, white triangular teeth. Match the original polished soft shaded 2D illustration with subtle volume and no black outline, not a new character, not angular simplified vector, not photorealistic, not plastic 3D. No zip package unless requested, no text, no lettering, no sparkles, no backdrop, no ground shadow. Genuine transparent alpha background. Full subject unclipped, large in canvas, 4% safety padding. Pose: WALKING. Full body true side view facing right, gently walking with one forefoot forward, all proportions faithful to reference, tail curving left, relaxed confident smile, mouth slightly open showing mint lower jaw and small white teeth. No props. Horizontal composition, feet near one common bottom baseline so the mascot can walk along a card top border. Output a single isolated crocodile, no collage. Save the generated image artifact locally and include its absolute path in output_hint.
```

### peeking

Archivo: `src/assets/mascot/brand-peeking.png`.

```text
Use case: identity-preserve. Create one production raster mascot asset for Codrop web UI, using the attached ORIGINAL crocodile as strict character identity reference, not the crude SVG screenshot. Preserve its exact emerald/teal green color (#28B586 family with #239C76 shading), soft mint belly #CFE4D6, deep teal dorsal triangular scutes #1C7F62/navy #172838, rounded solid body, thick curved tail, short broad limbs, very long rounded upward snout with two nostrils, happy curved eye, white triangular teeth. Match the original polished soft shaded 2D illustration with subtle volume and no black outline, not a new character, not angular simplified vector, not photorealistic, not plastic 3D. No zip package unless requested, no text, no lettering, no sparkles, no backdrop, no ground shadow. Genuine transparent alpha background. Full subject unclipped, large in canvas, 4% safety padding. PEEKING for a login form top edge: a gentle three-quarter front view of the same crocodile facing slightly right, ONLY its head, upper shoulders, and two little broad forepaws visible. It is peeking above an invisible horizontal card edge. The two paws rest on the same bottom baseline; neck/torso are cropped by this baseline, no visible legs or tail. Long snout and friendly curved happy eyes faithfully match the reference. Do not draw the card or edge or any background. Wide head-and-paws composition with transparent surroundings, tightly fit content and 4% padding. No props. Save the generated image artifact locally and include its absolute path in output_hint.
```

### inspector

Archivo: `src/assets/mascot/brand-inspector.png`.

```text
Use case: identity-preserve. Create one production raster mascot asset for Codrop web UI, using the attached ORIGINAL crocodile as strict character identity reference, not the crude SVG screenshot. Preserve its exact emerald/teal green color (#28B586 family with #239C76 shading), soft mint belly #CFE4D6, deep teal dorsal triangular scutes #1C7F62/navy #172838, rounded solid body, thick curved tail, short broad limbs, very long rounded upward snout with two nostrils, happy curved eye, white triangular teeth. Match the original polished soft shaded 2D illustration with subtle volume and no black outline, not a new character, not angular simplified vector, not photorealistic, not plastic 3D. No zip package unless requested, no text, no lettering, no sparkles, no backdrop, no ground shadow. Genuine transparent alpha background. Full subject unclipped, large in canvas, 4% safety padding. INSPECTOR: full body three-quarter view facing right, same crocodile upright on short hind limbs with its thick tail balancing behind it; wearing a small mint green safety helmet, holding a simple magnifying glass in one forepaw, inspecting attentively and smiling. Helmet and magnifier use only reference mint and navy palette. Preserve original snout/body proportions and shading. Single isolated subject, no extra symbols, no text. Save the generated image artifact locally and include its absolute path in output_hint.
```

### clerk

Archivo: `src/assets/mascot/brand-clerk.png`.

```text
Use case: identity-preserve. Create one production raster mascot asset for Codrop web UI, using the attached ORIGINAL crocodile as strict character identity reference, not the crude SVG screenshot. Preserve its exact emerald/teal green color (#28B586 family with #239C76 shading), soft mint belly #CFE4D6, deep teal dorsal triangular scutes #1C7F62/navy #172838, rounded solid body, thick curved tail, short broad limbs, very long rounded upward snout with two nostrils, happy curved eye, white triangular teeth. Match the original polished soft shaded 2D illustration with subtle volume and no black outline, not a new character, not angular simplified vector, not photorealistic, not plastic 3D. No zip package unless requested, no text, no lettering, no sparkles, no backdrop, no ground shadow. Genuine transparent alpha background. Full subject unclipped, large in canvas, 4% safety padding. CLERK: full body three-quarter view facing slightly left toward viewer, same crocodile standing on short hind feet with curved thick tail, gently holding one small mint white receipt in its forepaws across its belly. Receipt has a few short dark teal horizontal abstract marks but no letters, numbers or currency symbols. Friendly happy curved eye and long rounded snout. No clothes, no desk, no extra accessories. Single isolated subject. Save the generated image artifact locally and include its absolute path in output_hint.
```

### sleeping

Archivo: `src/assets/mascot/brand-sleeping.png`.

```text
Use case: identity-preserve. Create one production raster mascot asset for Codrop web UI, using the attached ORIGINAL crocodile as strict character identity reference, not the crude SVG screenshot. Preserve its exact emerald/teal green color (#28B586 family with #239C76 shading), soft mint belly #CFE4D6, deep teal dorsal triangular scutes #1C7F62/navy #172838, rounded solid body, thick curved tail, short broad limbs, very long rounded upward snout with two nostrils, happy curved eye, white triangular teeth. Match the original polished soft shaded 2D illustration with subtle volume and no black outline, not a new character, not angular simplified vector, not photorealistic, not plastic 3D. No zip package unless requested, no text, no lettering, no sparkles, no backdrop, no ground shadow. Genuine transparent alpha background. Full subject unclipped, large in canvas, 4% safety padding. SLEEPING: exact same crocodile curled into a compact relaxed resting pose, three-quarter view, eyes peacefully closed, head resting on broad forepaws, rounded thick tail wrapped around body. Preserve original long rounded snout, emerald body, mint lower jaw/belly and dark triangular scutes. Use sleeping original reference for pose and first reference for identity. No Z letters, no floating symbols, no props. Single isolated subject, horizontal composition. Save the generated image artifact locally and include its absolute path in output_hint.
```

### Ajuste final de inspector

Primera referencia: el resultado inicial de inspector. Segunda referencia: `codrop-isotipo.png`. Mismo generador integrado y fondo transparente.

```text
Use case: precise-object-edit. Edit target: first attached image, the Codrop crocodile inspector with mint helmet and magnifying glass. Preserve the exact character pixels/identity, pose, colors, long snout, body proportions, helmet and magnifying glass. Remove ALL green outer glow, haze, bloom, ambient shadow, translucent surrounding tint and ground shadow outside the character silhouette. Produce a clean fully opaque character silhouette with only clean antialiased edges and genuine fully transparent surrounding alpha. No glow, no backdrop, no text. Do not erase the character, do not change its design. This must be a crisp website cutout matching the original second reference's soft 2D illustration, not a glowing illustration. Leave 4% transparent safety margin. Save the generated image artifact locally and include its absolute path in output_hint.
```

## Integración

`CrocodileMascot` conserva `variant`, `position`, `src`, `alt` y `className`. Las cinco variantes usan PNG con canal alfa; el componente ya no contiene dibujo SVG. `src` sustituye el asset predeterminado; una variante desconocida usa walking. Por defecto las imágenes son decorativas (`alt=""`), con carga diferida y decodificación asíncrona. Las posiciones absolutas requieren un padre relativo con overflow visible.

`AuthBrandAccent` muestra peeking completo sin recortar la cabeza ni las patas. Inspector, clerk y sleeping quedan disponibles para las fases siguientes; no se modificaron esas vistas.
