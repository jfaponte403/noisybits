# PRODUCT.md

**Name:** noisybits — Channel Coding Visualizer
**Register:** product (an interactive tool; the design serves the learning task)

## Product purpose

A 100% client-side educational SPA that shows, step by step, how the **LDPC (Low-Density Parity-Check)** code protects a real file: how data gains redundancy when encoded, how a noisy channel corrupts it, and how the decoder uses the parity-check matrix H to detect and repair errors. Every bit, every stage and every metric is computed locally in the browser (Web Workers for the heavy bit work). No backend, nothing leaves the device.

The single differentiator: you can click **any** stage, node or bit and get a pedagogical, math-honest explanation of exactly what the algorithm did there, readable by a beginner and useful to a technical user.

## Users

- Students of coding theory / digital communications wanting an intuition for LDPC.
- Instructors who need a live, inspectable demo.
- Engineers sanity-checking how systematic LDPC encode/decode behaves under BSC or hand-injected error patterns.

## Tone

Laboratory instrument. Precise, quiet, technical. Spanish UI copy. Monospace for anything that is data (bits, hashes, rates, matrix names); humanist sans for prose. No hype, no emoji-speak, no marketing voice. Explanations are plain-spoken but never hand-wave the math.

## Anti-references

- Generic SaaS dashboards (hero metric + gradient + identical card grid).
- "Crypto/AI neon on black" aesthetics.
- Tailwind-look utility soup. (Project rule: CSS only, no Tailwind.)
- Anything that feels like a landing page. This is a tool, not a pitch.

## Strategic principles

1. **LDPC only.** No Hamming, no convolutional codes, no other algorithms — in code or UI.
2. **Show the work.** Prefer revealing the computation (syndrome vectors, which checks failed, which bit flipped) over summarising it.
3. **Inspectable everywhere.** Stages, journey nodes and individual bits are all clickable and explain themselves.
4. **Local and honest.** No backend. Don't display fabricated numbers — if a curve is a simulation, say so and run a real one.
5. **Performance.** Heavy bit operations run in Web Workers; the UI thread stays responsive even on large files.
