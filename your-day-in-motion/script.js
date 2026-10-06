/* ==================================================================
   Your Day, In Motion — scroll-driven animation

   The whole page runs on ONE number: progress, from 0 (top of the
   story) to 1 (the end). Every element has a "track": a list of
   keyframes saying where it should be at certain progress values.
   Each frame we read the scroll position, turn it into progress, and
   ask every track "where should you be right now?"

   Chapters on the timeline:
     0.00 – 0.25  WAKE
     0.25 – 0.50  MOVE
     0.50 – 0.75  FOCUS
     0.75 – 1.00  RESET
   ================================================================== */

const $ = (sel) => document.querySelector(sel);

const root = document.documentElement;
const story = $("#story");
const sky = $("#sky");
const starsEl = $("#stars");
const hillBack = $("#hillBack");
const hillFront = $("#hillFront");
const sun = $("#sun");
const person = $("#person");
const legL = $("#legL");
const legR = $("#legR");
const word = $("#word");
const letters = [...word.children];
const bits = [...document.querySelectorAll(".bit")];
const hero = $("#hero");
const hint = $("#hint");
const finale = $("#finale");
const restart = $("#restart");
const sections = [...document.querySelectorAll(".chapter")];
const navButtons = [...document.querySelectorAll("[data-go]")];
const clock = $("#clock");
const bar = $("#bar");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------
   Small maths helpers
   ------------------------------------------------------------------ */
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Where is p between a and b? Returns 0 before a, 1 after b, and
// a smooth 0→1 in between. This is how a chapter gets its own progress.
const range = (p, a, b) => clamp((p - a) / (b - a));

const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  linear: (t) => t,
};

const hexToRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (c, a = 1) => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`;

/* ------------------------------------------------------------------
   Keyframe tracks
   track([...]) tidies a list of keyframes: any value you leave out is
   copied from the keyframe before it (so { at: 0.3 } means "hold still
   until 0.3"), and colours become numbers we can blend.
   sample(track, p) returns the in-between values for progress p.
   ------------------------------------------------------------------ */
function track(frames) {
  let prev = {};
  return frames.map((f) => {
    const out = { ...prev, ease: "inOut" };
    for (const key in f) {
      const v = f[key];
      out[key] = typeof v === "string" && v[0] === "#" ? hexToRgb(v) : v;
    }
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
  const a = tr[i];
  const b = tr[i + 1];
  const t = ease[b.ease](range(p, a.at, b.at));

  const out = {};
  for (const key in b) {
    if (key === "at" || key === "ease") continue;
    const va = a[key];
    const vb = b[key];
    out[key] = Array.isArray(vb) ? vb.map((x, j) => lerp(va[j], x, t)) : lerp(va, vb, t);
  }
  return out;
}

/* ------------------------------------------------------------------
   The colour of the day
   ------------------------------------------------------------------ */
const COLORS = track([
  // pre-dawn
  { at: 0.00, top: "#141a33", bottom: "#3d3456", fg: "#f3eee6", figure: "#f3eee6",
    hillB: "#2a2947", hillF: "#1b1b33", sunA: "#ffc27a", sunB: "#ff7a59", glow: 0.35, accent: "#ff9a6b" },
  // WAKE: morning
  { at: 0.10, top: "#a9c1dd", bottom: "#f8dcc4", fg: "#1b1f2e", figure: "#1b1f2e",
    hillB: "#c7a79d", hillF: "#8f7a86", sunA: "#ffe39a", sunB: "#ff9d4d", glow: 0.6, accent: "#f08a4b" },
  { at: 0.30 },
  // MOVE: bright midday
  { at: 0.45, top: "#8ec3e6", bottom: "#eef3ef", hillB: "#b4d0bd", hillF: "#7fa68f",
    sunA: "#fff1b0", sunB: "#ffc24d", glow: 0.5, accent: "#e7883f" },
  { at: 0.50 },
  // FOCUS: deep, quiet afternoon
  { at: 0.60, top: "#0d1a21", bottom: "#1c3b40", fg: "#e8f0ec", figure: "#e8f0ec",
    hillB: "#173033", hillF: "#0f2326", sunA: "#f3d9a8", sunB: "#c98e5c", glow: 0.25, accent: "#e0a46a" },
  { at: 0.76 },
  // RESET: dusk
  { at: 0.88, top: "#2a1d3d", bottom: "#ec8a6a", fg: "#fff4ec", figure: "#2a1d3d",
    hillB: "#5b3654", hillF: "#3a2240", sunA: "#ffb070", sunB: "#ea5a6e", glow: 0.55, accent: "#ffb27a" },
]);

/* ------------------------------------------------------------------
   Layout state (recalculated on resize)
   Positions in the tracks are fractions of the stage:
   x: 0 = left edge, 1 = right edge. y: 0 = top, 1 = bottom.
   ------------------------------------------------------------------ */
let W = 0, H = 0, narrow = false;
let sizes = {};
let tracks = {};

// On phones the visuals sit in the top part of the screen, so we squeeze
// the desktop positions into that area instead of writing a second set.
function fit(x, y) {
  return narrow ? [0.5 + (x - 0.66) * 1.4, y * 0.68] : [x, y];
}
function fitFrames(frames) {
  return frames.map((f) => {
    if (!("x" in f)) return f;
    const [x, y] = fit(f.x, f.y);
    return { ...f, x, y };
  });
}

function buildTracks() {
  tracks.sun = track(fitFrames([
    { at: 0.00, x: 0.64, y: 1.02, s: 0.92 },
    { at: 0.20, x: 0.64, y: 0.44, s: 1.00 },   // WAKE: rises
    { at: 0.28 },
    { at: 0.46, x: 0.87, y: 0.24, s: 0.60 },   // MOVE: drifts to the side
    { at: 0.55 },
    { at: 0.68, x: 0.88, y: 0.20, s: 0.46 },   // FOCUS: small and out of the way
    { at: 0.78 },
    { at: 0.94, x: 0.66, y: 0.45, s: 1.05 },   // RESET: back to the centre
  ]));

  tracks.person = track(fitFrames([
    { at: 0.00, x: -0.25, y: 0.56, s: 1 },
    { at: 0.28 },
    { at: 0.44, x: 0.55, y: 0.56, s: 1 },      // MOVE: walks in from the left
    { at: 0.52 },
    { at: 0.66, x: 0.67, y: 0.42, s: 0.55 },   // FOCUS: scales down, stands on the word
    { at: 0.78 },
    { at: 0.94, x: 0.66, y: 0.56, s: 0.8 },    // RESET: in front of the sun
  ]));

  // Small shapes: scattered → around the person → a tidy row → a ring
  const rest = [[0.43, 0.31], [0.63, 0.29], [0.73, 0.55], [0.41, 0.68], [0.70, 0.80], [0.53, 0.87]];
  const sunEnd = tracks.sun[tracks.sun.length - 1];
  const ringR = (sizes.sun.w * 1.05) / 2 + Math.max(34, Math.min(W, H) * 0.06);

  tracks.bits = bits.map((el, i) => {
    const d = i * 0.022; // stagger, so they don't all move at once
    const [rx, ry] = rest[i];
    const fromX = rx + (rx > 0.55 ? 0.5 : -0.6);
    const fromY = ry - 0.5 + i * 0.2;
    const rowX = 0.47 + i * (0.42 / 5);
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / bits.length;

    const frames = fitFrames([
      { at: 0.00, x: fromX, y: fromY, s: 0.6, r: -140, op: 0 },
      { at: 0.27 + d },
      { at: 0.41 + d, x: rx, y: ry, s: 1, r: 0, op: 1 },          // MOVE
      { at: 0.53 + d * 0.6 },
      { at: 0.66 + d * 0.6, x: rowX, y: 0.86, s: 0.85, r: 0, op: 0.9 }, // FOCUS
      { at: 0.77 + d * 0.5 },
    ]);
    // RESET: the ring is worked out around the sun's final position
    frames.push({
      at: 0.92 + d * 0.4,
      x: sunEnd.x + (Math.cos(angle) * ringR) / W,
      y: sunEnd.y + (Math.sin(angle) * ringR) / H,
      s: 0.9, r: 180, op: 1,
    });
    return track(frames);
  });
}

function measure() {
  W = window.innerWidth;
  H = window.innerHeight;
  narrow = W <= 720;
  // SVGs don't have offsetWidth, so the person's size comes from its CSS
  const ps = getComputedStyle(person);
  sizes = {
    sun: { w: sun.offsetWidth, h: sun.offsetHeight },
    person: { w: parseFloat(ps.width), h: parseFloat(ps.height) },
    bits: bits.map((b) => ({ w: b.offsetWidth, h: b.offsetHeight })),
  };
  buildTracks();
  needsRender = true;
}

/* ------------------------------------------------------------------
   Stars (generated once, from a fixed seed so they never jump around)
   ------------------------------------------------------------------ */
(function makeStars() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("span");
    const size = 1 + rand() * 1.8;
    s.className = "star";
    s.style.cssText = `left:${rand() * 100}%;top:${rand() * 60}%;width:${size}px;height:${size}px;opacity:${0.3 + rand() * 0.6}`;
    starsEl.appendChild(s);
  }
})();

/* ------------------------------------------------------------------
   Input: scroll position and (for subtle parallax) the pointer
   ------------------------------------------------------------------ */
function scrollProgress() {
  const scrollable = story.offsetHeight - window.innerHeight;
  return clamp((window.scrollY - story.offsetTop) / scrollable);
}

let target = scrollProgress();
let progress = target;          // the smoothed value we actually animate with
let pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let needsRender = true;

window.addEventListener("pointermove", (e) => {
  if (reduceMotion || e.pointerType === "touch") return;
  pointer.tx = (e.clientX / W - 0.5) * 2;   // -1 … 1
  pointer.ty = (e.clientY / H - 0.5) * 2;
});

window.addEventListener("resize", measure);
document.fonts?.ready.then(measure);

// Header buttons jump to the middle of each chapter
const scrollToProgress = (p) => {
  const scrollable = story.offsetHeight - window.innerHeight;
  window.scrollTo({ top: story.offsetTop + p * scrollable, behavior: reduceMotion ? "auto" : "smooth" });
};
navButtons.forEach((btn) => btn.addEventListener("click", () => scrollToProgress(+btn.dataset.go * 0.25 + 0.125)));
restart.addEventListener("click", () => scrollToProgress(0));

/* ------------------------------------------------------------------
   Placing things
   ------------------------------------------------------------------ */
// Puts an element's centre at (x, y) on the stage. `depth` is how much
// it follows the pointer: bigger number = feels closer to you.
function place(el, size, f, depth, extraY = 0) {
  const px = pointer.x * depth;
  const py = pointer.y * depth;
  const x = f.x * W - size.w / 2 + px;
  const y = f.y * H - size.h / 2 + py + extraY;
  el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${f.s}) rotate(${f.r || 0}deg)`;
  if (f.op !== undefined) el.style.opacity = f.op;
}

