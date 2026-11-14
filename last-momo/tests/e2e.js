// Browser checks. Needs Playwright with Chromium available.
// Run with:  node last-momo/tests/e2e.js [screenshot-dir]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.argv[2] || null;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failures.push(name); console.log('  FAIL ' + name + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); }
}

// Math.random is steerable from the test: window.__rand = 0.99 makes every
// "random" choice the last option (14 momos, Momo plays the non-optimal 2).
const STEER = `(() => { const real = Math.random; window.__rand = null; Math.random = () => (window.__rand === null ? real() : window.__rand); })();`;

const st = (page) => page.evaluate(() => window.LastMomo.getState());
const waitPhase = (page, ...phases) =>
  page.waitForFunction((p) => p.includes(window.LastMomo.getState().phase), phases, { timeout: 8000 });
const sum = (s) => s.collected.human + s.collected.computer + s.remaining;
const shot = (page, name) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, name + '.png') }) : null);

async function open(browser, opts = {}, init = STEER) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 420, height: 720 } }, opts));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(init);
  await page.goto(BASE);
  return { ctx, page, errors };
}

// Human takes n, then we wait until control comes back (or the match ends).
async function turn(page, n) {
  await page.click(n === 1 ? '#take1' : '#take2');
  await waitPhase(page, 'humanTurn', 'gameOver');
  return st(page);
}

let BASE;

