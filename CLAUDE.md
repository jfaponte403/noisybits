# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server
npm run lint         # ESLint (flat config, typescript-eslint + react-hooks)
npm test             # run all unit tests (Vitest, runs once)
npm run test:watch   # Vitest in watch mode
npm run build        # tsc -b (typecheck) + vite build
npm run preview      # serve the production build
```

Run a single test file: `npx vitest run tests/unit/hamming.test.ts`
Run a single test by name: `npx vitest run -t "corrects any single-bit error"`

CI (`.github/workflows/ci.yml`) runs `lint → test → build` on every push/PR to `master`; all three must pass. Note `tsc` runs with `strict`, `noUnusedLocals`, and `noUnusedParameters`, so unused imports/vars break the build even if ESLint is quiet. `react-refresh/only-export-components` is on — a component file should export only components (move shared constants/helpers out, or keep them unexported).

## Architecture

Educational SPA: a 6-step wizard that walks a file through a channel-coding pipeline (file → bits → Hamming encode → noisy channel → decode/correct → SHA-256 verify), 100% client-side.

**Data flow.** Everything is driven by `src/store/pipelineStore.ts` (Zustand). `run()` calls `runPipeline(fileBytes, code, channelConfig)` from `src/lib/pipeline.ts`, which returns a `PipelineResult` and advances `step` to 1. `step` (0..5, type `StepId`) is the single source of truth for which view renders. Step 0 = setup/landing; steps 1..5 = Original / Codificación / Canal / Decodificación / Verificación. Steps 1..5 are gated behind `result !== null`.

**The pipeline** (`src/lib/pipeline.ts`) does the full job over the whole file *and* produces a `BlockTrace` for one representative block (the first block the channel actually flipped, else block 0). The trace is what the "¿Qué hace el algoritmo aquí?" panel renders — encode equations, channel flips, syndrome computation, diagnosis. Annotated bit arrays (`AnnotatedBit[]` with `type: "data" | "parity" | "altered" | "corrected" | "uncorrected"`) are also produced for each stage and rendered by `BitGrid`.

**The codec** (`src/lib/encoders/Hamming.ts`) is a single generic family: Hamming `(2^m−1, k)` codes, optionally extended with an overall parity bit. `CODES` lists the selectable variants (each carries `n`, `k`, `rate`). Parity bit positions are powers of two (1-indexed); the syndrome is the XOR of the 1-indexed positions of all set bits and points directly at the error. There is intentionally **no convolutional/Viterbi** code — if asked to add code rates, add Hamming variants to `CODES`, don't reach for puncturing.

**Bit representation.** Bits are plain `number[]` (0/1), type-aliased as `Bit`. `BitArray.ts` handles `bytesToBits` / `bitsToBytes` (MSB first). Don't reintroduce `(0|1)[]` — it fights `Array.prototype.reduce` typing.

**Channel.** `src/lib/channel/channel.ts` has `applyBSC(bits, p)` and `applyPattern(bits, pattern, position)`. The UI currently only exposes BSC at a fixed `p = 0.03` (the store's default `channel`); pattern injection is wired through the store/pipeline but not surfaced.

## Styling

CSS only — **no Tailwind, no UI library**. The whole design system lives in `src/index.css`: tokens in `:root` (`--bg-*`, `--line-*`, `--tx-*`, `--signal*`, oklch bit-state colors, radii) and semantic classes (`.card`, `.stepper`/`.step[data-state]`, `.bit`/`.bit-chip` with `r|a|c|e|p` modifiers, `.bitgrid`, `.eq`, `.metric`, `.alert`, `.btn`, `.input`, `.drop`, `.statusbar`, `.toast`). Components compose these class names; avoid inline styles except for dynamic values (e.g. the `--p` pager fill).

`docs/prd/look-and-feel.md` is the binding visual spec — dark-only, Inter + JetBrains Mono (loaded in `index.html`), cyan "signal" accent, hairline borders, mono for all data/bits/equations, no decorative emoji, plain declarative UX copy in neutral Spanish. `docs/prd/mvp-prd.md` is the original product brief (broader than what's built).

## Conventions

- Bit-state colors are fixed per semantic meaning (see look-and-feel §4); never reuse a hue for something else or invent a sixth state without adding it there.
- Keep new modules under `src/lib/**` pure (no React/DOM); UI logic stays in `components/` and `store/`.
- Tests live in `tests/unit/` and cover the codec (round-trip, single-error correction across all positions, double-error detection on extended codes) and bit conversions.
