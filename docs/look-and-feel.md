# Channel Coding Visualizer — Look & Feel

> Guía visual única para que un LLM (o un humano) pueda reproducir, extender y mantener
> la estética de la app **sin desviarse**. Pensada como "instrumento de laboratorio":
> oscura, técnica, precisa, con tipografía monoespaciada protagonista en bits y ecuaciones.

---

## 1. Concepto

**Mood:** instrumento de laboratorio / panel de telemetría.
**Referencias mentales:** Linear, Vercel, Cursor, herramientas de software-defined radio (osciloscopios, analizadores de espectro).
**Sensación:** oscuro, denso pero respirable, con cyan de "señal" como acento. Cero gradientes saturados, cero glassmorphism, cero emojis decorativos.

Reglas innegociables:

- **Dark mode only.** No diseñar variantes claras salvo que se pida.
- **Mono manda en datos.** Toda cifra, bit, hex, ecuación o nombre de variable va en `JetBrains Mono`.
- **Sans manda en discurso.** Títulos, párrafos y labels van en `Inter`.
- **Color cuenta una historia.** Cada estado de bit tiene un color fijo (ver §4). Nunca se reusa para otra cosa.
- **Hairlines, no bordes gordos.** Los separadores son de 1px y de muy baja luminancia.
- **Cero íconos decorativos.** Si un ícono no añade información (acción, estado), no va.

---

## 2. Tokens — copiar tal cual

Implementados como CSS vars en `:root`. Todo el resto del CSS los referencia.

### 2.1 Background stack (de más al fondo a más al frente)

| Token      | Valor         | Uso                              |
| ---------- | ------------- | -------------------------------- |
| `--bg-0`   | `#07090d`     | fondo de la página               |
| `--bg-1`   | `#0b0f15`     | superficies grandes / pager bg   |
| `--bg-2`   | `#0f141c`     | tarjetas                         |
| `--bg-3`   | `#141b26`     | inputs, nodos del stepper        |
| `--bg-4`   | `#1a2331`     | hover de inputs/botones secundarios |

El `body` lleva además dos radial-gradients muy tenues (azul + violeta, ≤6% alpha) en las esquinas superiores para darle profundidad, y una textura de grid 48×48 con líneas al 1.2% de alpha enmascarada por una elipse para que se desvanezca por los bordes.

### 2.2 Líneas

| Token      | Valor                      | Uso                          |
| ---------- | -------------------------- | ---------------------------- |
| `--line-1` | `rgba(255,255,255,0.06)`   | bordes por defecto           |
| `--line-2` | `rgba(255,255,255,0.10)`   | inputs, nodos                |
| `--line-3` | `rgba(255,255,255,0.14)`   | dashed del file drop         |

### 2.3 Texto

| Token     | Valor       | Uso                                |
| --------- | ----------- | ---------------------------------- |
| `--tx-1`  | `#eef2f8`   | primario (titulares, valores)      |
| `--tx-2`  | `#b9c2d0`   | secundario (cuerpos de texto)      |
| `--tx-3`  | `#7c8699`   | terciario (labels en uppercase)    |
| `--tx-4`  | `#525c6f`   | cuaternario (deshabilitado, deco)  |

### 2.4 Acento (signal)

Cyan azulado, **el único color de marca**. Definido en oklch para ser consistente con los estados de bit:

| Token              | Valor                                | Uso                                  |
| ------------------ | ------------------------------------ | ------------------------------------ |
| `--signal`         | `oklch(82% 0.12 220)`                | acento principal                     |
| `--signal-strong`  | `oklch(75% 0.16 220)`                | gradiente botón primario             |
| `--signal-soft`    | `oklch(82% 0.12 220 / 0.14)`         | fondos blandos (chips, tags)         |
| `--signal-edge`    | `oklch(82% 0.12 220 / 0.35)`         | bordes acentuados, focus ring        |

---

## 3. Tipografía

Dos familias, sin excepciones:

