# PRD: Channel Coding Visualizer (React + TypeScript)

> **Versión:** 1.0
> **Tipo de producto:** Single-Page Application (SPA) educativa / demostrativa
> **Stack:** React 18 + TypeScript (TSX) + Vite
> **Modo de ejecución:** 100% client-side (sin backend)

---

## 1. Overview

**Channel Coding Visualizer** es una aplicación web educativa construida en **React + TypeScript** que permite cargar archivos multimedia (texto, audio, imagen, video), aplicar **codificación de canal** con una tasa configurable, **inyectar errores** simulando un canal ruidoso, y **decodificar** la señal recibida con corrección automática de errores. Cada etapa del pipeline (bits originales → codificados → recibidos con errores → decodificados → archivo reconstruido) se renderiza en pantalla con resaltado visual de los bits de redundancia, los bits alterados y los errores corregidos. El objetivo es que el usuario *vea* el funcionamiento del código corrector, no solo el resultado final.

---

## 2. Problem Statement

La codificación de canal (Hamming, convolucionales + Viterbi) es un tema central en cursos de teoría de la información y telecomunicaciones, pero las herramientas existentes son:

- **CLI / MATLAB / Jupyter** → curva de entrada alta, no son interactivas en tiempo real.
- **Demostraciones académicas** → muestran únicamente el resultado final, no las etapas intermedias bit a bit.
- **Librerías de alto nivel** (e.g. `commpy`) → ocultan el algoritmo como caja negra.

> **Assumption:** No existe un baseline cuantitativo de adopción de herramientas competidoras. Se infiere demanda a partir del contexto académico del usuario; validar con docentes antes de invertir en marketing.

Se necesita una herramienta **visual, ejecutable en el navegador, sin instalación**, que muestre paso a paso cómo se añade redundancia, cómo se introducen errores en el canal y cómo el decodificador los corrige.

---

## 3. Goals & Non-Goals

### 3.1 Goals (In-Scope)

- **G1** — Procesar archivos `.txt`, `.png`, `.jpg`, `.wav`, `.mp3`, `.mp4` 100% en el navegador (sin uploads a servidor).
- **G2** — Implementar **Hamming(7,4) extendido** y **código convolucional con puncturing** desde cero en TypeScript (no librerías caja negra).
- **G3** — Permitir seleccionar `code_rate ∈ {1/2, 2/3, 3/4, 5/6, 7/8}` vía UI.
- **G4** — Simular canal con inyección manual de patrón o **BSC** con probabilidad `p` configurable.
- **G5** — Visualizar **5 etapas** del pipeline con resaltado de color por tipo de bit (dato, redundancia, alterado, corregido).
- **G6** — Reportar BER pre/post-decodificación, número de errores corregidos, y verificación de integridad (SHA-256).
- **G7** — Permitir descargar los artefactos generados (`encoded.bin`, `received.bin`, `decoded.<ext>`).

### 3.2 Non-Goals (Out-of-Scope)

- **NG1** — Backend, autenticación, almacenamiento persistente entre sesiones.
- **NG2** — Procesamiento de archivos > 50 MB (limitado por memoria del navegador).
- **NG3** — Códigos avanzados (LDPC, Turbo, Polar) — diferidos a iteraciones futuras.
- **NG4** — Internacionalización (i18n) en MVP — solo inglés y español.
- **NG5** — Mobile-first (la aplicación es responsive pero optimizada para desktop ≥ 1280px).

---

## 4. Target Users & Personas

| Persona | Rol | Contexto de uso | Necesidad principal |
|---|---|---|---|
| **Estudiante de Telecomunicaciones** | Cursando "Teoría de la información" o "Comunicaciones digitales" | Laboratorio universitario, tarea individual | Visualizar paso a paso cómo Hamming/Viterbi corrigen errores |
| **Docente Universitario** | Profesor de Ingeniería | Aula con proyector, demostración en vivo | Mostrar el efecto de variar la tasa `p` del canal sobre el BER |
| **Ingeniero de Comunicaciones Junior** | Recién graduado | Onboarding técnico, repaso conceptual | Validar intuiciones sobre trade-off tasa vs. capacidad correctiva |
| **Curioso técnico / autodidacta** | Desarrollador, hobbyist | Tiempo libre | Experimentar con un sandbox interactivo sin instalar nada |

---

## 5. User Stories

