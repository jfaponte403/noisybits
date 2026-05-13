# Proyecto: Channel Coding Visualizer (LDPC Focus)

SPA educativa para la visualización paso a paso del algoritmo de codificación de canal **LDPC (Low-Density Parity-Check)**. El proyecto permite cargar archivos, aplicarles ruido y observar el proceso de corrección de errores en tiempo real, todo ejecutado localmente en el navegador.

## 🚀 Tecnologías Principales

- **Frontend:** React 18 + TypeScript + Vite 5.
- **Algoritmo:** LDPC (Implementación personalizada de Bit-Flipping).
- **Estado:** Zustand (gestión de pipeline y configuración).
- **Estilos:** Vanilla CSS con sistema de diseño basado en tokens (ver `src/index.css` y `docs/prd/look-and-feel.md`).
- **Paralelismo:** Web Workers vía `comlink` para procesos LDPC intensivos.

## 🛠️ Comandos Clave

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite. |
| `npm run build` | Construye la aplicación para producción. |

## 🏗️ Estructura del Proyecto

- `src/lib/encoders/LDPC.ts`: Implementación única del algoritmo LDPC.
- `src/lib/pipeline.ts`: Orquestador del flujo especializado para LDPC.
- `src/workers/`: Workers para procesamiento asíncrono de codificación/decodificación.

## 📐 Convenciones de Desarrollo

1.  **LDPC Único:** La aplicación está diseñada exclusivamente para LDPC. No añadir otros algoritmos (Hamming, Viterbi) para mantener el enfoque pedagógico.
2.  **Look & Feel:** Dark-mode únicamente. Seguir estrictamente las variables de color definidas en `src/index.css`.
3.  **Performance:** Los cálculos pesados deben ir en Workers.
4.  **Idioma:** El código en inglés, la UI y documentación en español.
