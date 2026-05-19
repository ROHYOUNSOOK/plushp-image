/* ===========================
   WebGL Image Filters — Camera Raw 스타일 GPU 처리
   드래그 중 freeze → 손 뗄 때 1회 재계산
=========================== */

export interface CameraRawFilters {
  exposure: number;    // imgLightness  -100 ~ 100
  temperature: number; // imgTemperature -100 ~ 100
  contrast: number;    // imgContrast   -100 ~ 100
  highlights: number;  // imgHighlights -100 ~ 100
  shadows: number;     // imgShadows    -100 ~ 100
  vibrance: number;    // imgVibrance   -100 ~ 100
  saturation: number;  // imgSaturation -100 ~ 100
}

/* ── Freeze 제어 (드래그 중 캐시 재계산 방지) ── */
let _filterFrozen = false;
export function setFilterFrozen(v: boolean) { _filterFrozen = v; }
export function isFilterFrozen() { return _filterFrozen; }

/* ── GLSL 소스 ── */
const VERT_SRC = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = vec2(a_uv.x, 1.0 - a_uv.y);
}`;

const FRAG_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_exposure;
uniform float u_temperature;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_vibrance;
uniform float u_saturation;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 rgb2hsv(vec3 c) {
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float d = mx - mn;
  float h = 0.0;
  if (d > 0.0001) {
    if (mx == c.r)      h = mod((c.g - c.b) / d, 6.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else                h = (c.r - c.g) / d + 4.0;
    h /= 6.0;
    if (h < 0.0) h += 1.0;
  }
  return vec3(h, mx < 0.0001 ? 0.0 : d / mx, mx);
}

vec3 hsv2rgb(vec3 c) {
  vec3 p = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), p, c.y);
}

void main() {
  vec4 orig = texture2D(u_tex, v_uv);
  vec3 c = orig.rgb;

  /* 1. 색온도 — warm(+) / cool(-) */
  float t = u_temperature / 100.0;
  c.r = clamp(c.r + t * 0.15, 0.0, 1.0);
  c.b = clamp(c.b - t * 0.20, 0.0, 1.0);
  c.g = clamp(c.g + t * 0.04, 0.0, 1.0);

  /* 2. 노출 — EV 기반 (-4 ~ +4 EV) */
  c = clamp(c * pow(2.0, u_exposure / 100.0 * 4.0), 0.0, 1.0);

  /* 3. 대비 — 0.5 기준 S-커브 */
  float k = u_contrast / 100.0;
  c = clamp((c - 0.5) * (1.0 + k * 1.5) + 0.5, 0.0, 1.0);

  /* 4. 하이라이트 — 밝은 영역 선택적 조정 */
  float hlMask = smoothstep(0.4, 1.0, lum(c));
  c = clamp(c * (1.0 - hlMask * u_highlights / 100.0 * 0.7), 0.0, 1.0);

  /* 5. 쉐도우 — 어두운 영역 선택적 조정 */
  float shMask = 1.0 - smoothstep(0.0, 0.6, lum(c));
  c = clamp(c + shMask * (u_shadows / 100.0) * 0.6 * (1.0 - c), 0.0, 1.0);

  /* 6. 채도 */
  float gray = lum(c);
  c = clamp(mix(vec3(gray), c, 1.0 + u_saturation / 100.0 * 2.0), 0.0, 1.0);

  /* 7. 활기 — 채도 낮은 색만 선택적으로 부스트 */
  vec3 hsv = rgb2hsv(c);
  float vib = u_vibrance / 100.0;
  hsv.y = clamp(hsv.y + vib * (1.0 - hsv.y) * 0.9, 0.0, 1.0);
  c = hsv2rgb(hsv);

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), orig.a);
}`;

/* ── WebGL 싱글톤 ── */
let _gl: WebGLRenderingContext | null = null;
let _glCanvas: HTMLCanvasElement | null = null;
let _prog: WebGLProgram | null = null;
let _ready = false;
const _u: Record<string, WebGLUniformLocation | null> = {};

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[webglFilters] shader error:', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

function initGL(): boolean {
  if (_ready) return true;
  if (typeof document === 'undefined') return false;
  try {
    _glCanvas = document.createElement('canvas');
    const gl = _glCanvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return false;

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) return false;

    const prog = gl.createProgram();
    if (!prog) return false;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[webglFilters] link error:', gl.getProgramInfoLog(prog));
      return false;
    }
    _prog = prog;

    /* 풀스크린 쿼드 버퍼 */
    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    const uvLoc  = gl.getAttribLocation(prog, 'a_uv');

    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const ub = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ub);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    for (const n of ['u_tex','u_exposure','u_temperature','u_contrast','u_highlights','u_shadows','u_vibrance','u_saturation']) {
      _u[n] = gl.getUniformLocation(prog, n);
    }

    _gl = gl;
    _ready = true;
    return true;
  } catch {
    return false;
  }
}

/** WebGL로 Camera Raw 필터 적용 → 결과를 2D canvas로 반환. 실패 시 null */
export function applyFiltersWebGL(img: HTMLImageElement, f: CameraRawFilters): HTMLCanvasElement | null {
  if (!initGL() || !_gl || !_glCanvas || !_prog) return null;
  const gl = _gl;
  try {
    _glCanvas.width  = img.naturalWidth;
    _glCanvas.height = img.naturalHeight;
    gl.viewport(0, 0, img.naturalWidth, img.naturalHeight);
    gl.useProgram(_prog);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    gl.uniform1i(_u['u_tex'], 0);
    gl.uniform1f(_u['u_exposure'],    f.exposure);
    gl.uniform1f(_u['u_temperature'], f.temperature);
    gl.uniform1f(_u['u_contrast'],    f.contrast);
    gl.uniform1f(_u['u_highlights'],  f.highlights);
    gl.uniform1f(_u['u_shadows'],     f.shadows);
    gl.uniform1f(_u['u_vibrance'],    f.vibrance);
    gl.uniform1f(_u['u_saturation'],  f.saturation);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    /* WebGL canvas → 독립 2D canvas (싱글톤 덮어쓰기 방지) */
    const out = document.createElement('canvas');
    out.width  = img.naturalWidth;
    out.height = img.naturalHeight;
    out.getContext('2d')!.drawImage(_glCanvas, 0, 0);

    gl.deleteTexture(tex);
    return out;
  } catch (e) {
    console.warn('[webglFilters] render failed:', e);
    return null;
  }
}
