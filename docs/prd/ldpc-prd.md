# PRD — LDPC Encoder/Decoder Educational Web App

**Producto:** Extensión de aplicación React existente para codificación/decodificación LDPC con visualización paso a paso.
**Versión:** 1.0
**Autor:** Senior PM
**Estado:** Draft listo para implementación

---

## 1. Overview

Extender una aplicación React existente para implementar codificación y decodificación con el algoritmo **Low-Density Parity-Check (LDPC)** sobre archivos arbitrarios (texto, imagen, audio, video, PDF, binario genérico). La aplicación expone el proceso matemático paso a paso (matrices `G`, `H`, operaciones XOR, síndrome, iteraciones de corrección) con fines educativos, exporta el resultado codificado a `.txt`, y permite recargar dicho archivo para decodificación y pruebas de tolerancia a errores mediante edición manual de bits.

> **Assumption:** La aplicación React existente usa un stack moderno (React 18+, Vite o CRA, TypeScript opcional) y dispone de routing y layout base. Esta feature se agregará como nuevo módulo/ruta sin reemplazar la app actual.

---

## 2. Problem Statement

Los códigos LDPC son fundamentales en estándares de comunicación modernos (Wi-Fi 6, 5G, DVB-S2, almacenamiento NAND), pero su enseñanza adolece de herramientas interactivas. Las implementaciones educativas existentes:

- Son scripts CLI sin visualización de matrices ni del proceso iterativo.
- Trabajan únicamente sobre strings cortos, no archivos reales.
- No permiten experimentar con **tolerancia a errores** manipulando bits manualmente.
- No exponen la matemática (XORs, síndrome, belief propagation) de manera escaneable.

Se requiere una herramienta única que combine **funcionalidad real** (encode/decode de archivos binarios) con **transparencia matemática** (visualización paso a paso) para uso en cursos de teoría de la información, error-correcting codes y comunicaciones digitales.

> **Assumption:** El público principal es académico/educativo, no producción en tiempo real. No se requieren throughputs de Mbps ni decodificación hardware-accelerated.

---

## 3. Goals & Non-Goals

### Goals (In-Scope)

- **G-1:** Codificar archivos arbitrarios con LDPC y exportar el resultado a `.txt` con formato legible (bloques separados por espacios y saltos de línea).
- **G-2:** Recargar el `.txt` generado y reconstruir el archivo binario original mediante decodificación iterativa LDPC.
- **G-3:** Permitir al usuario seleccionar dinámicamente la tasa de codificación: `1/2`, `2/3`, `3/4` y al menos una tasa adicional configurable.
- **G-4:** Visualizar paso a paso el proceso de codificación: bits originales → bloques → multiplicación por `G` → bits de paridad → palabra codificada.
- **G-5:** Visualizar el proceso de decodificación: cálculo de síndrome `s = H·yᵀ`, iteraciones de corrección (belief propagation o bit-flipping), convergencia.
- **G-6:** Permitir al usuario alterar manualmente bits del archivo codificado y observar si LDPC recupera el mensaje original.
- **G-7:** Mostrar matrices `G` y `H` renderizadas visualmente (no solo texto plano).

### Non-Goals (Out-of-Scope)

- **NG-1:** Implementación hardware o aceleración por WebGPU/WASM en MVP.
- **NG-2:** Soporte para múltiples algoritmos de FEC (Turbo, Reed-Solomon, Polar). Solo LDPC.
- **NG-3:** Decodificación en streaming/tiempo real para archivos > 10 MB en MVP.
- **NG-4:** Persistencia en backend o cuenta de usuario; la app es 100% client-side.
- **NG-5:** Generación automática de matrices LDPC optimizadas (PEG, MacKay constructions); se usarán matrices preconstruidas o generadas pseudoaleatoriamente.
- **NG-6:** Internacionalización (i18n) en MVP.

---

## 4. Target Users & Personas

| Persona | Rol | Contexto de Uso | Necesidades Clave |
|---|---|---|---|
| **Estudiante de Telecom** | Universitario, 3er-5to año | Tarea de laboratorio sobre FEC | Visualizar matemática, experimentar con tasas, ver qué pasa al introducir errores |
| **Profesor / TA** | Docente de teoría de la información | Demo en clase / material didáctico | Mostrar proceso completo proyectable, exportar resultados reproducibles |
| **Ingeniero curioso** | Profesional con base técnica | Auto-aprendizaje sobre LDPC | Procesar archivos reales, entender trade-off tasa vs. robustez |
| **Investigador junior** | Maestrante en comunicaciones | Prototipado conceptual | Manipular parámetros, validar intuiciones antes de implementar en MATLAB/Python |