- **US-1** — *As a* estudiante, *I want* cargar una imagen PNG y ver su representación en bits, *so that* entiendo qué significa "codificar a nivel de bit".
- **US-2** — *As a* docente, *I want* seleccionar `code_rate = 1/2` y mostrar en pantalla los bits de paridad añadidos, *so that* mis estudiantes vean la redundancia explícitamente.
- **US-3** — *As a* estudiante, *I want* inyectar el patrón `10101010` en posiciones específicas, *so that* puedo predecir cuáles errores el decodificador podrá corregir.
- **US-4** — *As a* docente, *I want* configurar un BSC con `p = 0.05`, *so that* simulo un canal realista y mido el BER resultante.
- **US-5** — *As a* estudiante, *I want* ver lado a lado los bits con error vs. corregidos resaltados en rojo y verde, *so that* identifico visualmente la capacidad de corrección.
- **US-6** — *As a* ingeniero junior, *I want* descargar el archivo decodificado y compararlo con el original, *so that* verifico la integridad usando hash SHA-256.
- **US-7** — *As a* curioso técnico, *I want* mover un slider de `p` y ver cómo el BER post-decodificación cambia en una gráfica en tiempo real, *so that* entiendo la curva característica del código.
- **US-8** — *As a* docente, *I want* alternar entre Hamming(7,4) y convolucional, *so that* comparo capacidades correctivas en la misma sesión.

---

## 6. Functional Requirements

| ID | Requisito | Verificación |
|---|---|---|
| **FR-1** | El sistema acepta archivos vía `<input type="file">` con tipos MIME: `text/plain`, `image/png`, `image/jpeg`, `audio/wav`, `audio/mpeg`, `video/mp4`. | Test unitario rechaza archivo `.exe`; archivo válido se carga en memoria como `Uint8Array`. |
| **FR-2** | El archivo cargado se convierte a una secuencia de bits (`BitArray`) accesible para los módulos de codificación. | Test: archivo de 1 byte `0x41` produce `BitArray` `[0,1,0,0,0,0,0,1]`. |
| **FR-3** | El usuario selecciona `code_rate ∈ {1/2, 2/3, 3/4, 5/6, 7/8}` mediante un componente `<Select>`. | El valor seleccionado se refleja en el estado global y dispara recodificación. |
| **FR-4** | El sistema implementa **Hamming(7,4) extendido** (8 bits totales, capacidad: corrige 1 error, detecta 2). | Test: codifica `[1,0,1,1]` → produce codeword de 8 bits con paridad correcta. |
| **FR-5** | El sistema implementa **código convolucional (k=1, n=2, K=7)** con puncturing para alcanzar tasas distintas a `1/2`. | Test: para `rate=2/3` el patrón de puncturing es `[1,1,1,0,0,1]` y la longitud de salida coincide. |
| **FR-6** | El usuario selecciona el algoritmo (`Hamming` o `Convolucional`) vía un `<RadioGroup>`. | UI muestra solo las tasas válidas para el algoritmo seleccionado. |
| **FR-7** | El módulo de canal permite **inyección manual** de un patrón de bits (string `"10101010101"`) en una posición configurable. | XOR del patrón con la secuencia codificada en la posición indicada. |
| **FR-8** | El módulo de canal permite **simulación BSC** con `p ∈ [0, 0.5]` configurable vía slider. | Test: para `p=0.0` el output == input; para `p=1.0` el output es complemento bit a bit. |
| **FR-9** | El sistema decodifica usando **algoritmo de síndrome** para Hamming y **Viterbi (hard-decision)** para convolucional. | Test: codeword Hamming con 1 error inyectado → decoder recupera el mensaje original. |
| **FR-10** | El sistema calcula y muestra: **BER pre-decodificación**, **BER post-decodificación**, **errores corregidos**, **errores no corregidos**. | Métricas se renderizan en un panel `<MetricsPanel>` reactivo. |
| **FR-11** | El sistema verifica integridad del archivo reconstruido vía **SHA-256** (Web Crypto API) y muestra ✅ / ❌ comparado con el hash del original. | Test: archivo idéntico produce hashes idénticos. |
| **FR-12** | El sistema renderiza **5 paneles de visualización** simultáneos: (1) bits originales, (2) bits codificados, (3) bits recibidos, (4) bits decodificados, (5) comparación final. | Cada panel usa un componente `<BitStreamViewer>` con leyenda de colores. |
| **FR-13** | El componente `<BitStreamViewer>` resalta: datos (gris), redundancia (azul), alterados (rojo), corregidos (verde). | Inspección visual + atributo `data-bit-type` para tests E2E. |
| **FR-14** | El usuario descarga los artefactos `encoded.bin`, `received.bin`, `decoded.<ext>` vía botones que generan Blobs y URLs. | Click en botón dispara descarga del archivo correcto con MIME apropiado. |
| **FR-15** | Una vista `<BERChart>` grafica BER vs. `p` en tiempo real cuando el usuario mueve el slider de BSC. | Recharts renderiza línea continua actualizada con debounce de 300 ms. |
| **FR-16** | Si el archivo excede 50 MB el sistema muestra una alerta y rechaza la carga. | Test: archivo de 51 MB dispara mensaje de error en `<Toast>`. |

