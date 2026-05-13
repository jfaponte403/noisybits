# Channel Coding Visualizer (LDPC Focus)

SPA educativa interactiva para explorar el funcionamiento de los códigos **LDPC (Low-Density Parity-Check)**.

## Características

- **Algoritmo LDPC:** Implementación personalizada de codificación (Matriz G) y decodificación (Bit-Flipping iterativo).
- **Dos Modos:**
  - **Codificar:** Carga un archivo y observa cómo se añade redundancia.
  - **Decodificar:** Aplica ruido a una señal y observa el proceso iterativo de corrección.
- **Visualización en Tiempo Real:** Rejilla de bits con estados coloreados (datos, redundancia, alterados, corregidos).
- **Privacidad:** 100% ejecución en el navegador.

## Desarrollo

```bash
npm install
npm run dev
npm run build
```

## Arquitectura

- **React + Vite** para la interfaz.
- **Zustand** para el estado global.
- **Web Workers** para el procesamiento paralelo de bits.
- **Vanilla CSS** para el sistema de diseño "instrumento de laboratorio".
