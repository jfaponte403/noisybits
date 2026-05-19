# Look & Feel — "Nordic Warmth"

Estilo visual inspirado en un comedor minimalista escandinavo con toques mediterráneos cálidos. Pensado para proyectos React modernos, editoriales y serenos.

---

## 1. Concepto

**Palabras clave:** minimalista · cálido · sereno · editorial · orgánico · sofisticado

**Sensación:** espacio luminoso, respirado, con contrastes suaves entre neutros cálidos, maderas naturales y acentos en negro. La interfaz debe sentirse como una habitación bien iluminada: equilibrada, sin ruido visual, con detalles que invitan a mirar dos veces.

---

## 2. Paleta de colores

### Neutros (base)
| Token | HEX | Uso |
|---|---|---|
| `--color-bg` | `#EFEAE2` | Fondo principal (beige cálido de pared) |
| `--color-bg-soft` | `#F5F1EA` | Fondo secundario / cards |
| `--color-bg-elevated` | `#FAF7F2` | Modales, popovers |
| `--color-surface` | `#FFFFFF` | Superficies limpias (estanterías) |

### Madera (acentos cálidos)
| Token | HEX | Uso |
|---|---|---|
| `--color-wood-light` | `#D9B98A` | Acento cálido suave |
| `--color-wood` | `#C9A678` | Acento principal cálido |
| `--color-wood-deep` | `#A8814F` | Acento cálido oscuro |

### Tinta y contraste
| Token | HEX | Uso |
|---|---|---|
| `--color-ink` | `#15171A` | Texto principal, marcos, bordes fuertes |
| `--color-charcoal` | `#3A3D45` | Botones, sillas, elementos secundarios |
| `--color-text` | `#1F2024` | Texto cuerpo |
| `--color-text-muted` | `#6B6862` | Texto secundario, captions |
| `--color-border` | `#E2DCD0` | Bordes sutiles |

### Acentos
| Token | HEX | Uso |
|---|---|---|
| `--color-accent-ochre` | `#C8932E` | Acento principal (mostaza/ocre) |
| `--color-accent-blue` | `#4A5266` | Acento secundario (azul apagado) |

### Estados (semánticos)
| Token | HEX | Uso |
|---|---|---|
| `--color-success` | `#6B8E5A` | Verde olivo apagado |
| `--color-warning` | `#C8932E` | Mostaza |
| `--color-error` | `#A14B3B` | Terracota |

---

## 3. Tipografía

**Pareo recomendado:** una serif editorial para titulares + una sans-serif geométrica para UI.

```css
--font-display: "Cormorant Garamond", "Playfair Display", Georgia, serif;
--font-body: "Inter", "DM Sans", system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```

### Escala
| Token | Tamaño | Line-height | Uso |
|---|---|---|---|
| `--text-xs` | 12px | 1.4 | Captions |
| `--text-sm` | 14px | 1.5 | UI secundaria |
| `--text-base` | 16px | 1.6 | Cuerpo |
| `--text-lg` | 18px | 1.5 | Cuerpo destacado |
| `--text-xl` | 24px | 1.3 | Subtítulos |
| `--text-2xl` | 32px | 1.2 | H2 |
| `--text-3xl` | 48px | 1.1 | H1 (serif) |
| `--text-4xl` | 64px | 1.0 | Hero (serif, light weight) |

**Pesos:** 300 (display ligero), 400, 500, 600.
**Tracking:** ligeramente abierto en titulares (`letter-spacing: -0.01em` para serif grandes).

---

## 4. Espaciado

Sistema base **4px**. Generoso y aireado.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
```

**Principio:** preferir más aire del que parece necesario. Las secciones respiran.

---

## 5. Formas y bordes

El espacio tiene un arco arquitectónico — esa curvatura suave se traduce a la UI.

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-arch: 9999px 9999px 0 0;  /* arco superior */
--radius-full: 9999px;

--border-thin: 1px solid var(--color-border);
--border-strong: 1px solid var(--color-ink);
```

**Uso del arco:** úsalo en imágenes hero, avatares destacados, o contenedores de feature. No abusar.

---

## 6. Sombras

Luz natural difusa, sombras casi inexistentes.

```css
--shadow-xs: 0 1px 2px rgba(21, 23, 26, 0.04);
--shadow-sm: 0 2px 8px rgba(21, 23, 26, 0.06);
--shadow-md: 0 8px 24px rgba(21, 23, 26, 0.08);
--shadow-lg: 0 16px 48px rgba(21, 23, 26, 0.10);
```

---

## 7. Componentes (guía rápida)

### Botón primario
- Fondo `--color-ink`, texto `--color-bg-soft`
- Radio `--radius-md`, padding `12px 24px`
- Hover: `--color-charcoal`

### Botón secundario
- Fondo transparente, borde `--border-strong`, texto `--color-ink`
- Hover: fondo `--color-bg-soft`

### Card
- Fondo `--color-bg-soft` o `--color-surface`
- Radio `--radius-lg`
- Sombra `--shadow-sm`
- Padding `--space-6` a `--space-8`

### Input
- Fondo `--color-surface`
- Borde inferior `--border-thin` (estilo minimalista, sin caja completa)
- Focus: borde `--color-ink`

### Imágenes hero
- Considerar máscara con `--radius-arch` para evocar el arco arquitectónico

---

## 8. Iconografía e ilustración

- **Iconos:** línea fina (1.5px stroke), estilo `lucide-react` o `phosphor` (weight: light)
- **Ilustración:** geométrica simple, alto contraste B/N (referencia: las obras de arte sobre la repisa)
- Evitar gradientes saturados o flat-design colorido

---

## 9. Imágenes y assets

- Fotografía con luz natural, paleta cálida y neutra
- Texturas: madera, tela, lino, cerámica mate
- Plantas naturales como detalle ocasional
- Composiciones asimétricas pero equilibradas

---

## 10. Movimiento

Animaciones lentas y discretas. Nada que distraiga.

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 150ms;
--duration-base: 300ms;
--duration-slow: 600ms;
```

- Transiciones de hover: 150–200ms
- Entradas de página: fade + leve translate-y (12px)
- Evitar bounces, rebotes o spinners agresivos

---

## 11. Snippet de variables CSS (listo para usar)

```css
:root {
  /* Base */
  --color-bg: #EFEAE2;
  --color-bg-soft: #F5F1EA;
  --color-bg-elevated: #FAF7F2;
  --color-surface: #FFFFFF;

  /* Wood */
  --color-wood-light: #D9B98A;
  --color-wood: #C9A678;
  --color-wood-deep: #A8814F;

  /* Ink */
  --color-ink: #15171A;
  --color-charcoal: #3A3D45;
  --color-text: #1F2024;
  --color-text-muted: #6B6862;
  --color-border: #E2DCD0;

  /* Accents */
  --color-accent-ochre: #C8932E;
  --color-accent-blue: #4A5266;

  /* Typography */
  --font-display: "Cormorant Garamond", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(21, 23, 26, 0.06);
  --shadow-md: 0 8px 24px rgba(21, 23, 26, 0.08);
}
```

---

## 12. Reglas de oro

1. **Más blanco del que crees** — el espacio negativo es protagonista
2. **Negro con propósito** — úsalo como acento, no como fondo
3. **Textura sobre color** — antes de añadir un color, considera una textura
4. **Una serif, una sans** — no mezclar más fuentes
5. **El acento mostaza es una joya** — usar con moderación, gana fuerza por escasez