---

## 7. Non-Functional Requirements

| ID | Categoría | Requisito | Métrica/Target |
|---|---|---|---|
| **NFR-1** | Performance | Codificar un archivo de 1 MB con Hamming(7,4) debe completar en < 2 s en un equipo de referencia (Intel i5-10ª gen / 8 GB RAM). | Medido vía `performance.now()` en test E2E. |
| **NFR-2** | Performance | El pipeline completo (encode + canal + decode) para 1 MB con Viterbi debe completar en < 8 s. | Si excede, fragmentar y mostrar `<ProgressBar>`. |
| **NFR-3** | Responsiveness | El UI nunca bloquea el main thread > 50 ms durante codificación; se usan **Web Workers** para procesamiento pesado. | Lighthouse Performance score ≥ 85. |
| **NFR-4** | Compatibilidad | Soporte para últimas 2 versiones mayores de Chrome, Firefox, Edge, Safari. | Verificado con BrowserStack en CI. |
| **NFR-5** | Accesibilidad | WCAG 2.1 Nivel AA: contraste mínimo 4.5:1, navegación por teclado, ARIA labels en componentes interactivos. | Auditoría `axe-core` sin violaciones críticas. |
| **NFR-6** | Privacidad | Ningún archivo del usuario abandona el navegador. Sin telemetría ni analytics de contenido. | Inspección de red en CI: 0 requests a dominios externos durante operación. |
| **NFR-7** | Seguridad | El archivo cargado se sanitiza (no se ejecuta como código). Renderizado siempre como `Uint8Array`, nunca como `eval`/`Function`. | Code review + linter rule. |
| **NFR-8** | Escalabilidad | Arquitectura modular permite añadir nuevos códigos (LDPC, Reed-Solomon) sin refactor del UI. | Interfaz `ChannelCoder` documentada (ver §10.4). |
| **NFR-9** | Mantenibilidad | Cobertura de tests unitarios ≥ 80% en módulos de `encoder`, `decoder`, `channel`. | Reporte de Vitest + GitHub Actions. |
| **NFR-10** | UX | El usuario completa el flujo "cargar → codificar → inyectar errores → decodificar → descargar" en ≤ 5 clics. | Validado con prueba de usabilidad (n=5). |

---

## 8. User Flows

### 8.1 Flujo principal (Happy Path)

```
[1] Usuario abre la app
       ↓
[2] Pantalla principal: zona de drop + selectores (algoritmo, code_rate)
       ↓
[3] Usuario arrastra archivo PNG → app valida MIME y tamaño
       ↓
[4] App muestra preview del archivo + bits originales (primeros 64 bits)
       ↓
[5] Usuario selecciona "Hamming(7,4)" y "rate = 1/2"
       ↓
[6] App ejecuta encoding → muestra Panel "Bits Codificados" (paridad en azul)
       ↓
[7] Usuario configura BSC con slider p = 0.03 → ejecuta "Pasar por canal"
       ↓
[8] App muestra Panel "Bits Recibidos" (alterados en rojo)
       ↓
[9] Usuario hace clic en "Decodificar"
       ↓
[10] App ejecuta Viterbi/Síndrome → muestra Panel "Bits Decodificados"
        ↓
[11] App calcula SHA-256 → muestra integridad ✅ y métricas (BER, errores corregidos)
        ↓
[12] Usuario descarga `decoded.png` y compara visualmente con el original
```

### 8.2 Flujo alternativo: Comparación de algoritmos