```css
--ff-sans: "Inter", system-ui, sans-serif;
--ff-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

### 3.1 Escala

| Rol                          | Familia | Tamaño  | Weight | Tracking   |
| ---------------------------- | ------- | ------- | ------ | ---------- |
| Título de tarjeta (`h2`)     | sans    | 18 px   | 600    | `-0.01em`  |
| Título de panel (`h3`)       | sans    | 15 px   | 600    | `-0.005em` |
| Body                         | sans    | 14 px   | 400    | normal     |
| Sub del header               | mono    | 11.5 px | 400    | normal     |
| Label de campo (uppercase)   | mono    | 10.5 px | 400    | `0.1em`    |
| Section label (uppercase)    | mono    | 11 px   | 400    | `0.08em`   |
| Eyebrow encima de h2 (upper) | mono    | 11 px   | 400    | `0.08em`   |
| Valor de métrica grande      | mono    | 22 px   | 600    | `-0.01em`  |
| Bits en grid masivo          | mono    | 9 px    | 600    | normal     |
| Bit chip grande              | mono    | 13 px   | 600    | normal     |
| Ecuación en `.eq`            | mono    | 13 px   | 400    | normal     |
| Hash row                     | mono    | 12 px   | 400    | normal     |
| Footnote                     | mono    | 11 px   | 400    | normal     |

### 3.2 Reglas

- **Eyebrows y labels** siempre en mayúsculas con tracking generoso. Color: `--signal` para eyebrows/section-labels, `--tx-3` para labels neutrales de campo.
- **Inline code** en párrafos: mono 12.5 px, con `background: rgba(255,255,255,0.04)`, `border: 1px solid --line-1`, `padding: 1px 6px`, `border-radius: 4px`.
- **`text-wrap: pretty`** en párrafos largos cuando se quiera evitar viudas.
- Nunca centrar bloques de texto largos. Body siempre alineado a la izquierda.

---

## 4. Color semántico — estados de bit

**El alma cromática de la app.** Cinco estados, codificados como clases sobre `.bit` y `.bit-chip`. Cada uno tiene fondo translúcido (~55% alpha en oklch) y borde sólido del mismo hue al ~70-75% lightness. Texto del bit en blanco apagado tintado por el hue.

| Estado            | Clase | Hue       | Token CSS               | Significado                                |
| ----------------- | ----- | --------- | ----------------------- | ------------------------------------------ |
| Dato              | _none_| slate     | `--st-data` `--st-data-bd` | bit que va a transmitirse sin tocar     |
| Redundancia       | `r`   | 220° azul | `--st-redund` `--st-redund-bd` | bit de paridad / control               |
| Alterado en canal | `a`   | 18° rosa  | `--st-altered` `--st-altered-bd` | bit invertido por el BSC             |
| Corregido         | `c`   | 155° verde | `--st-corrected` `--st-corrected-bd` | bit que el decoder reparó         |
| Error residual    | `e`   | 65° ámbar | `--st-residual` `--st-residual-bd` | bit malo que no se pudo corregir     |
| Bit de paridad resaltado | `p` | 290° violeta | `--st-paritybit` `--st-paritybit-bd` | uso puntual: paridad global (p₀) |

Las clases se aplican igual sobre los dos componentes:

- `.bit`        → grid masivo de cientos de bits (cuadradito de ~9 px).
- `.bit-chip`   → fila inline de bits etiquetados (32 px con label debajo).

**Nunca** se inventan colores nuevos para el dominio de bits. Si aparece un sexto estado, primero se propone aquí y se le asigna hue.

### 4.1 Colores de status global

| Token       | Valor                          | Uso                                   |
| ----------- | ------------------------------ | ------------------------------------- |
| `--ok`      | `oklch(72% 0.16 155)`          | éxito (verde)                         |
| `--ok-bg`   | `oklch(72% 0.16 155 / 0.12)`   | fondo blando de alerts ok             |
| `--warn`    | `oklch(75% 0.16 65)`           | advertencia (ámbar)                   |
| `--warn-bg` | `oklch(75% 0.16 65 / 0.12)`    | fondo blando de alerts warn           |
| `--err`     | `oklch(70% 0.20 18)`           | error (rosa-rojo)                     |
| `--err-bg`  | `oklch(70% 0.20 18 / 0.12)`    | fondo blando de alerts error          |

---

## 5. Radios y elevación

| Token      | Valor   | Uso                                       |
| ---------- | ------- | ----------------------------------------- |
| `--r-xs`   | 4 px    | bit chip en grid masivo (interno)         |
| `--r-sm`   | 6 px    | bit-chip grande, code-inline, eq rows     |
| `--r-md`   | 10 px   | inputs, botones, bitgrid-wrap             |
| `--r-lg`   | 14 px   | tarjetas, stepper, statusbar              |
| `--r-xl`   | 20 px   | reservado (no usado por ahora)            |

**Pill (legend, status, tag):** `border-radius: 999px`.

**Sombras:**

```css
--sh-card: 0 1px 0 rgba(255,255,255,0.04) inset,
           0 10px 30px -10px rgba(0,0,0,0.6);
