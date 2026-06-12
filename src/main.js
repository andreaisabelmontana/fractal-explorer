import { VERT, FRAG } from "./shader.js";

const canvas = document.getElementById("stage");
const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
const banner = document.getElementById("nogl");
if (!gl) { banner.style.display = "flex"; throw new Error("WebGL unavailable"); }

// --- compile ---
function shader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);

// full-screen triangle
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, "a_pos");
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

const U = {
  res: gl.getUniformLocation(prog, "u_res"),
  center: gl.getUniformLocation(prog, "u_center"),
  scale: gl.getUniformLocation(prog, "u_scale"),
  maxIter: gl.getUniformLocation(prog, "u_maxIter"),
  mode: gl.getUniformLocation(prog, "u_mode"),
  juliaC: gl.getUniformLocation(prog, "u_juliaC"),
  palette: gl.getUniformLocation(prog, "u_palette"),
};

const view = {
  cx: -0.5, cy: 0, scale: 0.0035,  // complex units per pixel
  maxIter: 200, mode: 0, juliaC: [-0.8, 0.156], palette: 0,
};

let W, H;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  gl.viewport(0, 0, canvas.width, canvas.height);
}
resize();
window.addEventListener("resize", () => { resize(); render(); });

function render() {
  gl.uniform2f(U.res, canvas.width, canvas.height);
  gl.uniform2f(U.center, view.cx, view.cy);
  gl.uniform1f(U.scale, view.scale / (Math.min(2, window.devicePixelRatio || 1)));
  gl.uniform1f(U.maxIter, view.maxIter);
  gl.uniform1i(U.mode, view.mode);
  gl.uniform2f(U.juliaC, view.juliaC[0], view.juliaC[1]);
  gl.uniform1i(U.palette, view.palette);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
render();

// --- pan / zoom ---
function screenToComplex(px, py) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const x = (px * dpr - canvas.width / 2) * (view.scale / dpr) + view.cx;
  const y = ((H - py) * dpr - canvas.height / 2) * (view.scale / dpr) + view.cy;
  return [x, y];
}
let drag = null;
canvas.addEventListener("mousedown", (e) => (drag = { x: e.clientX, y: e.clientY }));
window.addEventListener("mouseup", () => (drag = null));
window.addEventListener("mousemove", (e) => {
  if (!drag) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  view.cx -= (e.clientX - drag.x) * dpr * (view.scale / dpr);
  view.cy += (e.clientY - drag.y) * dpr * (view.scale / dpr);
  drag = { x: e.clientX, y: e.clientY };
  render();
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const [mx, my] = screenToComplex(e.clientX, e.clientY);
  const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
  view.scale *= factor;
  // zoom toward cursor: keep the point under the cursor fixed
  view.cx = mx + (view.cx - mx) * factor;
  view.cy = my + (view.cy - my) * factor;
  render();
}, { passive: false });

// touch
let pinch = null;
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) drag = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  else if (e.touches.length === 2) pinch = dist(e.touches);
}, { passive: true });
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 1 && drag) {
    const t = e.touches[0], dpr = Math.min(2, window.devicePixelRatio || 1);
    view.cx -= (t.clientX - drag.x) * (view.scale);
    view.cy += (t.clientY - drag.y) * (view.scale);
    drag = { x: t.clientX, y: t.clientY };
    render();
  } else if (e.touches.length === 2 && pinch) {
    const nd = dist(e.touches);
    view.scale *= pinch / nd;
    pinch = nd;
    render();
  }
}, { passive: false });
canvas.addEventListener("touchend", () => { drag = null; pinch = null; });
function dist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

// shift-click on the Mandelbrot to seed a Julia set
canvas.addEventListener("click", (e) => {
  if (!e.shiftKey || view.mode !== 0) return;
  view.juliaC = screenToComplex(e.clientX, e.clientY);
  view.mode = 1;
  ui.mode.value = "1";
  resetView();
});

// --- controls ---
const ui = {
  mode: document.getElementById("mode"),
  iter: document.getElementById("iter"),
  palette: document.getElementById("palette"),
};
const out = (k) => document.querySelector(`[data-out="${k}"]`);
function sync() {
  view.mode = +ui.mode.value;
  view.maxIter = +ui.iter.value;
  view.palette = +ui.palette.value;
  out("iter").textContent = ui.iter.value;
  render();
}
[ui.mode, ui.iter, ui.palette].forEach((el) => el.addEventListener("input", sync));

function resetView() {
  if (view.mode === 1) { view.cx = 0; view.cy = 0; view.scale = 0.004; }
  else { view.cx = -0.5; view.cy = 0; view.scale = 0.0035; }
  render();
}
document.getElementById("reset").addEventListener("click", resetView);
document.getElementById("collapse").addEventListener("click", () =>
  document.getElementById("panel").classList.toggle("hidden"));

sync();

window.__fractal = { gl, view, render, resize, screenToComplex };