```
[1] Usuario carga archivo
[2] Ejecuta full pipeline con Hamming → guarda métricas en historial
[3] Cambia a Convolucional → app re-ejecuta pipeline con el mismo input
[4] Panel `<ComparisonView>` muestra tabla lado a lado: BER, errores corregidos, tiempo de procesamiento
```

### 8.3 Flujo de error: Archivo demasiado grande

```
[1] Usuario arrastra archivo de 80 MB
[2] App detecta tamaño > 50 MB
[3] Muestra Toast: "Archivo excede el límite de 50 MB. Considera fragmentar."
[4] Estado vuelve a "esperando archivo"
```

---

## 9. UX / UI Considerations

### 9.1 Layout principal (Desktop ≥ 1280px)

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: Logo · Channel Coding Visualizer · [Help] [GitHub]  │
├──────────────────────────────────────────────────────────────┤
│  CONTROLS PANEL (izquierda, 320px fijo)                      │
│    · FileDropzone                                            │
│    · AlgorithmSelector (Hamming | Convolutional)             │
│    · CodeRateSelect                                          │
│    · ChannelConfig (BSC slider | Pattern injector)           │
│    · ActionButtons (Encode | Transmit | Decode | Full Run)   │
├──────────────────────────────────────────────────────────────┤
│  VISUALIZATION GRID (derecha, fluido)                        │
│  ┌────────────┬────────────┬────────────┐                    │
│  │ Original   │ Encoded    │ Received   │                    │
│  ├────────────┼────────────┼────────────┤                    │
│  │ Decoded    │ Comparison │ Metrics    │                    │
│  └────────────┴────────────┴────────────┘                    │
├──────────────────────────────────────────────────────────────┤
│  BER CHART (full width, colapsable)                          │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Componentes clave

| Componente | Responsabilidad | Estados |
|---|---|---|
| `<FileDropzone>` | Aceptar drag-and-drop o click-to-browse | idle, hover, loading, error |
| `<BitStreamViewer>` | Renderizar secuencia de bits con colores | empty, populated, highlighting-diff |
| `<AlgorithmSelector>` | RadioGroup para Hamming/Convolucional | unselected, selected |
| `<CodeRateSelect>` | Dropdown con tasas válidas | enabled, disabled (según algoritmo) |
| `<BSCSlider>` | Slider con `p ∈ [0, 0.5]` | inactive, dragging, applied |
| `<PatternInjector>` | Input de texto + posición numérica | empty, valid, invalid |
| `<MetricsPanel>` | Tabla con BER, errores, integridad | calculating, ready |
| `<BERChart>` | Gráfica Recharts BER vs `p` | empty, populated, streaming |
| `<DownloadButton>` | Genera Blob URL y dispara descarga | enabled, disabled |
| `<Toast>` | Notificaciones de error/éxito | hidden, visible |

### 9.3 Paleta de colores semántica

| Tipo de bit | Color | Hex | Uso |
|---|---|---|---|
| Bit de dato (info) | Gris claro | `#E5E7EB` | Fondo |
| Bit de redundancia/paridad | Azul | `#3B82F6` | Bits añadidos por encoder |
| Bit alterado por canal | Rojo | `#EF4444` | Bits con error |
| Bit corregido por decoder | Verde | `#22C55E` | Errores corregidos |
| Bit no corregido | Naranja | `#F97316` | Errores residuales |

### 9.4 Comportamiento responsive

- **Desktop (≥ 1280px)** — Layout en grid 3x2 para los paneles de visualización.
- **Tablet (768–1279px)** — Grid 2x3, panel de controles colapsable en sidebar.
- **Mobile (< 768px)** — Stack vertical, advertencia: "Para mejor experiencia usa una pantalla mayor".

### 9.5 Estados de carga y feedback

- Procesamientos > 500 ms → `<ProgressBar>` con porcentaje.
- Procesamientos < 500 ms → `<Spinner>` simple.
- Errores → `<Toast>` rojo, top-right, auto-dismiss 5s.
- Éxito → `<Toast>` verde, auto-dismiss 3s.

---

## 10. Technical Considerations

