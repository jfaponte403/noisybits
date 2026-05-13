# DESIGN.md

Derived from `src/index.css` and `docs/look-and-feel.md`. Dark theme is deliberate: the scene is a student or engineer reading bit grids and syndrome math at a desk, often at night, wanting low glare and high contrast on small monospace glyphs — a lab-instrument console, not a document.

## Color

Strategy: **Restrained**. Tinted near-black neutrals + one accent (`--signal`, a cyan-blue ~oklch(82% 0.12 220)) used for <10% of the surface (active states, eyebrows, primary button, focus rings). Status colors (ok green, warn amber, err red) appear only on state, never decoratively. Bit states have their own muted swatch palette (data, parity/redundancy, altered, corrected, residual).

- Never `#000` / `#fff`. Neutrals are tinted toward the cool hue.
- Background is a stack `--bg-0 … --bg-4` plus two faint radial glows and a masked grid overlay.

## Typography

- Sans: Inter / system-ui — prose, headings, buttons.
- Mono: JetBrains Mono — bits, hashes, rates, matrix names (`H`, `G`), eyebrows, metric values, code labels.
- Hierarchy by scale + weight: h1 18px/600, page hero 44px/700, h2 18px/600, body 14px, mono captions 10.5–12px. Body prose capped ~65–78ch.

## Layout & elevation

- App max-width 1280px, generous outer padding.
- Cards: `linear-gradient(180deg, --bg-2, --bg-1)` + 1px `--line-1` border + soft drop shadow. No nested cards.
- Steppers use a connector spine/line behind the nodes (legitimate connector, not a decorative side-stripe).
- **No side-stripe accents** (`border-left`/`right` > 1px as a colored bar on cards/list items/alerts). Use full tinted borders, background tints, or leading numbers/icons instead.
- Radii: 4 / 6 / 10 / 14 / 20.

## Motion

- Ease-out only (exponential-ish curves, e.g. `cubic-bezier(.22,1,.36,1)`). No bounce/elastic.
- Don't animate layout properties; animate `transform` / `opacity`.
- Respect `prefers-reduced-motion`.

## Components in play

topbar/brand, status pill, journey strip (clickable stage nodes), control rail (file dropzone, algorithm select, channel segmented control, range slider, run/download buttons), process stepper (clickable steps), bit grid (paged, clickable bits), legend chips, metrics grid, hash rows, alerts, BER chart (recharts), toast, and the **inspector drawer** (right-side slide-in `role="dialog"` panel that explains a clicked stage/bit).

## Bans (inherited + project)

Gradient text, glassmorphism-as-default, hero-metric template, identical card grids, modal-as-first-thought (prefer the drawer / inline), em dashes in copy, Tailwind.
