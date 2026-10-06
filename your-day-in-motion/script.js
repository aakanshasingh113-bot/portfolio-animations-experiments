/* ==================================================================
   Your Day, In Motion — a camera moving through one world

   The whole page runs on ONE number: progress, from 0 (top) to 1 (end).

   From progress we work out a handful of things, and ONLY these move:
     • the camera   – how far along the world we are looking
     • the dolly    – a very slow push in / pull out
     • the time     – sky, light, colours and the sun's position
     • the walker   – she walks through the park in MOVE
     • the birds    – they cross the evening sky in RESET
     • the type     – each block fades in where it lives in the world

   Everything else (rooms, furniture, trees, hills) is fixed in place.
   It only moves on screen because the camera moves, and each layer
   moves by a different amount depending on its depth. That's what
   keeps everything feeling like one place.

   Timeline (progress):
     0.00 ─ WAKE ─ 0.12 ── walk outside ── 0.26 ─ MOVE ─ 0.46 ── into the studio ──
     0.58 ─ FOCUS ─ 0.72 ── out to the terrace ── 0.82 ─ RESET ─ 1.00
   ================================================================== */

const $ = (sel) => document.querySelector(sel);

const root = document.documentElement;
const story = $("#story");
const sky = $("#sky");
const sun = $("#sun");
const sunImg = sun.querySelector("img");
const clouds = $("#clouds");
const birds = $("#birds");
const grade = $("#grade");
const lightfall = $("#lightfall");
const sunpatch = $("#sunpatch");
const walker = $("#walker");
const hint = $("#hint");
const clock = $("#clock");
const bar = $("#bar");
const navButtons = [...document.querySelectorAll("[data-go]")];
const restart = $("#restart");

const layers = [...document.querySelectorAll(".layer")].map((el) => ({
  el,
  track: el.firstElementChild,
  depth: parseFloat(el.dataset.depth),
}));

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------
   Small maths helpers
   ------------------------------------------------------------------ */
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (p, a, b) => clamp((p - a) / (b - a)); // 0 before a, 1 after b

const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
};

const hexToRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (c, a = 1) => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`;

/* A smooth curve through a list of [progress, value] points.
   Unlike easing between keyframes one by one, this keeps the SPEED
   continuous: the camera never stops dead at a keyframe and lurches off
   again. Flat stretches (same value twice) become real holds.
   (The technique is called monotone cubic interpolation.) */
function curve(points) {
  const n = points.length;
  const xs = points.map((pt) => pt[0]);
  const ys = points.map((pt) => pt[1]);
  const slope = [];
  for (let i = 0; i < n - 1; i++) slope.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));

  const m = [slope[0]];
  for (let i = 1; i < n - 1; i++) m.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  m.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * slope[i]; m[i + 1] = t * b * slope[i]; }
  }

  return (p) => {
    if (p <= xs[0]) return ys[0];
    if (p >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (p > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (p - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i]
         + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/* Colour keyframes. Values you leave out are held from the previous
   keyframe, so { at: 0.5 } means "no change until 0.5". */
function track(frames) {
  let prev = {};
  return frames.map((f) => {
    const out = { ...prev };
    for (const key in f) out[key] = typeof f[key] === "string" ? hexToRgb(f[key]) : f[key];
    prev = out;
    return out;
  });
}

function sample(tr, p) {
  if (p <= tr[0].at) return tr[0];
  const last = tr[tr.length - 1];
  if (p >= last.at) return last;
  let i = 0;
  while (p > tr[i + 1].at) i++;
  const a = tr[i], b = tr[i + 1];
  const t = ease.inOut(range(p, a.at, b.at));
  const out = {};
  for (const key in b) {
    out[key] = Array.isArray(b[key]) ? b[key].map((x, j) => lerp(a[key][j], x, t)) : lerp(a[key], b[key], t);
  }
  return out;
}

/* ------------------------------------------------------------------
   1. CAMERA: where we are looking, in vw along the world.
      bedroom 0 · park 100–300 · studio 300 · terrace 400
   ------------------------------------------------------------------ */
const camera = curve([
  [0.00, 0],
  [0.12, 0],     // WAKE: hold on the bedroom
  [0.26, 105],   // step outside
  [0.46, 195],   // MOVE: track alongside her through the park
  [0.58, 300],   // arrive in the studio
  [0.72, 302],   // FOCUS: almost perfectly still
  [0.82, 405],   // out onto the terrace
  [1.00, 410],   // RESET: drift to a stop
]);

// The dolly: 1 = normal. The set settles in at the start, the studio is
// slowly pushed in on (focus), and the terrace slowly opens up.
const dolly = curve([
  [0.00, 1.035], [0.12, 1], [0.58, 1], [0.72, 1.03], [0.82, 1.012], [1.00, 1],
]);

// The walker's position in the world (vw). She starts walking just as
// the park comes into view, and keeps going as the camera moves on.
const walk = curve([
  [0.00, 118], [0.14, 118], [0.26, 142], [0.46, 240], [0.60, 272], [1.00, 272],
]);

/* ------------------------------------------------------------------
   2. TIME OF DAY
   ------------------------------------------------------------------ */
const COLORS = track([
  // dawn
  { at: 0.00, skyTop: "#b6c6df", skyBottom: "#f4c6a4", ink: "#2b2622", grade: "#ffd6bd", gradeA: 0.24,
    hillFar: "#d5c3c3", hillNear: "#c4b0b2", city: "#b9b4bd", tree: "#9aa98e", hedge: "#8b9b80",
    grass: "#b6b48f", path: "#eadbc6", cloud: 0.55, sunHue: 0, sunSat: 1, light: 1 },
  { at: 0.12, gradeA: 0.16 },
  // morning into midday
  { at: 0.30, skyTop: "#a9cae6", skyBottom: "#edf1e8", grade: "#ffffff", gradeA: 0,
    hillFar: "#c1d0c4", hillNear: "#a9bea9", city: "#b8c3cc", tree: "#8ea585", hedge: "#7f9776",
    grass: "#abb98d", path: "#e9ddc7", cloud: 0.75, light: 0.6 },
  { at: 0.50 },
  // calm afternoon
  { at: 0.62, skyTop: "#b7c7d5", skyBottom: "#ece6d7", grade: "#e2e9ef", gradeA: 0.14,
    hillFar: "#c3cac6", hillNear: "#afbcb4", city: "#aab4bd", cloud: 0.45, light: 0.8 },
  { at: 0.72 },
  { at: 0.78, ink: "#2b2622" },
  // sunset
  { at: 0.86, skyTop: "#5e4b6f", skyBottom: "#f3aa84", ink: "#fbf1e8", grade: "#ffb996", gradeA: 0.3,
    hillFar: "#a07b86", hillNear: "#7d5b6b", city: "#b98389", tree: "#6b5567", hedge: "#5f4b5d",
    grass: "#7a5c62", path: "#b8907f", cloud: 0.35, sunHue: -16, sunSat: 1.35, light: 0.4 },
  // dusk
  { at: 1.00, skyTop: "#3b2f52", skyBottom: "#e88f74", grade: "#f2a08a", gradeA: 0.36,
    hillFar: "#87657a", hillNear: "#634a5e", city: "#a87480", cloud: 0.25, sunHue: -26, sunSat: 1.5, light: 0.2 },
]);

/* ------------------------------------------------------------------
   Layout (recalculated on resize)
   ------------------------------------------------------------------ */
let W = 0, H = 0, sunSize = 0, birdsW = 0;
let sunX, sunY, birdX, birdY;

function measure() {
  W = window.innerWidth;
  H = window.innerHeight;
  const narrow = W <= 720;
  sunSize = sun.offsetWidth;
  birdsW = birds.offsetWidth;

  // The sun's path across the screen, in vw / vh. It's timed so you see it
  // through the bedroom window at dawn and the studio window in the
  // afternoon, then it sets beside her on the terrace.
  sunX = curve(narrow
    ? [[0, 66], [0.12, 66], [0.3, 76], [0.5, 80], [0.62, 64], [0.72, 68], [0.84, 80], [1, 82]]
    : [[0, 24], [0.12, 25], [0.3, 58], [0.5, 70], [0.62, 72], [0.72, 76], [0.84, 85], [0.97, 87], [1, 87]]);
  sunY = curve(narrow
    ? [[0, 66], [0.12, 46], [0.3, 40], [0.5, 42], [0.62, 46], [0.72, 48], [0.84, 54], [0.97, 69], [1, 72]]
    : [[0, 60], [0.12, 36], [0.3, 15], [0.5, 10], [0.62, 16], [0.72, 21], [0.84, 36], [0.97, 70], [1, 73]]);
  birdX = curve([[0.84, narrow ? 8 : 46], [1, narrow ? 36 : 68]]);
  birdY = curve([[0.84, narrow ? 40 : 30], [1, narrow ? 34 : 20]]);
  needsRender = true;
}

/* ------------------------------------------------------------------
   Type: each block belongs somewhere in the world (`at`, in camera vw)
   and moves with it. `depth` < 1 lets MOVE's text drift slowly with the
   landscape instead of rushing past with the path.
   ------------------------------------------------------------------ */
const COPY = [
  { el: $("#copyWake"),  at: 0,   depth: 1,    show: [-1, 0],       hide: [0.1, 0.16] },
  { el: $("#copyMove"),  at: 150, depth: 0.14, show: [0.26, 0.33],  hide: [0.44, 0.5] },
  { el: $("#copyFocus"), at: 300, depth: 1,    show: [0.57, 0.63],  hide: [0.71, 0.75], sharpen: [0.57, 0.7] },
  { el: $("#copyReset"), at: 405, depth: 1,    show: [0.83, 0.88],  hide: [0.91, 0.94] },
  { el: $("#copyFinal"), at: 410, depth: 1,    show: [0.945, 0.975], hide: [2, 3] },
];

function renderCopy(p, cam) {
  for (const c of COPY) {
    const tin = ease.out(range(p, c.show[0], c.show[1]));
    const tout = ease.inOut(range(p, c.hide[0], c.hide[1]));
    const x = (c.at - cam) * c.depth * W / 100;
    const y = (1 - tin) * 18 - tout * 12;
    let opacity = tin * (1 - tout);
    let extra = "";

    // FOCUS: the heading comes into focus as the room goes quiet
    if (c.sharpen) {
      const s = ease.out(range(p, c.sharpen[0], c.sharpen[1]));
      opacity *= 0.55 + 0.45 * s;
      c.el.style.filter = reduceMotion ? "none" : `blur(${(1 - s) * 5}px)`;
      extra = ` scale(${0.985 + 0.015 * s})`;
    }
    c.el.style.opacity = opacity;
    c.el.style.transform = `translate3d(${x}px, ${y}px, 0)${extra}`;
  }
  // "Start again" waits a moment after the last line
  const again = ease.out(range(p, 0.972, 0.995));
  restart.style.opacity = again;
  restart.style.transform = `translateY(${(1 - again) * 8}px)`;
  restart.disabled = again < 0.5;
}

/* ------------------------------------------------------------------
   Render one frame
   ------------------------------------------------------------------ */
let activeChapter = -1;

function render(p) {
  const c = sample(COLORS, p);
  const cam = camera(p);
  const d = dolly(p);

  // Time of day
  root.style.setProperty("--ink", rgba(c.ink));
  for (const key of ["hillFar", "hillNear", "city", "tree", "hedge", "grass", "path"]) {
    root.style.setProperty("--" + key.replace(/[A-Z]/g, (ch) => "-" + ch.toLowerCase()), rgba(c[key]));
  }
  sky.style.background = `linear-gradient(180deg, ${rgba(c.skyTop)} 0%, ${rgba(c.skyBottom)} 78%)`;
  grade.style.backgroundColor = rgba(c.grade, c.gradeA);
  clouds.style.opacity = c.cloud;
  lightfall.style.opacity = c.light;
  sunpatch.style.opacity = c.light;

  sun.style.transform = `translate3d(${sunX(p) * W / 100 - sunSize / 2}px, ${sunY(p) * H / 100 - sunSize / 2}px, 0)`;
  sunImg.style.filter = `hue-rotate(${c.sunHue}deg) saturate(${c.sunSat})`;

  // Camera + dolly. Each layer pans and scales in proportion to its depth.
  for (const L of layers) {
    L.track.style.transform = `translate3d(${-cam * L.depth * W / 100}px, 0, 0)`;
    L.el.style.transform = `scale(${1 + (d - 1) * L.depth})`;
  }

  // The walker moves through the world (she's inside the set layer)
  walker.style.transform = `translate3d(${walk(p) * W / 100}px, 0, 0)`;

  // Birds only fly at dusk
  const b = range(p, 0.84, 1);
  birds.style.opacity = Math.min(ease.out(range(p, 0.84, 0.88)), 1 - range(p, 0.97, 1)) * 0.85;
  birds.style.transform = `translate3d(${birdX(p) * W / 100 - birdsW / 2}px, ${birdY(p) * H / 100}px, 0) scale(${1 - b * 0.25})`;

  renderCopy(p, cam);
  hint.style.opacity = 1 - range(p, 0, 0.03);

  // Header: 06:00 → 22:00, progress line, current chapter
  const minutes = Math.floor(6 * 60 + p * 16 * 60);
  clock.textContent = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  bar.style.transform = `scaleX(${p})`;
  const chapter = p < 0.2 ? 0 : p < 0.52 ? 1 : p < 0.78 ? 2 : 3;
  if (chapter !== activeChapter) {
    navButtons.forEach((btn, i) => btn.classList.toggle("is-active", i === chapter));
    activeChapter = chapter;
  }
}

/* ------------------------------------------------------------------
   Scroll → progress, smoothed
   ------------------------------------------------------------------ */
function scrollProgress() {
  const scrollable = story.offsetHeight - window.innerHeight;
  return clamp((window.scrollY - story.offsetTop) / scrollable);
}

const scrollToProgress = (p) => {
  const scrollable = story.offsetHeight - window.innerHeight;
  window.scrollTo({ top: story.offsetTop + p * scrollable, behavior: reduceMotion ? "auto" : "smooth" });
};
const CHAPTER_STOPS = [0.04, 0.36, 0.65, 0.9];
navButtons.forEach((btn) => btn.addEventListener("click", () => scrollToProgress(CHAPTER_STOPS[+btn.dataset.go])));
restart.addEventListener("click", () => scrollToProgress(0));

let needsRender = true;
let progress = scrollProgress();
let renderedP = -1;
let last = performance.now();

window.addEventListener("resize", measure);

function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // Progress glides toward the real scroll position, which gives the
  // camera a little weight instead of jumping with every wheel notch.
  const target = scrollProgress();
  progress = reduceMotion ? target : progress + (target - progress) * (1 - Math.exp(-dt * 5));

  // Only touch the page when something actually changed
  if (needsRender || Math.abs(progress - renderedP) > 0.00002) {
    render(progress);
    renderedP = progress;
    needsRender = false;
  }
  requestAnimationFrame(tick);
}

measure();
requestAnimationFrame(tick);