### 10.1 Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework UI | **React 18** | Componentización, hooks, concurrencia. |
| Lenguaje | **TypeScript 5** | Type safety en operaciones bit a bit. |
| Build tool | **Vite 5** | HMR rápido, tree-shaking, soporte nativo TSX + Web Workers. |
| Styling | **Tailwind CSS 3** | Utility-first, consistente con paleta semántica. |
| Componentes UI | **shadcn/ui** | Componentes accesibles (WCAG AA), sin lock-in. |
| Charts | **Recharts** | Integración nativa con React, performance aceptable. |
| State management | **Zustand** | Liviano, sin boilerplate, ideal para SPA pequeña. |
| Testing unit | **Vitest** | Compatible con Vite, sintaxis Jest. |
| Testing E2E | **Playwright** | Multi-browser, soporte de Web Workers. |
| Workers | **Web Workers API + Comlink** | Procesamiento bit a bit fuera del main thread. |
| Hash | **Web Crypto API (`crypto.subtle`)** | Nativo, SHA-256, sin dependencias. |
| Lint/Format | **ESLint + Prettier** | Estándar de la industria. |

> **Assumption:** El usuario no especificó stack — se asume Vite por sobre Next.js (no se necesita SSR para una herramienta puramente client-side).

### 10.2 Estructura de carpetas

```
channel-coding-visualizer/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── FileDropzone.tsx
│   │   ├── BitStreamViewer.tsx
│   │   ├── AlgorithmSelector.tsx
│   │   ├── CodeRateSelect.tsx
│   │   ├── BSCSlider.tsx
│   │   ├── PatternInjector.tsx
│   │   ├── MetricsPanel.tsx
│   │   ├── BERChart.tsx
│   │   └── ui/                  # shadcn/ui primitives
│   ├── hooks/
│   │   ├── useChannelPipeline.ts
│   │   └── useFileLoader.ts
│   ├── lib/
│   │   ├── encoders/
│   │   │   ├── HammingEncoder.ts
│   │   │   ├── ConvolutionalEncoder.ts
│   │   │   └── types.ts
│   │   ├── decoders/
│   │   │   ├── HammingDecoder.ts
│   │   │   └── ViterbiDecoder.ts
│   │   ├── channel/
│   │   │   ├── BSC.ts
│   │   │   └── PatternInjector.ts
│   │   ├── bitstream/
│   │   │   ├── BitArray.ts
│   │   │   └── fileToBits.ts
│   │   └── metrics/
│   │       ├── ber.ts
│   │       └── hash.ts
│   ├── workers/
│   │   ├── encoder.worker.ts
│   │   └── decoder.worker.ts
│   ├── store/
│   │   └── pipelineStore.ts     # Zustand
│   └── types/
│       └── index.ts
├── tests/
│   ├── unit/
│   └── e2e/
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 10.3 Modelo de datos (TypeScript)

```typescript
// Core types
type CodeRate = "1/2" | "2/3" | "3/4" | "5/6" | "7/8";
type Algorithm = "hamming" | "convolutional";
type BitType = "data" | "parity" | "altered" | "corrected" | "uncorrected";

interface BitArray {
  bits: Uint8Array;          // packed: 8 bits per byte
  length: number;            // bit count (not byte count)
  metadata?: Map<number, BitType>;
}

interface ChannelConfig {
  mode: "bsc" | "pattern";
  bscProbability?: number;        // 0..0.5
  pattern?: { sequence: string; position: number };
}