```

Solo las tarjetas grandes la usan. El resto va sin sombra.

**Glow de focus / step activo:**

```css
0 0 0 1px var(--signal-edge),
0 0 32px -8px oklch(82% 0.12 220 / 0.35);
```

---

## 6. Componentes

### 6.1 Top bar

- `display: flex; justify-content: space-between`.
- Brand a la izquierda: logo en cuadrado 42×42 con gradiente radial cyan + sombra interna sutil. SVG del logo en `#07111c` (casi negro) para máximo contraste.
- Subtítulo del brand en mono, separadores `·` con color `--tx-4`.
- A la derecha, **status pill** opcional:
  - `display: inline-flex; gap: 10px; padding: 8px 14px`.
  - LED de 7 px con `box-shadow: 0 0 10px 1px <color>` y animación `pulse` 2.4 s (opacity 1 → 0.55).
  - Fondo `--ok-bg`, borde `color-mix(--ok 35%, transparent)`.

### 6.2 Stepper

- `grid-template-columns: repeat(6, 1fr)`, padding 6 px, fondo `linear-gradient(--bg-2 → --bg-1)`, borde `--line-1`, radio `--r-lg`.
- Cada step es un `<button>` con `data-state="upcoming|active|done"`.
- **Nodo** (círculo 26 px): muestra el número (mono 11.5 px, 600) o un check si está done.
  - upcoming: `bg --bg-3`, `border --line-2`, texto `--tx-3`.
  - done: bg `oklch(72% 0.16 155 / 0.15)`, borde `oklch(72% 0.16 155 / 0.5)`, texto `--ok`.
  - active: bg `--signal` (sólido), borde transparente, texto `#07111c`, halo `box-shadow: 0 0 0 4px oklch(82% 0.12 220 / 0.18)`.
- **Labels**: título 13 px 600, descripción 11.5 px mono color `--tx-4`. La descripción activa pasa a `--signal`.
- El paso **active** además tiene fondo `linear-gradient` cyan al 4-10 % y el glow descrito en §5.

### 6.3 Card

```
background: linear-gradient(180deg, --bg-2, --bg-1);
border: 1px solid --line-1;
border-radius: --r-lg;
padding: 22px 24px;
box-shadow: --sh-card;
```

**Card-head** estructura:

```
<div class="card-head">
  <div class="left">
    <span class="eyebrow">Paso N · slug</span>
    <h2>Título <span class="accent">resaltado</span></h2>
    <p class="muted">subtítulo opcional</p>
  </div>
  <Legend />  ← o cualquier metadata a la derecha
</div>
```

`.accent` aplica `color: --signal` a la palabra clave del título.

### 6.4 Legend (pill row)

Fila de chips de 5 px-radius con un cuadradito de color (9 px, borde sólido del mismo color que la categoría) + texto en sans 11.5 px. Cada chip lleva el color del estado correspondiente como `color:` y el fondo en `rgba(255,255,255,0.025)`. Los chips no tienen hover.

### 6.5 BitGrid

- Wrapper: `background: --bg-1`, borde `--line-1`, radio `--r-md`, padding 14 × 16.
- **Meta superior**: izquierda "Mostrando bits N–M" (mono `--tx-3`), derecha "X bits totales" (mono `--tx-2`).
- **Grid**: `grid-template-columns: repeat(64, 1fr); gap: 3px`. Cada `.bit` es `aspect-ratio: 1/1`, radio 3 px.
- **Pager**: range slider personalizado. Track 4 px alto, mitad coloreada con `--signal` hasta `--p`%, mitad `--bg-3`. Thumb 14 px círculo `--signal` con borde 2 px `#0a1422` y halo `0 0 0 3px oklch(82% 0.12 220 / 0.2)`.

### 6.6 Bit row inline (`.bit-row.with-labels`)

