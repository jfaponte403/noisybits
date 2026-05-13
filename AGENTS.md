# Repository Guidelines

## Project Structure & Module Organization

This is a React + Vite TypeScript SPA for visualizing LDPC channel coding. Application code lives in `src/`: UI components are in `src/components`, global state is in `src/store`, algorithm and data-processing logic is in `src/lib`, and Web Worker entry points are in `src/workers`. Unit tests live in `tests/unit` and import source modules directly. Product and design notes are kept in `docs`, including PRDs under `docs/prd`. Build output goes to `dist` and should not be edited manually.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server.
- `npm run build`: run TypeScript project checks with `tsc -b`, then produce a production Vite build.
- `npm run preview`: serve the built app locally for final inspection.
- `npm run lint`: run ESLint across the repository.
- `npm test`: run the Vitest suite once.
- `npm run test:watch`: run Vitest in watch mode while developing.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Prefer named exports for reusable modules and keep React components in PascalCase files such as `ControlsPanel.tsx`. Utility and algorithm modules should use descriptive domain names, for example `BitArray.ts`, `LDPC.ts`, or `pipeline.ts`. Follow the existing two-space indentation pattern in tests and keep JSX formatting readable. ESLint enforces recommended TypeScript rules, React Hooks rules, React Refresh constraints, and unused-variable checks; prefix intentionally unused parameters or locals with `_`.

## Testing Guidelines

Tests use Vitest and are named `*.test.ts` under `tests/unit`. Write focused tests around deterministic logic in `src/lib`, especially bit conversion, LDPC encode/decode behavior, pipeline round-trips, and error-rate calculations. Prefer small byte arrays or explicit bit vectors so failures are easy to inspect. Run `npm test` before opening a pull request, and run `npm run build` when changes affect workers, TypeScript types, or app wiring.

## Commit & Pull Request Guidelines

The current history uses short, imperative summaries such as `create initial structure` and broader integration summaries. Keep commit subjects concise and action-oriented, for example `add LDPC decoder tests` or `refine bitstream viewer states`. Pull requests should include a short description, test results (`npm test`, `npm run lint`, `npm run build` when relevant), linked issues if any, and screenshots or recordings for visible UI changes.

## Security & Configuration Tips

The app is designed to run fully in the browser; do not add backend file upload paths or telemetry without explicit discussion. Keep uploaded-file handling local to browser APIs and workers. Do not commit generated artifacts from `dist`, dependency folders, local IDE settings, or environment-specific configuration.