---

## 5. User Stories

- **US-1:** *As a* estudiante, *I want* cargar un archivo de imagen y verlo codificado paso a paso, *so that* entiendo cómo LDPC transforma datos reales y no solo strings teóricos.
- **US-2:** *As a* profesor, *I want* cambiar la tasa de codificación desde la UI y ver cómo cambian `G` y `H`, *so that* puedo mostrar el trade-off overhead vs. robustez en clase.
- **US-3:** *As a* estudiante, *I want* exportar el archivo codificado como `.txt`, *so that* puedo entregarlo como evidencia de tarea o compartirlo.
- **US-4:** *As a* investigador, *I want* recargar un `.txt` codificado y decodificarlo, *so that* verifico la simetría encode/decode.
- **US-5:** *As a* estudiante, *I want* editar bits específicos del archivo codificado y reintentar la decodificación, *so that* compruebo empíricamente el límite de corrección de errores de LDPC.
- **US-6:** *As a* docente, *I want* visualizar el síndrome y las iteraciones de decodificación, *so that* puedo explicar visualmente la belief propagation.
- **US-7:** *As a* usuario, *I want* ver las matrices `G` y `H` renderizadas, *so that* puedo verificar manualmente operaciones binarias en bloques pequeños.

---

## 6. Functional Requirements

### Entrada y Procesamiento

- **FR-1:** El sistema DEBE aceptar como input archivos de los siguientes tipos vía `<input type="file">` o drag-and-drop: `image/*`, `video/*`, `audio/*`, `text/*`, `application/pdf`, `application/octet-stream`.
- **FR-2:** El sistema DEBE convertir el archivo cargado a una secuencia de bits leyendo bytes con `FileReader.readAsArrayBuffer` y expandiendo cada byte a 8 bits (MSB-first).
- **FR-3:** El sistema DEBE almacenar metadata del archivo original (nombre, MIME type, tamaño en bytes, longitud en bits, padding aplicado) en el header del `.txt` exportado para reconstrucción exacta en decodificación.
- **FR-4:** El sistema DEBE dividir los bits en bloques de tamaño `k` definido por la tasa seleccionada (donde `k` es la dimensión de mensaje en `G [k × n]`), aplicando zero-padding al último bloque y registrando la cantidad de padding.

### Codificación LDPC

- **FR-5:** El sistema DEBE generar o cargar matrices `G [k × n]` y `H [(n-k) × n]` consistentes (`G · Hᵀ = 0 mod 2`) para cada tasa soportada.
- **FR-6:** El sistema DEBE codificar cada bloque mensaje `m` como `c = m · G mod 2`, produciendo una palabra código de longitud `n`.
- **FR-7:** El sistema DEBE soportar al menos las tasas: `1/2`, `2/3`, `3/4`, y permitir agregar tasas custom mediante selector configurable (`(n, k)` parametrizable).
- **FR-8:** El sistema DEBE permitir cambiar la tasa **antes** de iniciar la codificación; cambiar la tasa después invalida el proceso y requiere reiniciar.

> **Assumption:** Para MVP se usan matrices LDPC predefinidas/pseudoaleatorias con `n ≤ 512` (no se requieren matrices certificadas de estándares como DVB-S2). Esto se documenta en la sección Open Questions.

### Decodificación LDPC

- **FR-9:** El sistema DEBE aceptar como input un archivo `.txt` con el formato definido en FR-15 vía carga de archivo.
- **FR-10:** El sistema DEBE calcular el síndrome `s = H · yᵀ mod 2` para cada bloque recibido `y`.
- **FR-11:** El sistema DEBE implementar decodificación iterativa mediante **bit-flipping** (MVP) o **sum-product / belief propagation** (Fase 2), iterando hasta que `s = 0` o se alcance un máximo de iteraciones configurable (default: 50).
- **FR-12:** El sistema DEBE reconstruir el archivo original concatenando los bloques mensaje decodificados, removiendo el padding registrado y reagrupando en bytes según el MIME type original.
- **FR-13:** El sistema DEBE ofrecer descarga del archivo decodificado con su nombre y MIME type originales.

### Exportación e Importación de `.txt`

