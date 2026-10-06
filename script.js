/* ==================================================================
   Magnetic button — interaction logic

   The big idea: we never move anything directly to where it "should"
   be. Instead we set a TARGET, and a little spring pulls the real
   value toward that target every frame. Springs are what make motion
   feel physical and premium instead of robotic.
   ================================================================== */

const btn = document.getElementById("btn");
const shape = btn.querySelector(".btn-shape");
const label = btn.querySelector(".btn-label");
const done = btn.querySelector(".btn-done");
const status = document.getElementById("status");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------
   Tuning knobs — change these numbers and refresh to feel the difference
   ------------------------------------------------------------------ */
const SETTINGS = {
  attractRadius: 140,   // px beyond the button's edge where it starts reacting
  pull: 0.2,            // how strongly the button drifts toward the cursor
  textPull: 0.06,       // how much the text drifts (keep small!)
  stretch: 0.09,        // max stretch (0.09 = 9%)
  hoverScale: 1.03,     // grow slightly when hovered
  pressScale: 0.95,     // shrink slightly while pressed
  stiffness: 170,       // spring: higher = snappier
  damping: 20,          // spring: lower = more bounce
};

/* ------------------------------------------------------------------
   A tiny spring. `value` chases `target`; `velocity` gives it momentum.
   ------------------------------------------------------------------ */
function spring(initial) {
  return { value: initial, target: initial, velocity: 0 };
}

function stepSpring(s, dt, stiffness = SETTINGS.stiffness, damping = SETTINGS.damping) {
  const force = (s.target - s.value) * stiffness; // pull toward target
  const friction = s.velocity * damping;          // resist motion
  s.velocity += (force - friction) * dt;
  s.value += s.velocity * dt;
}

const motion = {
  x: spring(0),        // button position offset
  y: spring(0),
  textX: spring(0),    // text offset (inside the button)
  textY: spring(0),
  stretch: spring(0),  // how much the shape stretches
  scale: spring(1),    // overall size
};

let angle = 0;                 // direction the shape stretches toward
let pointer = null;            // { x, y } or null when the cursor is away
let pressed = false;
let isDone = false;

/* ------------------------------------------------------------------
   Input
   ------------------------------------------------------------------ */
window.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return; // no "hover" on touch screens
  pointer = { x: e.clientX, y: e.clientY };
});

document.addEventListener("pointerleave", () => { pointer = null; });
window.addEventListener("blur", () => { pointer = null; });

btn.addEventListener("pointerdown", () => { pressed = true; });
window.addEventListener("pointerup", () => { pressed = false; });
window.addEventListener("pointercancel", () => { pressed = false; });

btn.addEventListener("click", () => {
  isDone = !isDone;

  // CSS does the heavy lifting: toggling this class triggers all the
  // transitions defined in style.css (the morph, the checkmark, etc.)
  btn.classList.toggle("is-done", isDone);
  btn.setAttribute("aria-pressed", String(isDone));
  done.setAttribute("aria-hidden", String(!isDone));
  label.setAttribute("aria-hidden", String(isDone));
  status.textContent = isDone ? "Done" : "";

  // A little kick to the spring gives the click a satisfying "pop"
  motion.scale.velocity += isDone ? 1.6 : -1.2;
});

/* ------------------------------------------------------------------
   Geometry helper: how far is a point from the edge of a pill?
   Negative = inside the pill, positive = outside.
   ------------------------------------------------------------------ */
function distanceToPill(dx, dy, halfW, halfH) {
  const r = Math.min(halfW, halfH);
  const qx = Math.max(Math.abs(dx) - (halfW - r), 0);
  const qy = Math.max(Math.abs(dy) - (halfH - r), 0);
  return Math.hypot(qx, qy) - r;
}

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ------------------------------------------------------------------
   The animation loop — runs ~60 times per second
   ------------------------------------------------------------------ */
let lastTime = performance.now();

function frame(now) {
  // Time since last frame, in seconds (capped so a background tab
  // doesn't make things jump when you come back)
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  // 1. Work out where the cursor is relative to the button
  //    (offsetWidth/Height ignore our transforms, which is what we want)
  const halfW = btn.offsetWidth / 2;
  const halfH = btn.offsetHeight / 2;
  const rect = btn.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2 - motion.x.value;
  const centerY = rect.top + rect.height / 2 - motion.y.value;

  let proximity = 0; // 0 = far away, 1 = touching / inside
  let hovering = false;
  let dx = 0, dy = 0;

  if (pointer && !reduceMotion) {
    dx = pointer.x - centerX;
    dy = pointer.y - centerY;

    const edgeDistance = distanceToPill(dx, dy, halfW, halfH);
    hovering = edgeDistance < 0;
    proximity = clamp(1 - edgeDistance / SETTINGS.attractRadius, 0, 1);
    proximity = proximity * proximity; // ease-in so it starts very gently
  }

  // Calmer behaviour once it's in the "Done" state
  const calm = isDone ? 0.45 : 1;

  // 2. Set targets
  motion.x.target = dx * SETTINGS.pull * proximity * calm;
  motion.y.target = dy * SETTINGS.pull * proximity * calm;

  motion.textX.target = dx * SETTINGS.textPull * proximity;
  motion.textY.target = dy * SETTINGS.textPull * proximity;

  // Stretch grows as the cursor moves away from the centre,
  // so right in the middle the shape is at rest.
  const fromCenter = Math.hypot(dx, dy) / Math.max(halfW, halfH);
  motion.stretch.target = SETTINGS.stretch * proximity * Math.min(fromCenter, 1) * calm;
  if (proximity > 0) angle = Math.atan2(dy, dx);

  motion.scale.target = pressed
    ? SETTINGS.pressScale
    : hovering ? SETTINGS.hoverScale : 1 + 0.01 * proximity;

  // 3. Advance every spring one step
  for (const key in motion) stepSpring(motion[key], dt);

  // 4. Apply to the page
  const s = motion.stretch.value;
  const sc = motion.scale.value;

  // Move the whole button (shape + text together)
  btn.style.translate = `${motion.x.value}px ${motion.y.value}px`;

  // Stretch the shape: rotate to face the cursor, scale along that
  // direction, rotate back. Then nudge it toward the cursor so the
  // leading edge reaches out further than the trailing edge.
  const lead = s * 50;
  shape.style.transform =
    `translate(${Math.cos(angle) * lead}px, ${Math.sin(angle) * lead}px) ` +
    `rotate(${angle}rad) scale(${(1 + s) * sc}, ${(1 - s * 0.4) * sc}) rotate(${-angle}rad)`;

  // Text drifts a tiny bit further than the button = depth/parallax
  label.style.translate = `${motion.textX.value}px ${motion.textY.value}px`;
  done.style.translate = `${motion.textX.value * 0.6}px ${motion.textY.value * 0.6}px`;

  // Shadow lift + cursor-following highlight (read by the CSS)
  shape.style.setProperty("--lift", proximity.toFixed(3));
  if (pointer) {
    shape.style.setProperty("--gx", `${((dx + halfW) / (halfW * 2)) * 100}%`);
    shape.style.setProperty("--gy", `${((dy + halfH) / (halfH * 2)) * 100}%`);
  }
  btn.classList.toggle("is-hover", hovering);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
