# Fractal Explorer

A GPU-accelerated **Mandelbrot and Julia set** explorer. Every pixel's escape-time iteration runs in a WebGL fragment shader, so you can pan and zoom into the boundary's infinite detail in real time.

**▶ Live:** https://andreaisabelmontana.github.io/fractal-explorer/

> **Not an original idea.** This recreates the concept of an existing project — I didn't invent it. I rebuilt it from scratch, my own way, out of curiosity about how it actually works (and tried to make it a little better along the way).

## Features

- **Mandelbrot** and **Julia** sets, computed on the GPU
- **Smooth (continuous) iteration colouring** — no concentric banding
- Four cosine-based palettes (Ember / Ice / Electric / Botanical)
- Scroll to **zoom toward the cursor**, drag to pan, pinch on touch
- Adjustable max iterations (50–1000) to trade detail for speed as you dive
- **Shift-click** any point of the Mandelbrot set to spawn the Julia set seeded at that complex value

## Tech

Vanilla JS + raw WebGL. A single full-screen triangle is rasterised and the fragment shader does all the work. No build step, no dependencies.

```
index.html
styles.css
src/shader.js   # GLSL vertex + fragment (escape-time, smooth colouring, palettes)
src/main.js     # GL setup, uniforms, pan/zoom/pinch, controls
```

> Note: single-precision floats limit how far you can zoom before pixelation — typical for browser fractal explorers.

## License

MIT — see [LICENSE](LICENSE).