- **FR-14:** El sistema DEBE exportar el resultado codificado como archivo `.txt` descargable vía `Blob` + `URL.createObjectURL`.
- **FR-15:** El archivo `.txt` exportado DEBE seguir el formato:
  ```
  # LDPC-ENCODED-FILE v1
  # filename: <nombre_original>
  # mime: <mime_type>
  # original_bits: <int>
  # rate: <p/q>
  # n: <int>
  # k: <int>
  # padding_bits: <int>
  # matrix_id: <hash o seed de G/H>
  ---
  10110101 01010101 11100011
  00101010 11110000 10101010
  ...
  ```
  Donde cada línea contiene una o más palabras código separadas por espacios; los bits son ASCII `0`/`1`.

### Visualización Educativa

- **FR-16:** El sistema DEBE mostrar, para cada bloque durante codificación: (a) bits originales del mensaje, (b) representación visual de `G`, (c) operación `m·G` con XORs resaltados, (d) bits de paridad resultantes, (e) palabra código final.
- **FR-17:** El sistema DEBE mostrar, para cada bloque durante decodificación: (a) palabra recibida `y`, (b) matriz `H`, (c) cálculo de síndrome con XORs resaltados, (d) cada iteración del decodificador con bits modificados resaltados, (e) palabra corregida final.
- **FR-18:** El sistema DEBE renderizar matrices `G` y `H` como tablas HTML/canvas con celdas binarias coloreadas (0 = neutro, 1 = acento), con tamaño máximo visible 32×32 (matrices mayores muestran scroll o vista resumida con muestreo).
- **FR-19:** El sistema DEBE permitir navegación paso a paso (botones Anterior/Siguiente) y reproducción automática (play/pause) por las etapas de codificación/decodificación de cada bloque.

### Pruebas de Tolerancia a Errores

- **FR-20:** El sistema DEBE proveer una vista de "Editor de Errores" donde el usuario puede ver el archivo codificado en forma binaria y clickear bits individuales para invertirlos (flip 0↔1).
- **FR-21:** El sistema DEBE mostrar un contador en vivo de "bits modificados" y, opcionalmente, la distancia de Hamming respecto al codificado original.
- **FR-22:** El sistema DEBE permitir reintentar la decodificación tras la edición y reportar: (a) si la decodificación convergió, (b) cuántas iteraciones tomó, (c) si el archivo reconstruido coincide bit-a-bit con el original (verificación por hash SHA-256 del archivo original almacenado en sesión).
- **FR-23:** El sistema DEBE ofrecer un modo "Inyección automática de errores" con slider de BER (Bit Error Rate) entre 0% y 20% para introducir errores aleatorios.

---

## 7. Non-Functional Requirements

| ID | Categoría | Requisito |
|---|---|---|
| **NFR-1** | Performance | Codificar un archivo de 1 MB con tasa 1/2 en ≤ 10 segundos en una laptop estándar (Intel i5 8th gen, 8 GB RAM, Chrome). |
| **NFR-2** | Performance | Render de matriz `G` o `H` de hasta 64×128 en ≤ 200 ms tras seleccionar tasa. |
| **NFR-3** | Performance | Cómputo de operaciones por bloque (un paso de codificación o una iteración de decodificación) ejecutado fuera del main thread vía Web Worker para mantener UI responsiva (interacciones < 100 ms). |
| **NFR-4** | Escalabilidad | Soporte archivos hasta 5 MB en MVP; archivos > 5 MB muestran warning y permiten continuar con advertencia de tiempo. |
| **NFR-5** | Compatibilidad | Funcionar en Chrome ≥ 110, Firefox ≥ 110, Edge ≥ 110, Safari ≥ 16 (desktop). |
| **NFR-6** | Accesibilidad | Cumplir WCAG 2.1 nivel AA: contraste mínimo 4.5:1, navegación por teclado en todos los controles, ARIA labels en visualizaciones de matrices. |
| **NFR-7** | Seguridad | Procesamiento 100% client-side; ningún archivo del usuario se envía a un servidor. |
| **NFR-8** | Usabilidad | El usuario puede completar el flujo encode → export → reload → decode sin documentación externa en ≤ 5 minutos en su primera sesión. |
| **NFR-9** | Mantenibilidad | Lógica LDPC (matrices, encode, decode) aislada en módulo TypeScript independiente con cobertura de tests unitarios ≥ 80%. |
| **NFR-10** | Observabilidad | Logging local (consola y panel de debug toggle) con métricas: tiempo de codificación, iteraciones de decodificación, tasa de éxito de corrección. |

---

## 8. User Flows

### Flow A: Codificación y Exportación

