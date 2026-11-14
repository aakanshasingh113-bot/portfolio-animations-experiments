// Browser checks for Just One More Pixel.  Run: node tests/verify.js  (needs Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let failed = 0;
const check = (name, ok, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
};
const st = (page) => page.evaluate(() => {
  const s = window.__pixel.state;
  return { w: s.w, h: s.h, ox: s.ox, oy: s.oy, round: s.round, phase: s.phase, results: s.results.slice() };
});
const setOff = (page, x, y) => page.evaluate(([x, y]) => window.__pixel.moveTo(x, y), [x, y]);
// Square centre measured from the DOM, relative to the surface's top-left.
const domCentre = (page) => page.evaluate(() => {
  const s = document.getElementById('surface').getBoundingClientRect();
  const q = document.getElementById('square').getBoundingClientRect();
  return { x: q.left + q.width / 2 - s.left, y: q.top + q.height / 2 - s.top, w: q.width, h: q.height, sw: s.width, sh: s.height };
});
const SHOTS = process.env.SHOTS; // optional directory for screenshots
const shot = (page, name) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, name) }) : null);
const wait = (page, ms = 350) => page.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch();

  // ---------- Desktop ----------
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await page.waitForFunction(() => window.__pixel.state.phase === 'play');

  let s = await st(page), c = await domCentre(page);
  check('surface is 560 x 300 on desktop', s.w === 560 && s.h === 300, `${s.w}x${s.h}`);
  check('square is 36 x 36', c.w === 36 && c.h === 36);
  check('DOM centre matches state (centre-based placement)', Math.abs(c.x - (s.w / 2 + s.ox)) < 1e-6 && Math.abs(c.y - (s.h / 2 + s.oy)) < 1e-6);
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth);
  check('fits 1280x720 without scrolling', fits);
  check('no hints before submit', await page.evaluate(() => getComputedStyle(document.getElementById('overlay')).opacity === '0' && document.getElementById('result').hidden));

  // Start-offset distribution
  const starts = [];
  for (let i = 0; i < 40; i++) {
    await page.reload();
    await page.waitForFunction(() => window.__pixel.state.phase === 'play');
    const t = await st(page);
    starts.push(t);
  }
  const ds = starts.map((t) => Math.hypot(t.ox, t.oy));
  check('start distance always within 40–90', ds.every((d) => d >= 40 && d <= 90), `min ${Math.min(...ds).toFixed(1)} max ${Math.max(...ds).toFixed(1)}`);
  check('start direction varies (all four sides seen)', starts.some((t) => t.ox < 0) && starts.some((t) => t.ox > 0) && starts.some((t) => t.oy < 0) && starts.some((t) => t.oy > 0));
  check('start stays inside surface', starts.every((t) => Math.abs(t.ox) <= 262 && Math.abs(t.oy) <= 132));

  // Arrow keys do nothing (and are not prevented) when the play area is not focused
  await setOff(page, 0, 0);
  await page.evaluate(() => { window.__prevented = null; document.addEventListener('keydown', (e) => setTimeout(() => { window.__prevented = e.defaultPrevented; })); });
  await page.keyboard.press('ArrowRight');
  await wait(page, 30);
  s = await st(page);
  check('arrows ignored when play area unfocused', s.ox === 0 && s.oy === 0 && (await page.evaluate(() => window.__prevented)) === false);
  await page.focus('#primary');
  await page.keyboard.press('ArrowDown');
  await wait(page, 30);
  s = await st(page);
  check('arrows not hijacked on other controls', s.oy === 0 && (await page.evaluate(() => window.__prevented)) === false);

  // Keyboard: 1px and 10px, each direction
  await page.focus('#surface');
  const keyCases = [['ArrowRight', 1, 0], ['ArrowLeft', -1, 0], ['ArrowUp', 0, -1], ['ArrowDown', 0, 1]];
  for (const [key, kx, ky] of keyCases) {
    await setOff(page, 0, 0);
    await page.keyboard.press(key);
    let a = await st(page), d = await domCentre(page);
    check(`${key} moves exactly 1px`, a.ox === kx && a.oy === ky && d.x === 280 + kx && d.y === 150 + ky);
    await page.keyboard.press('Shift+' + key);
    a = await st(page);
    check(`Shift+${key} moves exactly 10px`, a.ox === kx * 11 && a.oy === ky * 11);
  }
  await wait(page, 30);
  check('handled arrow keys are preventDefault-ed', (await page.evaluate(() => window.__prevented)) === true);
  // key repeat: each keydown = 1px
  await setOff(page, 0, 0);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  check('repeated keydown moves 1px each', (await st(page)).ox === 3);

  // Direction buttons
  for (const [label, kx, ky] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
    await setOff(page, 0, 0);
    await page.click(`button[aria-label="Move ${label} 1 pixel"]`);
    const a = await st(page);
    check(`button ${label} moves exactly 1px`, a.ox === kx && a.oy === ky);
  }
  const sizes = await page.$$eval('.nudge', (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  check('direction buttons are >= 44px', sizes.length === 4 && sizes.every((v) => v >= 44));

  // Clamping
  await page.focus('#surface');
  await setOff(page, 0, 0);
  for (let i = 0; i < 40; i++) await page.keyboard.press('Shift+ArrowLeft');
  for (let i = 0; i < 40; i++) await page.keyboard.press('Shift+ArrowUp');
  c = await domCentre(page);
  check('clamped at top-left (square fully inside)', c.x === 18 && c.y === 18, `${c.x},${c.y}`);
  for (let i = 0; i < 80; i++) await page.keyboard.press('Shift+ArrowRight');
  for (let i = 0; i < 80; i++) await page.keyboard.press('Shift+ArrowDown');
  c = await domCentre(page);
  check('clamped at bottom-right (square fully inside)', c.x === 560 - 18 && c.y === 300 - 18, `${c.x},${c.y}`);

  // Mouse drag: no jump, preserves grab offset, capture outside, clamp
  await setOff(page, -100, -50);
  const box = await page.locator('#surface').boundingBox();
  const gx = box.x + 180 + 11, gy = box.y + 100 - 9; // grab off-centre inside the square
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  let a = await st(page);
  check('drag start does not jump', a.ox === -100 && a.oy === -50);
  check('play area focused when drag begins', await page.evaluate(() => document.activeElement.id === 'surface'));
  await page.mouse.move(gx + 37, gy + 21, { steps: 4 });
  a = await st(page);
  check('drag follows pointer with grab offset', a.ox === -63 && a.oy === -29, `${a.ox},${a.oy}`);
  await page.mouse.move(box.x - 200, box.y - 200, { steps: 4 }); // leave the surface entirely
  c = await domCentre(page);
  check('drag keeps working outside and clamps', c.x === 18 && c.y === 18);
  await page.mouse.move(gx, gy, { steps: 4 });
  a = await st(page);
  check('drag returns under pointer after clamp', a.ox === -100 && a.oy === -50);
  await page.mouse.up();
  await page.mouse.move(gx + 50, gy + 50);
  a = await st(page);
  check('drag ends on pointerup', a.ox === -100 && a.oy === -50);

  // pointercancel / lostpointercapture safety
  await page.evaluate(() => {
    const q = document.getElementById('square'), r = q.getBoundingClientRect();
    const ev = (t, x, y) => q.dispatchEvent(new PointerEvent(t, { pointerId: 77, pointerType: 'pen', button: 0, isPrimary: true, bubbles: true, clientX: x, clientY: y }));
    ev('pointerdown', r.left + 5, r.top + 5);
    ev('pointermove', r.left + 25, r.top + 5);
    ev('pointercancel', r.left + 25, r.top + 5);
    ev('pointermove', r.left + 125, r.top + 5);
  });
  a = await st(page);
  check('pen drag works and pointercancel ends it', a.ox === -80 && a.oy === -50, `${a.ox},${a.oy}`);

  // Exact scoring: 3,4 -> 5
  await setOff(page, 3, 4);
  await page.focus('#surface');
  await page.keyboard.press('Enter');
  s = await st(page);
  check('dx=3, dy=4 gives exactly 5', s.results.length === 1 && s.results[0].dx === 3 && s.results[0].dy === 4 && s.results[0].distance === 5);
  check('result text for 5px', (await page.textContent('#resultDistance')) === '5.0 CSS px' && (await page.textContent('#resultMessage')) === 'Almost. Just one more pixel.' && (await page.textContent('#resultDetail')) === '3.0 px right · 4.0 px below');
  check('aria-live announces result', (await page.textContent('#live')).includes('5.0 CSS px') && (await page.getAttribute('#live', 'aria-live')) === 'polite');
  check('focus moves to Next round', await page.evaluate(() => document.activeElement.id === 'primary' && document.activeElement.textContent === 'Next round'));
  c = await domCentre(page);
  check('square stays where placed after submit', c.x === 283 && c.y === 154);

  // Reveal geometry
  await wait(page);
  const rev = await page.evaluate(() => {
    const g = (id, k) => Number(document.getElementById(id).getAttribute(k));
    const o = document.getElementById('overlay'), sr = document.getElementById('surface').getBoundingClientRect(), or = o.getBoundingClientRect();
    return {
      link: [g('link', 'x1'), g('link', 'y1'), g('link', 'x2'), g('link', 'y2')],
      cross: document.getElementById('mark').getAttribute('transform'),
      loupe: [g('loupeLine', 'x2'), g('loupeLine', 'y2'), document.getElementById('loupeZoom').textContent].join(),
      meter: document.querySelectorAll('#meter .on').length,
      sameBox: or.left === sr.left && or.top === sr.top && or.width === sr.width && or.height === sr.height,
      pe: getComputedStyle(o).pointerEvents, op: getComputedStyle(o).opacity,
      ctm: (() => { const m = document.getElementById('link').getScreenCTM(); return [m.a, m.d, m.e - sr.left, m.f - sr.top]; })(),
    };
  });
  check('dashed line runs square centre -> true centre', rev.link.join() === '283,154,280,150');
  check('crosshair centred on true centre', rev.cross === 'translate(280 150)', rev.cross);
  check('loupe shows magnified miss, meter shows tier', rev.loupe === [3 * 4.6, 4 * 4.6, '5\u00D7'].join() && rev.meter === 2, rev.loupe);
  check('overlay maps 1:1 onto surface, no pointer events, visible', rev.sameBox && rev.pe === 'none' && rev.op === '1' && rev.ctm.join() === '1,1,0,0', JSON.stringify(rev.ctm));

  // Locked after submit; duplicate submissions ignored
  await page.focus('#surface');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.mouse.move(box.x + 283, box.y + 154);
  await page.mouse.down();
  await page.mouse.move(box.x + 350, box.y + 200, { steps: 3 });
  await page.mouse.up();
  s = await st(page);
  check('manipulation disabled after submit', s.ox === 3 && s.oy === 4 && (await page.$$eval('.nudge', (b) => b.every((x) => x.disabled))));
  check('second submit does not record twice', s.results.length === 1 && s.round === 0 && s.phase === 'revealed');
  await shot(page, 'desktop-reveal.png');

  // Resize after submit keeps recorded result; redraws correctly when space returns
  await page.setViewportSize({ width: 200, height: 720 });
  await wait(page, 150);
  s = await st(page);
  check('resize after submit keeps recorded result', s.results[0].distance === 5 && s.ox === 3 && s.oy === 4);
  await page.setViewportSize({ width: 1280, height: 720 });
  await wait(page, 150);
  c = await domCentre(page);
  check('submitted placement redrawn after resize back', c.x === 283 && c.y === 154);

  // Round 2: exact centre, double-click must not skip the reveal, held Enter must not chain
  await wait(page);
  await page.click('#primary');
  s = await st(page);
  check('Next round starts round 2 with fresh offset', s.round === 1 && s.phase === 'play' && Math.hypot(s.ox, s.oy) >= 40 && (await page.textContent('#round')) === 'Round 2 of 3');
  check('focus returns to play area', await page.evaluate(() => document.activeElement.id === 'surface'));
  check('reveal hidden again', await page.evaluate(() => !document.getElementById('game').classList.contains('is-revealed') && document.getElementById('result').hidden));
  await setOff(page, 0, 0);
  await page.dblclick('#primary');
  s = await st(page);
  check('double-click submits once and does not advance', s.results.length === 2 && s.round === 1 && s.phase === 'revealed');
  check('mathematical centre gives zero error', s.results[1].distance === 0 && s.results[1].dx === 0 && s.results[1].dy === 0);
  check('zero shown as <0.1 CSS px, Pixel perfect', (await page.textContent('#resultDistance')) === '<0.1 CSS px' && (await page.textContent('#resultMessage')) === 'Pixel perfect.' && (await page.textContent('#resultDetail')) === 'centred horizontally · centred vertically');

  await wait(page);
  await page.click('#primary'); // round 3
  await setOff(page, -2.4, -1.7);
  // resize during play must not create error
  await page.setViewportSize({ width: 500, height: 600 });
  await wait(page, 150);
  s = await st(page); c = await domCentre(page);
  check('resize during play keeps offset from centre', s.ox === -2.4 && s.oy === -1.7 && Math.abs(c.x - (c.sw / 2 - 2.4)) < 0.02 && Math.abs(c.y - (c.sh / 2 - 1.7)) < 0.02, `surface ${s.w}x${s.h} dom ${c.x},${c.y} state ${s.ox},${s.oy}`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await wait(page, 150);
  await page.focus('#surface');
  // Held Enter: keydown + repeats must submit once and never advance
  await page.keyboard.down('Enter');
  for (let i = 0; i < 5; i++) await page.keyboard.down('Enter');
  await wait(page, 400);
  for (let i = 0; i < 5; i++) await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  s = await st(page);
  check('held Enter submits once and does not advance', s.results.length === 3 && s.phase === 'revealed');
  check('fractional precision kept internally', Math.abs(s.results[2].distance - Math.hypot(2.4, 1.7)) < 1e-12);
  check('directional text: left / above', (await page.textContent('#resultDetail')) === '2.4 px left · 1.7 px above' && (await page.textContent('#resultMessage')) === 'That’s a designer’s eye.');
  check('last round button says See results', (await page.textContent('#primary')) === 'See results');

  await page.keyboard.press('Enter');
  s = await st(page);
  const mean = (5 + 0 + Math.hypot(2.4, 1.7)) / 3;
  check('summary shown with focus on heading', s.phase === 'done' && await page.evaluate(() => document.activeElement.id === 'summaryTitle' && getComputedStyle(document.getElementById('game')).visibility === 'hidden'));
  check('square hidden in summary', await page.evaluate(() => getComputedStyle(document.getElementById('square')).visibility === 'hidden'));
  check('summary heading', (await page.textContent('#summaryTitle')) === 'You have an eye for this.');
  check('mean error correct', (await page.textContent('#meanError')) === mean.toFixed(1) + 'CSS px', await page.textContent('#meanError'));
  check('best error correct', (await page.textContent('#bestError')) === '<0.1CSS px', await page.textContent('#bestError'));
  check('three round errors listed', (await page.$$eval('#roundList b', (n) => n.map((x) => x.textContent))).join('|') === '5.0 px|<0.1 px|2.9 px');
  check('shot map plots the three rounds', await page.evaluate(() => [...document.querySelectorAll('#shots .shot')].map((g) => g.getAttribute('transform')).join('|') === 'translate(30 40)|translate(0 0)|translate(-24 -17)') && (await page.textContent('#mapScale')) === 'Outer ring: 6.0 px');
  check('personal best noted', (await page.textContent('#bestNote')).length > 0);
  await shot(page, 'desktop-summary.png');

  await page.keyboard.press('Tab');
  check('Tab reaches Try again', await page.evaluate(() => document.activeElement.id === 'restart'));
  await page.keyboard.press('Enter');
  s = await st(page);
  check('Try again resets session', s.results.length === 0 && s.round === 0 && s.phase === 'play' && (await page.textContent('#round')) === 'Round 1 of 3' && (await page.textContent('#primary')) === 'Looks centred' && (await page.textContent('#live')) === '');
  check('restart shows game, hides summary, focuses play area', await page.evaluate(() => document.activeElement.id === 'surface' && getComputedStyle(document.getElementById('summary')).visibility === 'hidden' && !document.querySelector('.nudge').disabled));

  // Whole session keyboard-only (Tab from page start)
  await page.reload();
  await page.waitForFunction(() => window.__pixel.state.phase === 'play');
  await page.keyboard.press('Tab');
  check('first Tab stop is the play area with visible focus', await page.evaluate(() => document.activeElement.id === 'surface' && getComputedStyle(document.querySelector('.frame')).outlineStyle === 'solid'));
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await wait(page);
    await page.keyboard.press('Enter');
  }
  s = await st(page);
  check('three rounds playable by keyboard only', s.phase === 'done' && s.results.length === 3);
  check('no console/page errors (desktop)', errors.length === 0, errors.join('; '));
  await page.close();

  // ---------- Mobile (touch) ----------
  for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    const m = await ctx.newPage();
    await m.goto(URL);
    await m.waitForFunction(() => window.__pixel.state.phase === 'play');
    const tag = `${vp.width}x${vp.height}`;
    const o = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight, ih: innerHeight }));
    check(`no horizontal overflow @${tag}`, o.sw <= o.iw, `${o.sw}/${o.iw}`);
    check(`fits vertically @${tag}`, o.sh <= o.ih, `${o.sh}/${o.ih}`);
    let t = await st(m);
    check(`mobile surface has room @${tag}`, t.h >= 200 && t.w >= 280, `${t.w}x${t.h}`);
    check(`touch-action none only on surface @${tag}`, await m.evaluate(() => getComputedStyle(document.getElementById('surface')).touchAction === 'none' && getComputedStyle(document.body).touchAction === 'auto' && getComputedStyle(document.querySelector('.frame')).touchAction === 'auto'));

    // Touch drag through CDP (real touch -> pointer events)
    await setOff(m, 20, -30);
    const b = await m.locator('#surface').boundingBox();
    const sx = b.x + t.w / 2 + 20 + 6, sy = b.y + t.h / 2 - 30 + 4;
    const cdp = await ctx.newCDPSession(m);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await touch('touchStart', sx, sy);
    await m.waitForTimeout(60);
    let u = await st(m);
    const noJump = u.ox === 20 && u.oy === -30;
    for (let i = 1; i <= 5; i++) await touch('touchMove', sx - i * 8, sy + i * 6);
    await m.waitForTimeout(120);
    u = await st(m);
    check(`touch drag moves without jump @${tag}`, noJump && Math.abs(u.ox - -20) < 1e-6 && Math.abs(u.oy - 0) < 1e-6, `${u.ox},${u.oy}`);
    await touch('touchMove', sx + 1000, sy + 1000);
    await m.waitForTimeout(120);
    const dc = await domCentre(m);
    check(`touch drag clamps inside surface @${tag}`, dc.x + 18 <= dc.sw + 1e-6 && dc.y + 18 <= dc.sh + 1e-6 && dc.x > dc.sw - 20 && dc.y > dc.sh - 20);
    await touch('touchEnd');
    await m.waitForTimeout(60);
    // DPR must not leak into scoring
    await setOff(m, 3, 4);
    const topBefore = await m.evaluate(() => document.getElementById('primary').getBoundingClientRect().top);
    await m.tap('#primary');
    check(`no layout shift on reveal @${tag}`, topBefore === await m.evaluate(() => document.getElementById('primary').getBoundingClientRect().top));
    check(`still fits vertically after reveal @${tag}`, await m.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
    u = await st(m);
    check(`scoring in CSS px at DPR 3 @${tag}`, u.results.length === 1 && u.results[0].distance === 5);
    await m.waitForTimeout(250);
    const o2 = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    check(`no horizontal overflow after reveal @${tag}`, o2.sw <= o2.iw);
    await shot(m, `mobile-${vp.width}.png`);
    await ctx.close();
  }

  // Layout stability: reveal must not move anything
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await p2.goto(URL);
  await p2.waitForFunction(() => window.__pixel.state.phase === 'play');
  const tops = () => p2.evaluate(() => ['h1', '.frame', '.controls', '#primary'].map((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [r.top, r.left, r.width].join(); }).join('|'));
  const before = await tops();
  await shot(p2, 'desktop-play.png');
  await p2.click('#primary');
  const after = await tops();
  await p2.waitForTimeout(700);
  check('count-up settles on the exact value', /^(\d+\.\d|<0\.1) CSS px$/.test(await p2.textContent('#resultDistance')) && (await p2.textContent('#live')).includes(await p2.textContent('#resultDistance')));
  await shot(p2, 'desktop-reveal-motion.png');
  check('no layout shift on reveal', before === after);
  await p2.waitForTimeout(350);
  await p2.click('#primary'); await p2.click('#primary'); await p2.waitForTimeout(350);
  await p2.click('#primary'); await p2.click('#primary'); await p2.waitForTimeout(350);
  await p2.click('#primary');
  const h1After = await p2.evaluate(() => document.querySelector('h1').getBoundingClientRect().top);
  check('no layout shift opening summary', Number(before.split(',')[0]) === h1After);
  // Short laptop viewport
  await p2.setViewportSize({ width: 1280, height: 600 });
  check('fits 1280x600 without scrolling', await p2.evaluate(() => document.documentElement.scrollHeight <= innerHeight));

  await browser.close();
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