Para mostrar pocos bits etiquetados (bloque de 4 u 8). `grid-auto-flow: column`, columnas de 32 px, gap 6 px. Cada columna es chip (32×32, radio 6) + label inferior (mono 10 px `--tx-4`).

### 6.7 Algo panel ("paso a paso")

Misma tarjeta visual que `.card` pero con un encabezado distinto:

```
<span class="tag">paso a paso</span>
<h3>¿Qué hace el algoritmo aquí?</h3>
```

- **Tag**: pill cyan suave, mono uppercase 10.5 px, tracking `0.08em`, padding `4px 10px 4px 8px`.
- Los `<p>` van con `max-width: 78ch` y color `--tx-2`. Sin centrar.
- **Section label** dentro: `display: block; mono uppercase 11 px; --signal; margin-bottom: 10px`.
- **`.eq`** = ecuación: fila mono 13 px, fondo `--bg-1`, borde `--line-1`, **acento izquierdo de 2 px en `--signal-edge`** (verde `oklch(72% 0.16 155 / 0.5)` si el resultado es 0/correcto). Tres columnas: nombre (110 px, color `--signal`), rhs (`--tx-2`), resultado (`--tx-1`, 600).

### 6.8 Alert

`display: flex; gap: 10px; padding: 12px 16px; border-radius: --r-sm`.
Variantes `.ok`, `.warn`, `.err` usando los tokens de §4.1. El icono es texto mono bold (`✓`, `!`, `×`) — sin SVGs decorativos.

### 6.9 Métricas

`metric-grid` = `grid-template-columns: repeat(2, 1fr); gap: 12px`.
Cada `.metric`:

- bg `--bg-1`, borde `--line-1`, radio `--r-md`, padding 16 × 18.
- **Barra vertical 2 px** a la izquierda con `--signal-edge` por defecto, verde si `.ok`, rojo si `.err`.
- Layout vertical: label uppercase mono 10.5 px (`--tx-3`) → valor grande mono 22 px 600 → delta mono 11.5 px (`--tx-3`).

### 6.10 Hash row

Fila mono 12 px en tarjeta `--bg-1`, padding 11 × 14. Label izquierda en `--signal`, valor en `--tx-2`. `overflow-x: auto` para hashes largos.

### 6.11 Botones

```
.btn          → secundario, fondo --bg-3, borde --line-2
.btn.ghost    → fondo transparente
.btn.primary  → linear-gradient(--signal → --signal-strong), texto #07111c, weight 600
.btn-run      → modifier 100% width, padding más grueso, font 15px
```

Border-radius 10 px. Padding `11px 18px` (normal), `14px 20px` (run). Transición `background .15s, border-color .15s, transform .05s`. Active: `translateY(1px)`.

### 6.12 Inputs (select / text)

- bg `--bg-3`, borde `--line-2`, color `--tx-1`, radio 10 px, padding `12 × 14`.
- Para `<select>`, ocultamos el chevron nativo y dibujamos uno con dos `linear-gradient` muy chiquitos (5 × 5 px) en la esquina derecha.
- Focus: borde `--signal-edge`, anillo `0 0 0 3px oklch(82% 0.12 220 / 0.15)`.

### 6.13 File drop

- Border `1.5px dashed --line-3`, radio `--r-md`, padding 28 × 24.
- Fondo: `repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.012) 12px 13px)` encima de `--bg-1` — diagonales casi invisibles que dan textura técnica.
- Hover: borde `--signal-edge`, diagonales pasan a `oklch(82% 0.12 220 / 0.04)`.
- Encabezado: icono 28 px cuadrado con `--signal-soft` y borde `--signal-edge`, seguido del texto.
- Línea de formatos: mono 11.5 px en `--tx-3`, separada por ` · `.

### 6.14 Status bar (footer técnico)

Fila completa al final del paso 6 (y eventualmente en otros): mono 11.5 px, gap 22 px entre items. Cada item es `<label> <valor>`, con la label en `--tx-3` y el valor en `--tx-1` (o `--ok`, o `--err`). Separadores `·` en `--tx-4`.

---

## 7. Layout

- App centrada en `max-width: 1280px`, padding lateral 32 px, padding top 28 px, bottom 80 px.
- Stack vertical con `gap: 24px` entre secciones principales.
- Dentro de una `.card`, gap interno de 18 px entre subsecciones (`.section` con `margin-top: 18px`).
- **Nunca** poner dos tarjetas pegadas sin gap.