1. Usuario entra a la ruta `/ldpc`.
2. Usuario selecciona tasa de codificación (`1/2` por default) desde dropdown.
3. Usuario carga un archivo vía drag-and-drop o file picker.
4. Sistema valida tipo y tamaño; muestra metadata (nombre, tamaño, bits totales, bloques resultantes).
5. Usuario hace clic en "Codificar".
6. Sistema codifica bloque por bloque mostrando la visualización paso a paso (FR-16).
7. Al finalizar, sistema muestra resumen: bits originales, bits codificados, overhead %, tiempo total.
8. Usuario hace clic en "Exportar .txt"; archivo se descarga.

### Flow B: Decodificación

1. Usuario navega a la pestaña "Decodificar".
2. Usuario carga el archivo `.txt` previamente exportado.
3. Sistema parsea header, valida formato y reconstruye parámetros LDPC (`n`, `k`, matriz).
4. Sistema muestra preview de los bloques cargados.
5. Usuario hace clic en "Decodificar".
6. Sistema ejecuta decodificación iterativa mostrando síndrome y iteraciones (FR-17).
7. Al finalizar, sistema ofrece descarga del archivo reconstruido y reporta estado (éxito / fallo de convergencia).

### Flow C: Pruebas de Tolerancia a Errores

1. Tras Flow A, usuario navega a "Editor de Errores".
2. Sistema muestra el codificado en grilla bit-a-bit.
3. Usuario invierte bits manualmente o usa slider de BER para inyección aleatoria.
4. Usuario hace clic en "Decodificar con errores".
5. Sistema ejecuta decodificación; muestra iteraciones, bits corregidos resaltados.
6. Sistema reporta: convergencia (sí/no), match con original (sí/no vía hash), nº de iteraciones.
7. Usuario puede aumentar errores y repetir hasta encontrar el umbral de fallo.

---

## 9. UX / UI Considerations

### Layout General

- Aplicación tabbed: **[Codificar]** | **[Decodificar]** | **[Pruebas de Error]** | **[Acerca de LDPC]**.
- Panel lateral izquierdo: configuración (tasa, parámetros, controles de reproducción).
- Panel central: visualización principal (bloques, matrices, animaciones).
- Panel inferior: logs, métricas, estado de proceso.

### Componentes Clave

- **`<RateSelector />`**: dropdown con tasas `1/2`, `2/3`, `3/4`, "Custom...".
- **`<FileDropzone />`**: zona de drag-and-drop con preview de metadata.
- **`<MatrixViewer />`**: grilla scrollable para `G` y `H`, celdas binarias con tooltip por celda.
- **`<BlockStepper />`**: navegador de bloques con controles play/pause/prev/next/speed.
- **`<XOROperationViewer />`**: muestra `m · G` fila por fila, resaltando bits XOR'd.
- **`<SyndromeDisplay />`**: muestra `H · yᵀ` con cada bit del síndrome calculado.
- **`<BitEditor />`**: grilla de bits clickeables para Flow C, con highlight de bits modificados.
- **`<IterationTimeline />`**: timeline horizontal mostrando cada iteración de bit-flipping/BP.

### Estados de UI

- **Idle**: sin archivo cargado, CTA principal "Cargar archivo".
- **Loaded**: archivo cargado, metadata visible, botón "Codificar" habilitado.
- **Processing**: barra de progreso, animaciones de bloques, botón "Pausar".
- **Complete**: resumen con métricas, CTAs "Exportar" / "Probar con errores".
- **Error**: mensaje claro con causa (archivo demasiado grande, formato inválido, etc.).

### Responsive

> **Assumption:** Desktop-first. Mobile (< 768px) muestra layout en stack vertical con matrices comprimidas (muestreo) y advertencia de "Mejor experiencia en desktop". Tablets (768–1024px) layout intermedio.

---

## 10. Technical Considerations

### Stack Sugerido

- **Framework:** React 18+ (asumido del proyecto existente).
- **Lenguaje:** TypeScript (recomendado para tipado de matrices y bloques).
- **State management:** Zustand o React Context (no se requiere Redux por simplicidad del scope).
- **Cómputo pesado:** Web Workers (`comlink` para ergonomía) para encode/decode sin bloquear UI.
- **Matrices binarias:** Representación con `Uint8Array` o `BigInt64Array` empaquetadas (8 bits por byte) para eficiencia.
- **Renderizado de matrices:** SVG para matrices ≤ 32×32, Canvas para tamaños mayores.
- **Hashing:** `crypto.subtle.digest('SHA-256', ...)` nativo para verificación de match.

