# DESIGN.md

Derived from `src/index.css` and `docs/look-and-feel.md`. The scene: a student or instructor reading bit grids and syndrome math at a daytime desk, in a quiet, well-lit room. The interface should read like a finely-made notebook on a beige wall, not a console. Nordic minimalism with a Mediterranean warm undertone.

## Color

Strategy: **Restrained**. Warm-beige neutrals tinted toward ink, one editorial accent (ochre `--signal` ~oklch(70% 0.13 75)) used for <10% of the surface (eyebrows, active states, focus rings, links-as-terms, key sigils). The primary action is **ink**, not ochre — the ochre stays a rare jewel. Status colors (olive `--ok`, mostaza `--warn`, terracota `--err`) appear only on state.

- Never `#000` / `#fff`. Neutrals tinted toward warm beige; lines are ink-alpha hairlines.
- Background stack `--bg-0 (#EFEAE2) → --bg-3 (#FFFFFF)`, with two faint radial wood-tinted glows and a masked grid overlay.
- Wood accents (`--wood-light`, `--wood`, `--wood-deep`) are the only decorative color family — used on logo, dropzone icon, mode-card icons, and active journey nodes.
- Bit states have a warm-light swatch palette: data (sand), parity/redundancy (muted blue), altered (terracota), corrected (oliva), residual (mostaza), paritybit (lavender). All bit chips have ink-dark text on top.

## Typography

- **Serif (display): Cormorant Garamond** — every `h1`, `h2`, `h3`, `h4`, including card titles, hero, drawer headings, step titles. Weight 500; italic on the accent word inside titles.
- Sans: Inter — body prose, buttons, secondary UI.
- Mono: JetBrains Mono — bits, hashes, rates, matrix names (`H`, `G`), eyebrows (uppercase), metric values, code labels, tag pills.
- Hierarchy by scale + weight: hero 52–62px serif/500, h2 24–28px serif/500, h3 18–22px serif/500, brand 22px serif/600, body 14–15.5px, mono captions 10.5–12px. Body prose capped ~64–78ch.
- The accent word in a heading uses `--wood-deep` italic — not a gradient.

## Layout & elevation

- App max-width 1320px, generous outer padding.
- Cards: `linear-gradient(180deg, --bg-2, --bg-1)` + 1px `--line-1` border + a soft drop shadow that reads as natural diffuse light, not as a button lift. A 1px wood-tinted hairline runs across the card top.
- Steppers use a connector spine/line behind the nodes (legitimate connector).
- **No side-stripe accents** (`border-left`/`right` > 1px as a colored bar). Use full tinted borders, background tints, or leading numbers/icons.
- Radii scale: 4 / 8 / 12 / 16 / 24, plus an arch radius token (`--r-arch`) reserved for occasional hero/feature use; currently unused.

## Motion

- Ease-out only (exponential-ish curves, `cubic-bezier(.22,1,.36,1)`). No bounce/elastic.
- Don't animate layout properties; animate `transform` / `opacity`.
- Respect `prefers-reduced-motion`.

## Components in play

topbar/brand (now serif), status pill (olive/mostaza/terracota), journey strip (clickable stage nodes), control rail (file dropzone, algorithm select, channel segmented control, range slider, ink-primary run/download buttons), process stepper (clickable steps with wood active node), bit grid (paged, clickable bits, ink text on warm tints), legend chips, metrics grid, hash rows, alerts, BER chart (recharts re-tinted to ochre/terracota), toast, and the **inspector drawer** (right-side slide-in `role="dialog"` panel).

## Bans (inherited + project)

Gradient text, glassmorphism-as-default, hero-metric template, identical card grids, modal-as-first-thought (prefer the drawer / inline), em dashes in copy, Tailwind. Also: ochre as a default-everywhere highlight — it must remain rare.
