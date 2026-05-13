# CLAUDE.md

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm test             # run unit tests
```

## Architecture

Educational SPA focused exclusively on **LDPC (Low-Density Parity-Check)** coding.

**Data flow.** Driven by `src/store/pipelineStore.ts`.
- **Modes:** "encode" and "decode".
- **Algorithms:** Only LDPC implementation in `src/lib/encoders/LDPC.ts`.
- **Pipeline:** Specialized pipelines for LDPC encoding and decoding in `src/lib/pipeline.ts`.
- **Visualization:** 100% client-side visualization of bits and metrics.

## Development Rules

- **Strict Algorithm:** Use ONLY LDPC. No Hamming or Convolutional codes.
- **Styling:** CSS-only, no Tailwind. Follow `src/index.css` and `docs/look-and-feel.md`.
- **Performance:** Heavy bit operations MUST run in Web Workers (`src/workers`).
- **Language:** English for code, Spanish for UI/Docs.
- **Privacy:** 100% client-side. No backend.
