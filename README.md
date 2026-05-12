# Channel Coding Visualizer

SPA educativa (React 18 + TypeScript + Vite, tema oscuro) que recorre **paso a paso** el pipeline
de codificación de canal: archivo → bits → codificación con un código Hamming → canal ruidoso →
decodificación con corrección de errores → verificación de integridad.

Todo corre **100 % en el navegador**: ningún archivo sale del cliente, no hay backend.

---

## Cómo funciona (el stepper)

La app es un asistente de 6 pasos:

1. **Configuración** — subís un archivo (`.txt`, `.png`, `.jpg`, `.wav`, `.mp3`, `.mp4`; máx 50 MB)
   y elegís un código Hamming con su tasa. Botón "Ejecutar pipeline".
2. **Original** — el archivo expandido a bits (MSB → LSB); abajo, los primeros bytes en binario y hex.
3. **Codificación** — bits codificados (datos + redundancia); abajo, las ecuaciones de paridad y la
   palabra código del bloque de ejemplo, coloreada por rol.
4. **Canal** — bits recibidos tras un BSC (`p = 0.03` fijo); abajo, transmitido vs recibido del bloque
   y las posiciones invertidas.
5. **Decodificación** — bits decodificados; abajo, el cálculo del síndrome, el diagnóstico
   (1 error corregido / error en la paridad global / 2 errores no corregibles) y los datos recuperados.
6. **Verificación** — comparación final vs original; abajo, BER pre/post, bloques corregidos /
   no corregibles, hashes SHA-256, integridad, y descargas de `encoded.bin`, `received.bin`,
   `decoded.<ext>`.

En cada paso, el panel superior muestra la **vista de bits** correspondiente (con colores: dato /
redundancia / alterado en canal / corregido / error residual) y el panel inferior "¿Qué hace el
algoritmo aquí?" muestra el detalle sobre un **bloque representativo** (el primero que el canal alteró).

---

## Un solo algoritmo, varias tasas

La app usa **una única familia: códigos Hamming** `(2^m−1, 2^m−1−m)`, opcionalmente extendidos con un
bit de paridad global. El encoder/decoder es genérico para cualquier `m`. Tasas seleccionables:

| Código                    | n / k  | Tasa  | Capacidad            |
| ------------------------- | ------ | ----- | -------------------- |
| Hamming(8,4) extendido    | 8 / 4  | 1/2   | corrige 1, detecta 2 |
| Hamming(7,4)              | 7 / 4  | 4/7   | corrige 1            |
| Hamming(16,11) extendido  | 16 / 11| 11/16 | corrige 1, detecta 2 |
| Hamming(15,11)            | 15 / 11| 11/15 | corrige 1            |
| Hamming(31,26)            | 31 / 26| 26/31 | corrige 1            |
| Hamming(63,57)            | 63 / 57| 57/63 | corrige 1            |

No hay códigos convolucionales / Viterbi.

---

## Scripts

```bash
npm install
npm run dev       # servidor de desarrollo (Vite)
npm run lint      # ESLint (typescript-eslint + react-hooks)
npm test          # tests unitarios (Vitest)
npm run build     # typecheck (tsc -b) + build de producción
npm run preview   # previsualizar el build
```

CI: `.github/workflows/ci.yml` corre `lint → test → build` en cada push/PR a `master`.

---

## Stack

- **React 18 + TypeScript 5 + Vite 5**
- **Zustand** para el estado (archivo, código, paso, resultado)
- **Vitest** para tests unitarios
- **Web Crypto API** (`crypto.subtle`) para SHA-256
- Estilos: CSS plano con sistema de diseño propio (sin Tailwind ni librerías de UI). El look & feel
  sigue `docs/prd/look-and-feel.md`: dark-only, Inter + JetBrains Mono, acento cyan "signal", tokens
  CSS en `:root` y clases semánticas en `src/index.css`.

---

## Estructura

```
src/
  index.css                    sistema de diseño (tokens + clases de componentes)
  main.tsx, App.tsx
  lib/
    bitstream/BitArray.ts      bytes <-> bits (MSB first)
    encoders/Hamming.ts        familia Hamming genérica: encode/decode + traza por bloque
    channel/channel.ts         BSC + inyección de patrón
    metrics/metrics.ts         BER + SHA-256
    pipeline.ts                encode -> canal -> decode -> métricas + traza de un bloque
  store/pipelineStore.ts       estado global (Zustand)
  components/
    Stepper.tsx                stepper de 6 pasos
    BitStreamViewer.tsx        BitGrid (vista de bits con ventana) + Legend
    AlgorithmProcess.tsx       "¿qué hace el algoritmo?" para el paso activo
    ControlsPanel.tsx          archivo + selector de código + botón ejecutar
    FileDropzone.tsx           drag & drop con validación de MIME/tamaño
    MetricsPanel.tsx           ResultsBar (statusbar de métricas + descargas)
    Toast.tsx                  notificaciones
tests/unit/                    Vitest (Hamming round-trip, corrección de 1 error, detección de dobles)
docs/prd/                      mvp-prd.md · look-and-feel.md
```

---

## Notas

- El ruido del canal está fijo en un BSC con `p = 0.03` (no configurable desde la UI; el módulo
  `channel.ts` soporta también inyección manual de patrón).
- Archivos > 50 MB se rechazan; tipos MIME no soportados también.
- Privacidad: no hay telemetría ni requests a servicios externos durante la operación.
