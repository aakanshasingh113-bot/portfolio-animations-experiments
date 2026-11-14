(() => {
  'use strict';

  const HALF = 18;            // half of the 36px square
  const ROUNDS = 3;
  const ADVANCE_GUARD_MS = 300; // ignore double-clicks that would skip the reveal

  const $ = (id) => document.getElementById(id);
  const game = $('game'), summary = $('summary');
  const surface = $('surface'), square = $('square');
  const primary = $('primary'), restart = $('restart');
  const nudges = [...document.querySelectorAll('.nudge')];

  // All geometry is in CSS pixels of the surface. The square's position is
  // stored as the offset of its centre from the surface centre (ox, oy), so
  //   squareCentre = (w / 2 + ox, h / 2 + oy)   and   error = (ox, oy).
  // The same numbers drive placement, clamping, scoring and the reveal.
  const state = {
    w: 0, h: 0,
    ox: 0, oy: 0,
    round: 0,          // 0-based
    phase: 'idle',     // idle | play | revealed | done
    results: [],       // { dx, dy, distance } per submitted round
    submittedAt: 0,
  };
  let drag = null;     // { id, gx, gy } while a pointer is dragging

  // Whole-pixel bounds keep 1px steps on the integer lattice after hitting a wall.
  const maxX = () => Math.max(0, Math.floor(state.w / 2 - HALF));
  const maxY = () => Math.max(0, Math.floor(state.h / 2 - HALF));
  const clamp = (v, m) => Math.min(m, Math.max(-m, v));

  const fmt = (v) => v.toFixed(1);
  const fmtDistance = (d) => (d < 0.05 ? '<0.1' : fmt(d)) + ' CSS px';

  function verdict(d) {
    if (d < 0.5) return 'Pixel perfect.';
    if (d < 3) return 'That’s a designer’s eye.';
    if (d < 8) return 'Almost. Just one more pixel.';
    return 'Your eyes have opinions.';
  }

  function describeAxis(v, negative, positive, centred) {
    const a = Math.abs(v);
    return a < 0.05 ? centred : `${fmt(a)} px ${v < 0 ? negative : positive}`;
  }

  // Random whole-pixel start, 40–90px from centre (range shrinks for tiny surfaces).
  function randomStart() {
    const mx = maxX(), my = maxY();
    const hi = Math.min(90, Math.hypot(mx, my));
    const lo = hi >= 50 ? 40 : hi * 0.6;
    for (let i = 0; i < 300; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = lo + Math.random() * (hi - lo);
      const x = Math.round(Math.cos(angle) * dist), y = Math.round(Math.sin(angle) * dist);
      const d = Math.hypot(x, y);
      if (Math.abs(x) <= mx && Math.abs(y) <= my && d >= lo && d <= hi && d > 0) return { x, y };
    }
    const sign = Math.random() < 0.5 ? -1 : 1;
    return mx >= my ? { x: sign * Math.min(mx, 40), y: 0 } : { x: 0, y: sign * Math.min(my, 40) };
  }

  function render() {
    const tx = state.w / 2, ty = state.h / 2;
    // Clamp for display only; a submitted offset is never rewritten.
    const cx = tx + clamp(state.ox, maxX()), cy = ty + clamp(state.oy, maxY());
    square.style.transform = `translate(${cx - HALF}px, ${cy - HALF}px)`;
    square.classList.toggle('is-ready', state.phase !== 'idle');
    if (state.phase !== 'revealed') return;
    const set = (id, attrs) => { for (const k in attrs) $(id).setAttribute(k, attrs[k]); };
    set('link', { x1: cx, y1: cy, x2: tx, y2: ty });
    set('dot', { cx, cy });
    set('crossH', { x1: tx - 7, y1: ty, x2: tx + 7, y2: ty });
    set('crossV', { x1: tx, y1: ty - 7, x2: tx, y2: ty + 7 });
  }

  function moveTo(ox, oy) {
    if (state.phase !== 'play') return;
    state.ox = clamp(ox, maxX());
    state.oy = clamp(oy, maxY());
    render();
  }

  function setLocked(locked) {
    game.classList.toggle('is-locked', locked);
    nudges.forEach((b) => { b.disabled = locked; });
  }

  function startRound() {
    endDrag();
    const start = randomStart();
    state.ox = start.x;
    state.oy = start.y;
    state.phase = 'play';
    game.classList.remove('is-revealed');
    setLocked(false);
    $('round').textContent = `Round ${state.round + 1} of ${ROUNDS}`;
    $('hint').hidden = false;
    $('result').hidden = true;
    $('live').textContent = '';
    primary.textContent = 'Looks centred';
    render();
  }

  function submit() {
    if (state.phase !== 'play') return;
    endDrag();
    state.phase = 'revealed';
    state.submittedAt = performance.now();
    const dx = state.ox, dy = state.oy; // = squareCentre - target, unrounded
    const distance = Math.hypot(dx, dy);
    state.results.push({ dx, dy, distance });

    const detail = describeAxis(dx, 'left', 'right', 'centred horizontally') + ' · ' +
                   describeAxis(dy, 'above', 'below', 'centred vertically');
    $('resultDistance').textContent = fmtDistance(distance);
    $('resultMessage').textContent = verdict(distance);
    $('resultDetail').textContent = detail;
    $('hint').hidden = true;
    $('result').hidden = false;
    $('live').textContent =
      `Round ${state.round + 1}: ${fmtDistance(distance)} from centre. ${detail}. ${verdict(distance)}`;

    setLocked(true);
    game.classList.add('is-revealed');
    primary.textContent = state.round + 1 < ROUNDS ? 'Next round' : 'See results';
    render();
    primary.focus({ preventScroll: true });
  }

  function advance() {
    if (state.phase !== 'revealed' || performance.now() - state.submittedAt < ADVANCE_GUARD_MS) return;
    if (state.round + 1 < ROUNDS) {
      state.round++;
      startRound();
      surface.focus({ preventScroll: true });
    } else {
      showSummary();
    }
  }

  function showSummary() {
    state.phase = 'done';
    const errors = state.results.map((r) => r.distance);
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    const stat = (id, d) => { $(id).innerHTML = `${d < 0.05 ? '&lt;0.1' : fmt(d)}<small>CSS px</small>`; };
    stat('meanError', mean);
    stat('bestError', Math.min(...errors));
    $('roundList').innerHTML = errors
      .map((d, i) => `<li><span>Round ${i + 1}</span><b>${d < 0.05 ? '&lt;0.1' : fmt(d)} px</b></li>`)
      .join('');
    $('live').textContent = '';
    game.classList.add('is-off');
    summary.classList.remove('is-off');
    $('summaryTitle').focus({ preventScroll: true });
  }

  function reset() {
    state.round = 0;
    state.results = [];
    summary.classList.add('is-off');
    game.classList.remove('is-off');
    startRound();
    surface.focus({ preventScroll: true });
  }

  // ---- Pointer dragging -------------------------------------------------
  function pointerPos(e) {
    const r = surface.getBoundingClientRect();
    // Scale factor keeps CSS-pixel maths right if an embedder transforms the frame.
    const sx = r.width ? state.w / r.width : 1, sy = r.height ? state.h / r.height : 1;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  function endDrag() {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    square.classList.remove('is-dragging');
    try { square.releasePointerCapture(id); } catch (_) { /* already released */ }
  }

  surface.addEventListener('pointerdown', () => surface.focus({ preventScroll: true }));

  square.addEventListener('pointerdown', (e) => {
    if (state.phase !== 'play' || drag || e.button !== 0) return;
    e.preventDefault();
    surface.focus({ preventScroll: true });
    const p = pointerPos(e);
    // Remember where inside the square it was grabbed so it does not jump.
    drag = { id: e.pointerId, gx: p.x - (state.w / 2 + state.ox), gy: p.y - (state.h / 2 + state.oy) };
    square.classList.add('is-dragging');
    try { square.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
  });

  square.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = pointerPos(e);
    moveTo(p.x - drag.gx - state.w / 2, p.y - drag.gy - state.h / 2);
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    square.addEventListener(type, (e) => { if (drag && e.pointerId === drag.id) endDrag(); });
  }
  square.addEventListener('dragstart', (e) => e.preventDefault());

  // ---- Keyboard (only while the play area itself is focused) --------------
  const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

  surface.addEventListener('keydown', (e) => {
    if (e.target !== surface || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Enter') {
      e.preventDefault(); // also stops the keypress from activating the newly focused button
      if (!e.repeat) submit();
      return;
    }
    const dir = KEYS[e.key];
    if (!dir) return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    moveTo(state.ox + dir[0] * step, state.oy + dir[1] * step);
  });

  // ---- Buttons ------------------------------------------------------------
  nudges.forEach((b) => b.addEventListener('click', () => {
    moveTo(state.ox + Number(b.dataset.dx), state.oy + Number(b.dataset.dy));
  }));

  // A held Enter/Space must never chain submit → next round → restart.
  const blockRepeat = (e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); };
  primary.addEventListener('keydown', blockRepeat);
  restart.addEventListener('keydown', blockRepeat);

  primary.addEventListener('click', () => (state.phase === 'play' ? submit() : advance()));
  restart.addEventListener('click', reset);

  // ---- Surface size ---------------------------------------------------------
  new ResizeObserver((entries) => {
    const { width, height } = entries[entries.length - 1].contentRect;
    state.w = width;
    state.h = height;
    if (state.phase === 'idle') {
      if (width > 0 && height > 0) startRound();
    } else if (state.phase === 'play') {
      moveTo(state.ox, state.oy); // re-clamp; submitted rounds are left untouched
    } else {
      render();
    }
  }).observe(surface);

  // Read/write hook for automated checks (tests/verify.js). Not used by the game.
  window.__pixel = { state, moveTo };
})();