### 7.1 Espaciado tipográfico

| Contexto                          | Margen           |
| --------------------------------- | ---------------- |
| `h2`                              | `margin: 0`      |
| Párrafos en `.algo`               | `margin: 14px 0 18px` |
| `.section` dentro de `.algo`      | `margin-top: 18px` |
| Filas `.eq` consecutivas          | `margin-bottom: 6px` |
| Alert dentro de `.algo`           | `margin-top: 16px` |

---

## 8. Microinteracciones

- Transiciones por defecto: **150 ms ease** para color/background, **50 ms** para `transform: translateY` en active.
- Hover de stepper: solo cambia el bg al 2 % blanco. No cambia el nodo.
- Hover de drop: cambia color del borde + densidad de diagonales.
- LED del status pill: pulse de 2.4 s en `opacity 1 ↔ 0.55`.
- **Nunca** animar la opacidad del cuerpo del texto.
- **Nunca** usar transitions de `all`.

---

## 9. Reglas de redacción (UX writing)

- Español rioplatense/neutro, frase corta, sin signos de exclamación.
- **Eyebrows**: `Paso N · <slug>` siempre en minúsculas, slug en mono.
- Términos técnicos se respetan en su forma original: `XOR`, `SHA-256`, `BER`, `MSB`, `LSB`, `BSC`.
- Variables matemáticas dentro de párrafos van envueltas en `<strong>` (que se renderiza como inline-code mono).
- Frases del estado: "Ningún bit de este bloque cambió en el canal.", "Síndrome cero → no se detecta error.", "El archivo reconstruido es idéntico al original." — afirmaciones llanas, sin adjetivos.
- Nada de "✨", "🚀", "Listo!" ni íconos emocionales.

---

## 10. Don't / Do

| ❌ No hacer | ✅ Hacer |
| ---------- | -------- |
| Gradientes morados saturados | Gradientes oscuros + acento cyan suave |
| Bordes 2 px con colores fuertes | Bordes 1 px hairline + acento vertical 2 px puntual |
| Bits en `<table>` o con CSS-Grid sin `aspect-ratio` | Grid `repeat(64, 1fr)` con `aspect-ratio: 1/1` |
| Códigos en sans con backticks invisibles | Mono real + fondo `rgba(255,255,255,0.04)` + borde |
| Status como texto suelto | Pill con LED pulsante o alert con barra de color |
| `font-family: Helvetica/Arial/Roboto/system-ui` para todo | Inter + JetBrains Mono, sin mezclar más fuentes |
| Emoji decorativos en títulos | Eyebrow mono uppercase + título sans |
| Sombras gigantes en cards | `--sh-card` discreto, glow solo en focus/active |

---

## 11. Snippet de arranque (para un LLM)

Para un nuevo archivo HTML que vaya a usar este sistema, incluir siempre:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
```

Y en el `<body>`:

```html
<div class="app">
  <header class="topbar"> … </header>
  <nav class="stepper"> … </nav>
  <section class="card"> … </section>
  <section class="algo"> … </section>
  <section class="statusbar"> … </section>
</div>
```

Si vas a renderizar bits:

- Grid masivo (cientos): `<div class="bitgrid-wrap"> <div class="bitgrid"> <div class="bit [r|a|c|e]">0|1</div> … </div> </div>`.
- Bits etiquetados (4-8): `<div class="bit-row with-labels"> <div class="col"> <div class="bit-chip [r|a|c|e|p]">1</div> <span class="lbl">d1</span> </div> … </div>`.

Si vas a renderizar una ecuación: `.eq` con `<span class="name">`, `<span class="rhs">`, `<span class="res">` (añade `.zero` a la fila si el resultado vale 0 / es válido).

---

## 12. Roadmap visual (sugerencias para futuras iteraciones)

- **Tooltip hover** sobre `.bit` mostrando índice global, byte de origen y máscara de paridad — siempre con anim de 50 ms y caja `--bg-3` borde `--line-2`.
- **Mini-sparkline de BER** en `.metric` (path SVG en `--signal-edge`) para los bloques con histórico.
- **Tema claro** opcional con los mismos hues pero invertidos en lightness — no abordar hasta que se pida.
- **Skeleton state** para el grid mientras se procesa: bits con `background: linear-gradient(...) shimmer 1.2s`.
