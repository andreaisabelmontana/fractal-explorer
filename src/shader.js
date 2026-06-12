// GLSL for the fractal explorer. A single full-screen triangle is rasterised
// and the fragment shader does the escape-time iteration per pixel, with a
// smooth (continuous) iteration count for band-free colouring and a handful of
// cosine ("IQ") palettes.

export const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

export const FRAG = `
precision highp float;

uniform vec2  u_res;
uniform vec2  u_center;   // complex-plane center
uniform float u_scale;    // complex units per pixel
uniform float u_maxIter;
uniform int   u_mode;     // 0 = Mandelbrot, 1 = Julia
uniform vec2  u_juliaC;
uniform int   u_palette;

const int HARD_CAP = 1000;

vec3 palette(float t, int which) {
  // iq cosine palettes: color = a + b*cos(2pi*(c*t+d))
  vec3 a, b, c, d;
  if (which == 0) {            // ember
    a = vec3(0.5); b = vec3(0.5); c = vec3(1.0, 0.9, 0.8); d = vec3(0.00, 0.15, 0.35);
  } else if (which == 1) {     // ice
    a = vec3(0.5); b = vec3(0.5); c = vec3(1.0); d = vec3(0.55, 0.62, 0.70);
  } else if (which == 2) {     // electric
    a = vec3(0.5); b = vec3(0.5); c = vec3(2.0, 1.0, 0.0); d = vec3(0.5, 0.2, 0.25);
  } else {                     // botanical
    a = vec3(0.4, 0.5, 0.4); b = vec3(0.4, 0.5, 0.3); c = vec3(1.0); d = vec3(0.1, 0.3, 0.2);
  }
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  // pixel -> complex plane
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) * u_scale;
  uv.x += u_center.x;
  uv.y += u_center.y;

  vec2 z, c;
  if (u_mode == 1) { z = uv; c = u_juliaC; }
  else { z = vec2(0.0); c = uv; }

  float iter = 0.0;
  bool escaped = false;
  for (int i = 0; i < HARD_CAP; i++) {
    if (float(i) >= u_maxIter) break;
    // z = z^2 + c
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 256.0) { escaped = true; iter = float(i); break; }
  }

  if (!escaped) { gl_FragColor = vec4(0.02, 0.02, 0.04, 1.0); return; }

  // smooth iteration count
  float mu = iter + 1.0 - log(log(length(z))) / log(2.0);
  float t = mu / u_maxIter;
  t = pow(clamp(t, 0.0, 1.0), 0.5);
  gl_FragColor = vec4(palette(t * 3.0, u_palette), 1.0);
}
`;