### Módulo LDPC Core (estructura sugerida)

```
src/ldpc/
├── matrices.ts          # generación y carga de G, H
├── encoder.ts           # m · G mod 2
├── decoder.ts           # bit-flipping + síndrome
├── decoder-bp.ts        # belief propagation (Fase 2)
├── bitops.ts            # XOR, packing, utilidades
├── file-codec.ts        # bytes ↔ bits ↔ bloques
└── __tests__/
```

### Contratos de Datos

```typescript
type LDPCRate = '1/2' | '2/3' | '3/4' | { n: number; k: number };

interface LDPCParams {
  n: number;              // longitud palabra código
  k: number;              // longitud mensaje
  G: Uint8Array;          // [k × n] empaquetada
  H: Uint8Array;          // [(n-k) × n] empaquetada
  matrixId: string;       // hash determinístico
}

interface EncodedFile {
  version: '1';
  filename: string;
  mime: string;
  originalBits: number;
  rate: string;
  n: number;
  k: number;
  paddingBits: number;
  matrixId: string;
  codewords: Uint8Array[];  // cada uno de longitud n
}

interface DecodeResult {
  ok: boolean;
  iterations: number;
  bitsCorrected: number;
  reconstructed: Blob;
  hashMatch: boolean;
}
```

> **Assumption:** El proyecto usa Vite. Si usa Webpack/CRA, los Web Workers requerirán configuración adicional (worker-loader).

---

## 11. Dependencies & Integrations

| Dependencia | Tipo | Uso | Notas |
|---|---|---|---|
| React 18+ | Framework | Base UI | Existente |
| TypeScript | Lenguaje | Tipado | Recomendado |
| Zustand | Librería estado | State global | Liviano, ~1KB |
| Comlink | Librería | Web Worker RPC | Opcional pero útil |
| Tailwind CSS o existente | Estilos | UI | Depende del proyecto base |
| Vitest / Jest | Testing | Unit tests core LDPC | Coverage ≥ 80% |
| Playwright | Testing | E2E de flujos | Opcional Fase 2 |

> **Assumption:** No se requieren librerías LDPC de terceros (e.g., `ldpc-js`); la implementación será propia para fines educativos y para garantizar control sobre la visualización paso a paso. Si se prioriza time-to-market, una librería existente debe evaluarse en Open Questions.

---

## 12. Success Metrics & KPIs

| Métrica | Baseline | Target MVP | Método de Medición |
|---|---|---|---|
| **Tasa de éxito encode→export→reload→decode** | N/A | ≥ 99% para archivos < 5 MB | Test E2E automatizado con 50 archivos diversos |
| **Tiempo medio de codificación (1 MB, tasa 1/2)** | N/A | ≤ 10 s | Telemetría local |
| **Coverage tests LDPC core** | 0% | ≥ 80% | Vitest/Jest coverage report |
| **Convergencia decodificación sin errores** | N/A | 100% | Test unitario sobre 1000 bloques aleatorios |
| **Corrección de errores a BER 1%** | N/A | ≥ 95% bloques decodificados correctamente | Test estadístico con BER controlado |
| **Tasa de completación del flujo principal (usabilidad)** | N/A | ≥ 80% en 5 min sin ayuda | Test de usuario con 5 estudiantes |
| **Errores en producción (consola)** | N/A | 0 errores críticos por sesión | Logs locales / reportes manuales |

> **Assumption:** No hay métricas previas; baseline es N/A (feature nueva).

---

## 13. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Cómputo de LDPC bloquea la UI en archivos grandes | Alto | Alta | Web Workers obligatorios (NFR-3); progress reporting; cap de tamaño en MVP (5 MB). |
| Implementación incorrecta de matrices (G·Hᵀ ≠ 0) produce decodificación rota | Alto | Media | Tests unitarios que validen `G·Hᵀ = 0 mod 2` para cada tasa generada; matrices fijas para MVP. |
| Belief propagation complejo retrasa el MVP | Medio | Alta | MVP usa bit-flipping (más simple); BP se difiere a Fase 2. |
| Visualización de matrices grandes (n=512+) degrada performance | Medio | Media | Render con Canvas + muestreo visual; matrices > 64×128 se muestran resumidas con opción "ver completa". |
| Archivos binarios mal reconstruidos por bug de packing/padding | Alto | Media | Hash SHA-256 verifica match round-trip; tests con archivos reales (PNG, MP3, PDF). |
| Usuario edita header del `.txt` y rompe parser | Bajo | Alta | Validación estricta del header con errores claros; checksum del header. |
| Confusión pedagógica por exceso de info en visualización | Medio | Alta | Modo "Simple" (solo bloques + resultado) vs. "Avanzado" (matrices + XORs + iteraciones); toggle UI. |
| Diferencias de navegador en Web Workers o Crypto API | Bajo | Baja | Feature detection y fallback a main thread con warning. |