/* ------------------------------------------------------------------
   Render one frame for a given progress value p
   ------------------------------------------------------------------ */
let activeChapter = -1;

function render(p) {
  // 1. Colours
  const c = sample(COLORS, p);
  root.style.setProperty("--bg", rgba(c.top));
  root.style.setProperty("--fg", rgba(c.fg));
  root.style.setProperty("--figure", rgba(c.figure));
  root.style.setProperty("--accent", rgba(c.accent));
  root.style.setProperty("--hill-b", rgba(c.hillB));
  root.style.setProperty("--hill-f", rgba(c.hillF));
  root.style.setProperty("--card", rgba(c.top, 0.55));
  sky.style.background = `linear-gradient(180deg, ${rgba(c.top)} 0%, ${rgba(c.bottom)} 100%)`;
  sun.style.background = `radial-gradient(circle at 50% 42%, ${rgba(c.sunA)} 0%, ${rgba(c.sunA)} 30%, ${rgba(c.sunB)} 100%)`;
  sun.style.boxShadow = `0 0 ${H * 0.14}px ${H * 0.03}px ${rgba(c.sunB, c.glow)}`;

  // 2. Background layers. Parallax: the further back a layer is, the
  //    less it moves (both with scroll and with the pointer).
  const wake = ease.inOut(range(p, 0, 0.25));
  starsEl.style.opacity = 1 - range(p, 0, 0.08);
  starsEl.style.transform = `translate3d(${pointer.x * 3}px, ${pointer.y * 3 - wake * H * 0.04}px, 0)`;
  hillBack.style.transform = `translate3d(${pointer.x * 6}px, ${pointer.y * 4 + wake * H * 0.03}px, 0)`;
  hillFront.style.transform = `translate3d(${pointer.x * 12}px, ${pointer.y * 6 + wake * H * 0.07}px, 0)`;

  // 3. The sun
  place(sun, sizes.sun, sample(tracks.sun, p), 9);

  // 4. The person, with a little walk cycle while entering in MOVE
  const walk = range(p, 0.28, 0.44);
  const stride = Math.sin(walk * Math.PI * 7) * Math.sin(walk * Math.PI); // 0 at both ends
  legL.style.transform = `rotate(${stride * 22}deg)`;
  legR.style.transform = `rotate(${-stride * 22}deg)`;
  place(person, sizes.person, sample(tracks.person, p), 16, -Math.abs(stride) * 6);

  // 5. Small shapes (closest layer = most pointer movement)
  bits.forEach((el, i) => place(el, sizes.bits[i], sample(tracks.bits[i], p), 26));

  // 6. FOCUS: letters appear one by one, then the word lifts away in RESET
  letters.forEach((letter, i) => {
    const start = 0.53 + i * 0.022;
    const t = ease.out(range(p, start, start + 0.06));
    letter.style.opacity = t;
    letter.style.transform = `translateY(${(1 - t) * 0.35}em)`;
    letter.style.filter = reduceMotion ? "none" : `blur(${(1 - t) * 8}px)`;
  });
  const wordOut = ease.inOut(range(p, 0.76, 0.84));
  word.style.opacity = 1 - wordOut;
  word.style.translate = `${pointer.x * 12}px ${pointer.y * 8 - wordOut * H * 0.06}px`;

  // 7. WAKE: hero heading fades and moves upward
  const heroOut = range(p, 0, 0.09);
  hero.style.opacity = 1 - ease.out(heroOut);
  hero.style.translate = `0 ${-ease.out(heroOut) * H * 0.12}px`;
  hint.style.opacity = 1 - range(p, 0, 0.03);

  // 8. RESET: the call to action
  const end = ease.out(range(p, 0.9, 0.98));
  finale.style.opacity = end;
  finale.style.translate = `0 ${(1 - end) * 24}px`;
  finale.inert = end < 0.5;

  // 9. Chapter copy: fades in as it reaches the middle of the screen,
  //    and moves slightly faster than the scroll (foreground parallax).
  const focal = narrow ? 0.78 : 0.5;
  sections.forEach((section) => {
    const r = section.getBoundingClientRect();
    const d = (r.top + r.height / 2 - focal * H) / (H * 0.5);  // 0 = on the focal line
    const visible = 1 - ease.inOut(range(Math.abs(d), 0.25, 0.9));
    const copy = section.firstElementChild;
    copy.style.opacity = visible;
    copy.style.transform = `translate3d(0, ${d * H * 0.08}px, 0)`;
  });

  // 10. Header: clock runs 06:00 → 22:00, progress line, active chapter
  const minutes = Math.floor(6 * 60 + p * 16 * 60);
  clock.textContent = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  bar.style.transform = `scaleX(${p})`;
  const chapter = Math.min(3, Math.floor(p * 4));
  if (chapter !== activeChapter) {
    navButtons.forEach((b, i) => b.classList.toggle("is-active", i === chapter));
    activeChapter = chapter;
  }
}

/* ------------------------------------------------------------------
   The loop
   We don't jump straight to the scroll position. `progress` eases
   toward it every frame, which smooths out jerky mouse wheels and
   gives everything a little inertia.
   ------------------------------------------------------------------ */
let last = performance.now();
let renderedP = -1;

function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  target = scrollProgress();
  progress = reduceMotion ? target : progress + (target - progress) * (1 - Math.exp(-dt * 7));

  pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 4));
  pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 4));
  const pointerMoving = Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) > 0.001;

  // Only touch the page when something actually changed
  if (needsRender || pointerMoving || Math.abs(progress - renderedP) > 0.00002) {
    render(progress);
    renderedP = progress;
    needsRender = false;
  }
  requestAnimationFrame(tick);
}

measure();
requestAnimationFrame(tick);