async function main() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();

  /* ------------------------------------------------------------------ */
  console.log('\nCore play (steered: 14 momos, Momo always takes 2)');
  {
    const { ctx, page, errors } = await open(browser);
    await page.evaluate(() => { window.__rand = 0.99; window.LastMomo.restart(); window.LastMomo.restart(); });
    // two restarts => match 3, human starts again, fresh state
    let s = await st(page);
    check('page shows title, subtitle and rules', await page.evaluate(() =>
      document.querySelector('h1').textContent === 'Last Momo' &&
      document.querySelector('.tagline').textContent === 'Friendship ends at the last bite.' &&
      document.querySelector('.rules').textContent === 'Take 1 or 2. Whoever takes the last momo wins.'));
    check('match starts on the human with 14 on the plate', s.phase === 'humanTurn' && s.remaining === 14 && s.starter === 'human', s);
    check('plate shows one illustrated momo per slot', (await page.locator('.momo').count()) === 14);
    check('sound starts off', s.soundOn === false && (await page.getAttribute('#sound', 'aria-pressed')) === 'false');

    await page.click('#take1');
    s = await st(page);
    check('Take 1 removes exactly one', s.remaining === 13 && s.collected.human === 1, s);
    check('both buttons lock immediately after a move', await page.evaluate(() => take1.disabled && take2.disabled));
    check('turn label switches to Momo', (await page.textContent('#turn-text')) === 'Momo’s turn');
    check('move announced politely', (await page.textContent('#live')) === 'You took 1. 13 left. Momo’s turn.' &&
      (await page.getAttribute('#live', 'aria-live')) === 'polite');

    await waitPhase(page, 'computerThinking');
    const thinking = await st(page);
    check('Momo shows a thinking expression', (await page.getAttribute('#bot', 'data-mood')) === 'thinking');
    await page.hover('#take2');
    await page.hover('#take1');
    const hovered = await st(page);
    check('hovering changes neither the count nor Momo’s decided move',
      hovered.remaining === thinking.remaining && hovered.pendingMove === thinking.pendingMove && hovered.phase === 'computerThinking');
    await page.evaluate(() => { take1.click(); take2.click(); });
    check('clicks during Momo’s turn are rejected', (await st(page)).remaining === 13);

    await waitPhase(page, 'humanTurn');
    s = await st(page);
    check('Momo moved exactly once (13 -> 11)', s.remaining === 11 && s.collected.computer === 2, s);
    check('counter text matches state', (await page.textContent('#remaining')) === '11' &&
      (await page.textContent('#you-count')) === '1' && (await page.textContent('#momo-count')) === '2');
    check('totals add up to the starting count', sum(s) === s.startCount);

    // resize mid-match
    await page.setViewportSize({ width: 340, height: 600 });
    await page.setViewportSize({ width: 800, height: 520 });
    await page.setViewportSize({ width: 420, height: 720 });
    const resized = await st(page);
    check('resizing does not reset or change the match', resized.matchId === s.matchId && resized.remaining === 11 && resized.phase === 'humanTurn');

    // rapid clicking
    await page.evaluate(() => { take1.click(); take1.click(); take1.click(); take2.click(); });
    s = await st(page);
    check('rapid clicks make only one move', s.remaining === 10 && s.collected.human === 2, s);
    await waitPhase(page, 'humanTurn');
    s = await st(page);
    check('still one Momo move per turn (10 -> 8)', s.remaining === 8 && sum(s) === 14, s);

    s = await turn(page, 1);                          // 8 -> 7 -> 5
    check('at five left: "Getting serious." and Momo leans in', s.remaining === 5 &&
      (await page.textContent('#stage')) === 'Getting serious.' && (await page.getAttribute('#game', 'data-stage')) === 'serious', s);

    await page.click('#take2');                       // 5 -> 3
    s = await st(page);
    check('Take 2 removes exactly two', s.remaining === 3 && s.collected.human === 5, s);
    await waitPhase(page, 'humanTurn');               // Momo: 3 -> 1
    s = await st(page);
    check('one momo left on the human turn', s.remaining === 1 && sum(s) === 14, s);
    check('"Take 2" is disabled with one remaining, "Take 1" is not', await page.evaluate(() => take2.disabled && !take1.disabled));
    check('final bites status and plate emphasis', (await page.textContent('#stage')) === 'The final bites.' &&
      (await page.getAttribute('#game', 'data-stage')) === 'final');
    await page.evaluate(() => take2.click());
    check('illegal Take 2 is ignored', (await st(page)).remaining === 1);
    await shot(page, 'final-bites');

    await page.click('#take1');
    s = await st(page);
    check('taking the last momo wins immediately for the human', s.phase === 'gameOver' && s.winner === 'human' && s.remaining === 0, s);
    check('human score incremented once', s.scores.human === 1 && s.scores.computer === 0);
    check('celebration fired once, with confetti', s.celebrations === 3 - 2 && s.liveParticles > 0, s);
    check('result shown inline', (await page.textContent('#result-msg')) === 'You got the last momo!' &&
      (await page.textContent('#result-score')) === 'You 1 — Momo 0' &&
      await page.evaluate(() => !document.querySelector('dialog,[role=dialog],[aria-modal]') &&
        getComputedStyle(document.getElementById('panel-result')).visibility === 'visible'));
    check('focus moves to Rematch', await page.evaluate(() => document.activeElement.id === 'rematch'));
    check('winner announced', (await page.textContent('#live')).startsWith('You got the last momo!'));
    check('strategy stays collapsed until opened', await page.evaluate(() => !hint.open));
    check('confetti stays clear of the controls', await page.evaluate(() => {
      const top = document.querySelector('.console').getBoundingClientRect().top;
      return getComputedStyle(fx).overflow === 'hidden' && fx.getBoundingClientRect().bottom <= top + 1;
    }));
    await page.waitForTimeout(400);
    await shot(page, 'human-win');
    await page.waitForTimeout(1900);
    const later = await st(page);
    check('no further turn or celebration after the win', later.phase === 'gameOver' && later.celebrations === 1 &&
      later.scores.human === 1 && later.scores.computer === 0 && later.pendingTimers === 0 && later.liveParticles === 0, later);
    await page.click('#hint summary');
    check('strategy text appears when opened', await page.evaluate(() => hint.open) &&
      (await page.textContent('#hint p')).startsWith('Try leaving 3, 6, or 9 momos.'));

    /* Momo starts and wins the next match */
    await page.click('#rematch');
    s = await st(page);
    check('starter alternates: Momo opens the next match', s.starter === 'computer' && s.phase === 'computerThinking' && s.remaining === 14, s);
    check('buttons locked while Momo opens', await page.evaluate(() => take1.disabled && take2.disabled));
    check('strategy collapses again on rematch', await page.evaluate(() => !hint.open));
    await waitPhase(page, 'humanTurn');
    check('focus returns to a take button', await page.evaluate(() => ['take1', 'take2'].includes(document.activeElement.id)));
    s = await turn(page, 2);                          // 12 -> 10 -> 8
    s = await turn(page, 2);                          // 8 -> 6 -> 4
    check('mid-match totals add up', s.remaining === 4 && sum(s) === 14, s);
    await page.click('#take2');                       // 4 -> 2, Momo must take both
    await waitPhase(page, 'gameOver');
    s = await st(page);
    check('Momo takes the last two and wins', s.winner === 'computer' && s.lastMove.count === 2 && s.remaining === 0, s);
    check('Momo score incremented once', s.scores.human === 1 && s.scores.computer === 1 && s.celebrations === 2);
    check('loss shown inline', (await page.textContent('#result-msg')) === 'Momo got the last momo.' &&
      (await page.textContent('#result-score')) === 'You 1 — Momo 1' && (await page.textContent('#turn-text')) === 'Momo wins');
    check('Momo celebrates', (await page.getAttribute('#bot', 'data-mood')) === 'happy' && s.liveParticles > 0);
    await shot(page, 'momo-win');

    /* Rematch while the win effects are still running */
    await page.click('#rematch');
    s = await st(page);
    check('rematch mid-effects starts clean', s.matchId === 5 && s.starter === 'human' && s.phase === 'humanTurn' &&
      s.remaining === 14 && s.liveParticles === 0 && s.collected.human === 0 && s.collected.computer === 0, s);
    await page.waitForTimeout(1600);
    let s2 = await st(page);
    check('stale effect callbacks leave the new match untouched', s2.remaining === 14 && s2.phase === 'humanTurn' &&
      s2.celebrations === 2 && s2.scores.human === 1 && s2.scores.computer === 1, s2);

    /* Abandon a match mid-thinking: its timers must not move in the next one */
    await page.click('#take1');
    await waitPhase(page, 'computerThinking');
    await page.evaluate(() => { window.LastMomo.restart(); window.LastMomo.restart(); });
    s = await st(page);
    check('restart cancels pending timers', s.pendingTimers === 0 && s.phase === 'humanTurn' && s.remaining === s.startCount, s);
    await page.waitForTimeout(1500);
    s2 = await st(page);
    check('abandoned match callbacks never fire', s2.matchId === s.matchId && s2.remaining === s.startCount &&
      s2.phase === 'humanTurn' && s2.collected.computer === 0, s2);
    check('no console or page errors', errors.length === 0, errors);
    await ctx.close();
  }

  /* ------------------------------------------------------------------ */
  console.log('\nMomo’s best play and speech bubbles (steered: optimal choices)');
  {
    const { ctx, page, errors } = await open(browser);
    await page.evaluate(() => { window.__rand = 0; window.LastMomo.restart(); window.LastMomo.restart(); });
    let s = await st(page);
    check('steered start is 10', s.remaining === 10 && s.phase === 'humanTurn');
    await page.click('#take2');                       // 10 -> 8; best reply is 2 (leaves 6)
    await waitPhase(page, 'computerThinking');
    check('Momo decides once: the move that leaves a multiple of three', (await st(page)).pendingMove === 2);
    await waitPhase(page, 'humanTurn');
    s = await st(page);
    check('Momo left six', s.remaining === 6, s);
    const lines = ['Just one. I’m being polite.', 'Taking two. No regrets.', 'You’re counting, aren’t you?', 'That chutney won’t save you.'];
    const bubble = await page.textContent('#bubble');
    check('a fitting speech bubble shows', bubble === 'Taking two. No regrets.' || bubble === 'That chutney won’t save you.', bubble);
    check('bubble does not cover the plate', await page.evaluate(() => {
      const b = bubble.getBoundingClientRect(), p = plate.getBoundingClientRect();
      return bubble.classList.contains('is-on') && b.bottom <= p.top + 2 && b.right <= innerWidth;
    }));
    await shot(page, 'bubble');
    s = await turn(page, 1);                          // 6 -> 5 -> Momo takes 2 -> 3
    check('Momo leaves three', s.remaining === 3, s);
    check('no bubble two turns running', !(await page.evaluate(() => bubble.classList.contains('is-on'))) ||
      (await page.textContent('#bubble')) === bubble);
    s = await turn(page, 1);                          // 3 -> 2 -> Momo takes both
    check('Momo takes the last two when it can', s.winner === 'computer' && s.lastMove.count === 2, s);
    check('bubble lines are only the four written ones', lines.includes(bubble));
    check('no errors', errors.length === 0, errors);
    await ctx.close();
  }

  /* ------------------------------------------------------------------ */
  console.log('\nKeyboard only, unsteered, three full matches');
  {
    const { ctx, page, errors } = await open(browser, {}, '');
    const tabOrder = [];
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); tabOrder.push(await page.evaluate(() => document.activeElement.id)); }
    check('tab order: sound, Take 1, Take 2', tabOrder.join() === 'sound,take1,take2', tabOrder);
    check('focus ring is visible', await page.evaluate(() => {
      const c = getComputedStyle(document.activeElement);
      return document.activeElement.matches(':focus-visible') && c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2;
    }));
    await page.keyboard.press('Shift+Tab');
    let ok = true, focusOk = true, starters = [], moves = 0;
    const t0 = Date.now();
    for (let match = 0; match < 3; match++) {
      let s = await st(page);
      starters.push(s.starter);
      await waitPhase(page, 'humanTurn', 'gameOver');
      while ((s = await st(page)).phase !== 'gameOver') {
        const id = await page.evaluate(() => document.activeElement.id);
        if (id !== 'take1' && id !== 'take2') focusOk = false;
        const before = s.remaining;
        await page.keyboard.press(moves++ % 2 ? 'Space' : 'Enter');
        const after = await st(page);
        const took = before - after.remaining;
        if (took !== (id === 'take2' ? 2 : 1) || sum(after) !== after.startCount) ok = false;
        await waitPhase(page, 'humanTurn', 'gameOver');
        const settled = await st(page);
        if (settled.phase === 'humanTurn' && ![1, 2].includes(after.remaining - settled.remaining)) ok = false;
        if (sum(settled) !== settled.startCount) ok = false;
      }
      if (s.scores.human + s.scores.computer !== match + 1 || s.celebrations !== match + 1) ok = false;
      if ((await page.evaluate(() => document.activeElement.id)) !== 'rematch') focusOk = false;
      if (match < 2) await page.keyboard.press(match ? 'Space' : 'Enter');
    }
    check('three matches played with Enter and Space only', ok);
    check('focus stays on the action buttons, then Rematch', focusOk);
    check('starters alternate human, Momo, human', starters.join() === 'human,computer,human', starters);
    console.log('       (3 keyboard matches took ' + ((Date.now() - t0) / 1000).toFixed(1) + 's with instant human moves)');

    // Holding a key down must not auto-play
    await page.keyboard.press('Enter');                // rematch -> match 4, Momo starts
    await waitPhase(page, 'humanTurn');
    const before = await st(page);
    await page.keyboard.down('Enter');
    for (let i = 0; i < 6; i++) await page.keyboard.down('Enter');   // auto-repeat
    await page.keyboard.up('Enter');
    const after = await st(page);
    check('a held key makes a single move', before.remaining - after.remaining === 1, [before.remaining, after.remaining]);
    check('no errors', errors.length === 0, errors);
    await ctx.close();
  }

  /* ------------------------------------------------------------------ */
  console.log('\nReduced motion');
  {
    const { ctx, page, errors } = await open(browser, { reducedMotion: 'reduce' });
    await page.evaluate(() => { window.__rand = 0.99; window.LastMomo.restart(); window.LastMomo.restart(); });
    await page.click('#take1');
    let s = await st(page);
    // Only gentle opacity fades are allowed; anything else counts as motion.
    const moving = () => page.evaluate(() => document.getAnimations()
      .filter((a) => !(a instanceof CSSTransition && a.transitionProperty === 'opacity')).length);
    check('no flying momos or puffs', s.liveParticles === 0 && (await moving()) === 0, await moving());
    check('taken momo fades out in place', await page.evaluate(() => document.querySelectorAll('.momo.is-taken').length === 1));
    await waitPhase(page, 'computerThinking');
    check('thinking is still shown (label, expression, pause)', (await page.textContent('#turn-text')) === 'Momo’s turn' &&
      (await page.getAttribute('#bot', 'data-mood')) === 'thinking');
    const t0 = Date.now();
    await waitPhase(page, 'computerAnimating', 'humanTurn');
    const pause = Date.now() - t0;
    check('thinking pause is kept (' + pause + ' ms)', pause > 450 && pause < 1200);
    await waitPhase(page, 'humanTurn');
    await turn(page, 1); await turn(page, 1); await turn(page, 2);
    await page.click('#take1');
    s = await st(page);
    check('match completes with a human win and no confetti', s.winner === 'human' && s.liveParticles === 0 && s.celebrations === 1, s);
    check('no confetti, bouncing or looping animations', (await moving()) === 0, await moving());
    check('result and Rematch are available at once', (await page.textContent('#result-msg')) === 'You got the last momo!' &&
      await page.evaluate(() => document.activeElement.id === 'rematch'));
    await shot(page, 'reduced-motion-win');
    check('no errors', errors.length === 0, errors);
    await ctx.close();
  }

  /* ------------------------------------------------------------------ */
  console.log('\nSound');
  {
    const { ctx, page, errors } = await open(browser);
    await page.evaluate(() => { window.__rand = 0.99; window.LastMomo.restart(); window.LastMomo.restart(); });
    await page.click('#sound');
    check('toggle turns sound on only after a click', (await st(page)).soundOn === true &&
      (await page.getAttribute('#sound', 'aria-pressed')) === 'true' && (await page.getAttribute('#sound', 'aria-label')) === 'Sound');
    let s = await turn(page, 1);
    s = await turn(page, 1); s = await turn(page, 1); s = await turn(page, 2);
    await page.click('#take1');
    await page.waitForTimeout(700);
    check('a full match plays with sound on', (await st(page)).winner === 'human');
    await page.click('#sound');
    check('toggle turns sound back off', (await st(page)).soundOn === false && (await page.getAttribute('#sound', 'aria-pressed')) === 'false');
    check('no errors with sound', errors.length === 0, errors);
    await ctx.close();

    for (const [label, init] of [
      ['missing', 'delete window.AudioContext; delete window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined;'],
      ['throwing', 'window.AudioContext = function () { throw new Error("blocked"); }; window.webkitAudioContext = undefined;']
    ]) {
      const o = await open(browser, {}, STEER + init);
      await o.page.evaluate(() => { window.__rand = 0.99; window.LastMomo.restart(); window.LastMomo.restart(); });
      await o.page.click('#sound');
      const off = (await st(o.page)).soundOn === false && (await o.page.getAttribute('#sound', 'aria-pressed')) === 'false';
      await turn(o.page, 1); await turn(o.page, 1); await turn(o.page, 1); await turn(o.page, 2);
      await o.page.click('#take1');
      check('audio ' + label + ': toggle stays off and the game plays normally', off && (await st(o.page)).winner === 'human' && o.errors.length === 0, o.errors);
      await o.ctx.close();
    }
  }

  /* ------------------------------------------------------------------ */
  console.log('\nEffects failing must not stop the game');
  {
    const breakFx = 'Element.prototype.animate = function () { throw new Error("no animations"); };';
    const { ctx, page, errors } = await open(browser, {}, STEER + breakFx);
    await page.evaluate(() => { window.__rand = 0.99; window.LastMomo.restart(); window.LastMomo.restart(); });
    await turn(page, 1); await turn(page, 1); await turn(page, 1); await turn(page, 2);
    await page.click('#take1');
    const s = await st(page);
    check('match completes even when every animation call throws', s.winner === 'human' && s.scores.human === 1 && errors.length === 0, errors);
    await ctx.close();
  }

  /* ------------------------------------------------------------------ */
  console.log('\nLayouts');
  for (const [name, width, height, touch] of [
    ['phone-320', 320, 568, true], ['phone-360', 360, 640, true], ['phone-390', 390, 844, true],
    ['embed-800x600', 800, 600, false], ['embed-640x480', 640, 480, false], ['embed-600x400', 600, 400, false], ['embed-760x460', 760, 460, false], ['desktop-1280', 1280, 800, false]
  ]) {
    const { ctx, page, errors } = await open(browser, { viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: SHOTS ? 2 : 1 });
    await page.evaluate(() => { window.__rand = 0.99; window.LastMomo.restart(); window.LastMomo.restart(); });
    await page.waitForTimeout(800);
    const measure = () => page.evaluate(() => {
      const box = (e) => e.getBoundingClientRect();
      const visible = [...document.querySelectorAll('button, summary')].filter((e) => getComputedStyle(e).visibility === 'visible' && box(e).width > 0);
      const r = box(plate);
      return {
        scrollX: document.documentElement.scrollWidth - innerWidth,
        scrollY: document.documentElement.scrollHeight - innerHeight,
        smallTargets: visible.filter((e) => box(e).width < 44 || box(e).height < 44).map((e) => e.id || e.tagName),
        plateInView: r.left >= 0 && r.right <= innerWidth && r.width >= 160,
        offscreen: [...document.querySelectorAll('.masthead, .opponent, .statusbar, .dock, .bubble-slot')].filter((e) => box(e).left < -0.5 || box(e).right > innerWidth + 0.5).length,
        dockHeight: box(document.querySelector('.dock')).height
      };
    });
    let m = await measure();
    check(name + ': no horizontal scroll, everything on screen', m.scrollX <= 0 && m.offscreen === 0 && m.plateInView, m);
    check(name + ': touch targets are at least 44 px', m.smallTargets.length === 0, m.smallTargets);
    if (height >= 600) check(name + ': fits without vertical scrolling', m.scrollY <= 0, m.scrollY);
    await shot(page, name);
    const playDock = m.dockHeight;
    if (touch) { await page.tap('#take1'); await waitPhase(page, 'humanTurn'); } else await turn(page, 1);
    await turn(page, 1); await turn(page, 1); await turn(page, 2);
    await page.click('#take1');
    await page.waitForTimeout(350);
    m = await measure();
    check(name + ': result state fits too, no layout jump', m.scrollX <= 0 && m.smallTargets.length === 0 && Math.abs(m.dockHeight - playDock) < 1, m);
    await shot(page, name + '-result');
    check(name + ': no errors', errors.length === 0, errors);
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
  if (failures.length) { failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