---

## 14. Milestones & Phasing

### MVP (Fase 1) — 4–6 semanas

- Módulo LDPC core: matrices `G`/`H` predefinidas para `1/2`, `2/3`, `3/4`.
- Encoder funcional (`m · G mod 2`).
- Decoder con **bit-flipping** (no BP aún).
- Carga de archivos (todos los tipos), conversión a bits, packing.
- Export `.txt` con formato definido (FR-15).
- Reload `.txt` y decodificación.
- Visualización **básica** paso a paso: bits originales, matriz G/H, palabra código, síndrome.
- Editor de errores manual (clickear bits).
- Verificación por hash SHA-256.
- Tests unitarios ≥ 80% coverage en core.

### Fase 2 — 3–4 semanas

- Belief Propagation (sum-product) como decodificador alternativo seleccionable.
- Tasas custom configurables desde UI.
- Inyección automática de errores con slider BER.
- Timeline visual de iteraciones.
- Modo "Simple" vs. "Avanzado" en visualización.
- Optimización con Web Workers para archivos > 5 MB.

### Fase 3 — backlog

- Matrices LDPC de estándares reales (DVB-S2, 5G).
- Comparativa lado-a-lado de tasas en un mismo archivo.
- Export del proceso completo (codificación + visualizaciones) como PDF educativo.
- Modo "Quiz" con preguntas sobre el contenido visualizado.

---

## 15. Open Questions

- **OQ-1:** ¿Las matrices `G`/`H` para MVP deben ser **predefinidas y hardcodeadas** (deterministas, reproducibles, ideal para enseñanza), o **generadas pseudoaleatoriamente** con seed configurable? Recomendación PM: predefinidas para MVP, generadas en Fase 2.
- **OQ-2:** ¿Qué tasas custom adicionales priorizar? Candidatos comunes: `5/6`, `7/8`, `1/3`, `1/4`. Definir top 2 con el stakeholder educativo.
- **OQ-3:** ¿Se requiere soporte de archivos > 5 MB en MVP? Esto cambia el alcance de Web Workers y memoria significativamente.
- **OQ-4:** ¿Belief propagation completo (sum-product con LLRs) o variante simplificada (min-sum) en Fase 2?
- **OQ-5:** ¿Debe la app permitir importar matrices `G`/`H` desde archivo externo (e.g., formato Alist de MacKay) en alguna fase?
- **OQ-6:** ¿Hay diseño/branding existente que respetar, o se permite definir un design system para esta feature?
- **OQ-7:** ¿Existe alguna preferencia de licencia para el código (MIT, GPL) considerando uso académico?
- **OQ-8:** ¿Se requiere soporte multi-idioma (ES/EN) en alguna fase, dado el target educativo?

---

## 16. Assumptions (Consolidado)

- **A-1:** La aplicación React existente usa React 18+, stack moderno (Vite/CRA), y permite agregar nuevas rutas/módulos sin refactor mayor.
- **A-2:** El público es académico/educativo; no se requieren throughputs de producción ni hardware acceleration.
- **A-3:** Procesamiento 100% client-side; no hay backend ni persistencia de archivos del usuario.
- **A-4:** Desktop-first; mobile recibe experiencia funcional pero degradada.
- **A-5:** Para MVP se usan matrices LDPC pseudoaleatorias/predefinidas con `n ≤ 512`; no matrices de estándares industriales.
- **A-6:** No se usan librerías LDPC de terceros; implementación propia para control pedagógico.
- **A-7:** TypeScript es preferido aunque el proyecto base sea JavaScript; se justifica por la complejidad del dominio matricial.
- **A-8:** Bit-flipping es el decoder de MVP; belief propagation se difiere a Fase 2.
- **A-9:** Cap de archivos en 5 MB para MVP; archivos mayores muestran advertencia.
- **A-10:** No hay métricas previas (baseline = N/A en todas las KPIs).
- **A-11:** Sin internacionalización en MVP; idioma único (a definir con stakeholder, probablemente español por contexto del input).
- **A-12:** Sin autenticación, accounts ni telemetría remota; logs y métricas son locales.