interface PipelineResult {
  original: BitArray;
  encoded: BitArray;
  received: BitArray;
  decoded: BitArray;
  metrics: {
    berPreDecode: number;
    berPostDecode: number;
    errorsCorrected: number;
    errorsUncorrected: number;
    integrity: boolean;
    originalHash: string;
    decodedHash: string;
    elapsedMs: number;
  };
}
```

### 10.4 Contrato del módulo de codificación

```typescript
interface ChannelCoder {
  readonly algorithm: Algorithm;
  readonly supportedRates: CodeRate[];
  encode(input: BitArray, rate: CodeRate): BitArray;
  decode(received: BitArray, rate: CodeRate): {
    decoded: BitArray;
    correctedPositions: number[];
    uncorrectedPositions: number[];
  };
}
```

Cualquier nuevo código (LDPC, Reed-Solomon) debe implementar esta interfaz sin tocar el UI.

### 10.5 Algoritmos clave

- **Hamming(7,4) extendido (8,4)** — Matriz generadora `G` y matriz de paridad `H` hardcoded. Decoder por síndrome (lookup de 16 entradas).
- **Convolucional (n=2, k=1, K=7)** — Polinomios generadores `G1=171₈`, `G2=133₈` (estándar NASA). Decoder Viterbi hard-decision con traceback de 5K.
- **Puncturing** — Para tasas > 1/2 se aplica patrón estándar (e.g. rate 2/3 → `[1,1; 1,0]`).

### 10.6 Web Workers strategy

- `encoder.worker.ts` — Encoding síncrono delegado al worker para inputs > 100 KB.
- `decoder.worker.ts` — Viterbi siempre en worker (CPU-intensivo).
- Comunicación vía `Comlink` para abstracción RPC.

---

## 11. Dependencies & Integrations

| Dependencia | Versión | Tipo | Propósito |
|---|---|---|---|
| `react` | `^18.3.0` | Runtime | UI |
| `react-dom` | `^18.3.0` | Runtime | DOM bindings |
| `typescript` | `^5.4.0` | Dev | Type checking |
| `vite` | `^5.2.0` | Dev | Build tool |
| `tailwindcss` | `^3.4.0` | Runtime (build) | Styling |
| `zustand` | `^4.5.0` | Runtime | State management |
| `recharts` | `^2.12.0` | Runtime | BER chart |
| `comlink` | `^4.4.0` | Runtime | Web Worker RPC |
| `clsx`, `tailwind-merge` | `^2.x` | Runtime | Class composition |
| `lucide-react` | `^0.400.0` | Runtime | Iconos |
| `vitest` | `^1.5.0` | Dev | Unit tests |
| `@playwright/test` | `^1.44.0` | Dev | E2E tests |
| `@axe-core/playwright` | `^4.9.0` | Dev | Auditoría accesibilidad |

**Servicios externos:** Ninguno. La aplicación es completamente offline-capable post-carga inicial.

> **Assumption:** No se requiere integración con LMS (Moodle, Canvas) en MVP. Si se requiere, se añadiría export SCORM en iteración 2.

---

## 12. Success Metrics & KPIs

| Métrica | Baseline | Target (3 meses post-launch) | Método de medición |
|---|---|---|---|
| **Sesiones únicas/semana** | 0 | ≥ 200 | Plausible Analytics (privacy-friendly) |
| **Tasa de completitud del flujo principal** | N/A | ≥ 60% | Eventos custom (carga → decode → download) |
| **Tiempo promedio por sesión** | N/A | ≥ 4 min | Plausible |
| **Errores JS en producción** | N/A | < 0.5% de sesiones | Sentry (sin telemetría de contenido) |
| **Lighthouse Performance Score** | N/A | ≥ 85 | CI en cada PR |
| **Lighthouse Accessibility Score** | N/A | ≥ 95 | CI en cada PR |
| **Cobertura de tests unitarios** | 0% | ≥ 80% | Vitest coverage report |
| **Bug reports/semana (post-launch)** | N/A | ≤ 3 | GitHub Issues |

> **Assumption:** No se monetiza el producto. Métricas centradas en uso académico, no en revenue.

---

## 13. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Procesamiento de video MP4 (decoding bit a bit) bloquea el navegador | Alto | Alto | Limitar tamaño a 5 MB para video; procesar en chunks vía Web Worker con `<ProgressBar>`. |
| Implementación incorrecta de Viterbi (bug sutil) produce decoding erróneo | Alto | Medio | Test suite con vectores de prueba conocidos (estándar IEEE) + fuzzing con `fast-check`. |
| Diferencias de comportamiento entre Safari y Chrome en Web Crypto/Workers | Medio | Medio | CI multi-browser con Playwright; fallback a algoritmo síncrono si Worker falla. |
| Usuario carga archivo malicioso (zip-bomb disfrazado) | Medio | Bajo | Validar MIME + magic bytes + tamaño máximo antes de procesar. |
| Visualización de 50K+ bits satura el DOM | Alto | Alto | Renderizar solo "ventana visible" (primeros 256 bits) + virtualización con `react-window` si se requiere ver completo. |
| Recharts tiene mala performance con > 10K puntos en BER vs p | Medio | Medio | Down-sample a 100 puntos para la gráfica; debounce slider a 300 ms. |
| Estudiantes esperan ver el archivo decodificado idéntico aunque haya errores no corregidos | Medio | Alto | UI explícita: mostrar diff visual y advertencia "Integridad fallida" en lugar de éxito silencioso. |
| Dependencias npm con vulnerabilidades CVE | Bajo | Medio | Dependabot + `npm audit` en CI. |
| Memoria del navegador se llena con archivos grandes | Alto | Medio | Liberar `Uint8Array` con `null` post-procesamiento; advertencia si `performance.memory.usedJSHeapSize` > 500 MB. |

---

## 14. Milestones & Phasing

### 14.1 MVP (Sprint 1–3, ~6 semanas)

- Carga de archivos `.txt` y `.png`.
- Hamming(7,4) extendido encoder/decoder.
- BSC + inyección de patrón.
- Visualización de 5 paneles con resaltado de colores.
- Métricas: BER, errores corregidos, hash SHA-256.
- Descarga de artefactos.

### 14.2 Iteración 2 (Sprint 4–5, ~4 semanas)

- Soporte para `.wav`, `.mp3`, `.jpg`.
- Código convolucional + Viterbi.
- Puncturing para tasas `2/3`, `3/4`, `5/6`, `7/8`.
- `<BERChart>` interactivo.
- Web Workers para procesamiento pesado.

### 14.3 Iteración 3 (Sprint 6–7, ~4 semanas)

- Soporte para `.mp4` (limitado a 5 MB).
- Vista `<ComparisonView>` Hamming vs. Convolucional.
- Internacionalización (en/es).
- Auditoría accesibilidad WCAG AA completa.

### 14.4 Futuras (backlog)

- LDPC, Reed-Solomon, Turbo codes.
- Modo "tutorial guiado" paso a paso.
- Export de sesión a JSON para reproducibilidad.
- Modo colaborativo (WebRTC peer-to-peer).

---

## 15. Open Questions

| # | Pregunta | Bloquea | Responsable sugerido |
|---|---|---|---|
| 1 | ¿La paleta de colores es accesible para daltónicos (deuteranopia)? Validar con simulador. | UX final | Diseñador UX |
| 2 | ¿Se requiere soporte offline completo vía Service Worker / PWA? | Iteración 2 | Product Owner |
| 3 | ¿Es aceptable limitar video a 5 MB o se necesita streaming chunked? | Iteración 3 | Stakeholder técnico |
| 4 | ¿El hash de integridad debe ser SHA-256 o un CRC32 más rápido es suficiente didácticamente? | MVP | Asesor académico |
| 5 | ¿Plausible Analytics es aceptable, o se requiere 0 analytics por política institucional? | MVP launch | Legal / IT |
| 6 | ¿Se quiere soporte para soft-decision Viterbi en futuras iteraciones, o hard-decision basta? | Iteración 2 | Asesor académico |
| 7 | ¿La aplicación se despliega en GitHub Pages, Vercel, o servidor propio universitario? | MVP launch | DevOps |

---

## 16. Assumptions

> Lista consolidada de todas las suposiciones marcadas en el documento.

- **A1** — El usuario quiere una aplicación 100% client-side (sin backend), inferido del contexto educativo y la sensibilidad de no enviar archivos.
- **A2** — El stack target es React + TypeScript + Vite (no Next.js), por ausencia de necesidades SSR.
- **A3** — Los algoritmos elegidos (Hamming extendido + Convolucional con Viterbi hard-decision) se implementan desde cero, sin librerías caja negra, manteniendo el espíritu del prompt original.
- **A4** — El límite de 50 MB por archivo (5 MB para video) es razonable dada la memoria típica de navegador; ajustar si se valida demanda contraria.
- **A5** — No hay backend ni autenticación; cada sesión es efímera.
- **A6** — No hay monetización; métricas de éxito son académicas, no comerciales.
- **A7** — Internacionalización limitada a en/es; otros idiomas son backlog.
- **A8** — Plausible Analytics (privacy-friendly, sin cookies) es aceptable; si no, se elimina toda telemetría.
- **A9** — El despliegue será estático (Vercel/GitHub Pages); no se requiere infraestructura backend.
- **A10** — El usuario referenciado en el prompt original es el mismo perfil técnico (estudiante/docente de telecomunicaciones).
- **A11** — No se necesita integración con LMS (Moodle, Canvas, SCORM) en MVP.
- **A12** — La paleta de colores propuesta cumple WCAG AA, pendiente validación con daltónicos.

---

**Próximo paso recomendado tras aprobación:** crear el repositorio, hacer scaffolding con `npm create vite@latest channel-coding-visualizer -- --template react-ts`, configurar Tailwind + shadcn/ui, y comenzar Sprint 1 escribiendo primero los tests unitarios de `HammingEncoder` y `BitArray` (TDD).