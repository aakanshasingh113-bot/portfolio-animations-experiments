/*
 * Last Momo — controller.
 *
 * `state` (from logic.js) is the single source of truth and render() draws the
 * interface from it. Effects (flying momos, particles, bubbles, sound) are
 * decoration: they run inside fx() so a failure can never stall the game, and
 * they never write to `state`.
 */
(function () {
  'use strict';

  var L = window.LastMomoLogic;
  var P = L.PHASE;
  var $ = function (id) { return document.getElementById(id); };

  var el = {
    game: $('game'), plate: $('plate'), momos: $('momos'), fx: $('fx'),
    remaining: $('remaining'), remainingBadge: $('remaining').parentNode,
    bot: $('bot'), bubble: $('bubble'),
    momoTally: $('momo-tally'), momoCount: $('momo-count'),
    youTally: $('you-tally'), youCount: $('you-count'),
    turnText: $('turn-text'), winsYou: $('wins-you'), winsMomo: $('wins-momo'), stage: $('stage'),
    panelPlay: $('panel-play'), panelResult: $('panel-result'),
    take1: $('take1'), take2: $('take2'), rematch: $('rematch'),
    resultMsg: $('result-msg'), resultScore: $('result-score'), hint: $('hint'),
    sound: $('sound'), soundText: $('sound-text'), live: $('live')
  };

  var THINK_MIN = 650, THINK_SPREAD = 300;      // 650–950 ms
  var MOVE_MS = 620, MOVE_MS_REDUCED = 260;
  var BUBBLE_MS = 2600;

  var rng = function () { return Math.random(); };
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reducedMotion() { return !!(motionQuery && motionQuery.matches); }

  var state = null;
  var momoEls = [];

  // Decoration-only bookkeeping. Nothing in here feeds back into the rules.
  var view = {
    celebratedMatch: 0,     // guards "celebrate exactly once"
    celebrations: 0,
    bubbledLastTurn: false,
    lastStage: 'calm',
    lastTake: 1,
    userActed: false
  };

  /* ---------- Timers and effects owned by the current match ---------- */

  var pending = { timers: [], anims: [], nodes: [] };

  // Runs fn later, unless a new match has started in the meantime.
  function later(fn, ms) {
    var id = state.matchId;
    var t = setTimeout(function () {
      var i = pending.timers.indexOf(t);
      if (i !== -1) pending.timers.splice(i, 1);
      if (!state || state.matchId !== id) return;
      fn();
    }, ms);
    pending.timers.push(t);
    return t;
  }

  function cancel(t) {
    var i = pending.timers.indexOf(t);
    if (i === -1) return;
    clearTimeout(t);
    pending.timers.splice(i, 1);
  }

  function clearPending() {
    pending.timers.forEach(clearTimeout);
    pending.anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* already gone */ } });
    pending.nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    pending.timers = []; pending.anims = []; pending.nodes = [];
  }

  function fx(fn) {
    try { fn(); } catch (e) { /* effects are optional */ }
  }

  function track(anim, node) {
    pending.anims.push(anim);
    var done = function () {
      var i = pending.anims.indexOf(anim);
      if (i !== -1) pending.anims.splice(i, 1);
      if (node) {
        if (node.parentNode) node.parentNode.removeChild(node);
        var j = pending.nodes.indexOf(node);
        if (j !== -1) pending.nodes.splice(j, 1);
      }
    };
    anim.onfinish = done;
    anim.oncancel = done;
    return anim;
  }

  function particle(className, css) {
    var n = document.createElement('i');
    if (className) n.className = className;
    n.style.cssText = css;
    el.fx.appendChild(n);
    pending.nodes.push(n);
    return n;
  }

  function replay(node, className) {
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
  }

  /* ---------- Sound (off until the player turns it on) ---------- */

  var sound = {
    on: false,
    ctx: null,
    enable: function () {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        if (!this.ctx) this.ctx = new AC();
        if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume().catch(function () {});
        this.on = true;
        return true;
      } catch (e) {
        this.on = false; this.ctx = null;
        return false;
      }
    },
    disable: function () {
      this.on = false;
      var ctx = this.ctx;
      this.ctx = null;
      try { if (ctx && ctx.close) ctx.close().catch(function () {}); } catch (e) { /* ignore */ }
    },
    tone: function (o) {
      if (!this.on || !this.ctx) return;
      var ctx = this.ctx, t = ctx.currentTime + (o.at || 0);
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.from, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(o.vol || 0.16, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.onended = function () { try { osc.disconnect(); gain.disconnect(); } catch (e) { /* ignore */ } };
      osc.start(t); osc.stop(t + o.dur + 0.03);
    },
    pop: function (count) {
      for (var i = 0; i < count; i++) this.tone({ from: 560 + i * 90, to: 250, dur: 0.1, at: i * 0.09, vol: 0.18 });
    },
    win: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        sound.tone({ type: 'triangle', from: f, dur: 0.2, at: i * 0.1, vol: 0.15 });
      });
    },
    lose: function () {
      this.tone({ type: 'triangle', from: 174, to: 104, dur: 0.42, vol: 0.2 });
      this.tone({ type: 'sine', from: 98, to: 92, dur: 0.3, at: 0.34, vol: 0.16 });
    }
  };

  function toggleSound() {
    var turnOn = el.sound.getAttribute('aria-pressed') !== 'true';
    if (turnOn) {
      if (sound.enable()) { fx(function () { sound.pop(1); }); }
      else { turnOn = false; announce('Sound is not available in this browser.'); }
    } else {
      sound.disable();
    }
    el.sound.setAttribute('aria-pressed', turnOn ? 'true' : 'false');
    el.soundText.textContent = turnOn ? 'On' : 'Off';
  }

  /* ---------- Rendering ---------- */

  function announce(text) { el.live.textContent = text; }

  function scoreLine(sep) {
    return 'You ' + state.scores.human + ' ' + sep + ' Momo ' + state.scores.computer;
  }

  function stageOf(s) {
    if (s.phase === P.GAME_OVER) return 'over';
    if (s.remaining <= 2) return 'final';
    if (s.remaining <= 5) return 'serious';
    return 'calm';
  }

  function buildPlate() {
    var n = state.startCount;
    var ring = 31.5;                                              // % of plate, from centre
    var size = Math.min(17.5, (2 * Math.PI * ring / n) * 0.99);   // % of plate width
    el.momos.textContent = '';
    momoEls = [];
    for (var i = 0; i < n; i++) {
      var a = (2 * Math.PI * i) / n;
      var x = 50 + ring * Math.sin(a), y = 50 - ring * Math.cos(a);
      var m = document.createElement('div');
      m.className = 'momo';
      m.style.left = x.toFixed(2) + '%';
      m.style.top = y.toFixed(2) + '%';
      m.style.width = size.toFixed(2) + '%';
      m.style.zIndex = String(Math.round(y));
      m.innerHTML = '<svg style="transform:rotate(' + (Math.sin(a) * 9).toFixed(1) + 'deg)"><use href="#i-momo"/></svg>';
      el.momos.appendChild(m);
      momoEls.push(m);
    }
  }

  function render() {
    var s = state;
    var over = s.phase === P.GAME_OVER;
    var humanTurn = s.phase === P.HUMAN_TURN;
    var stage = stageOf(s);

    el.game.dataset.phase = s.phase;
    el.game.dataset.turn = over ? 'over' : humanTurn ? 'human' : 'momo';
    el.game.dataset.stage = stage;
    if (s.winner) el.game.dataset.winner = s.winner; else delete el.game.dataset.winner;

    el.remaining.textContent = String(s.remaining);
    el.youCount.textContent = String(s.collected.human);
    el.momoCount.textContent = String(s.collected.computer);
    el.winsYou.textContent = 'You ' + s.scores.human;
    el.winsMomo.textContent = 'Momo ' + s.scores.computer;

    el.take1.disabled = !humanTurn;
    el.take2.disabled = !humanTurn || s.remaining < 2;

    el.turnText.textContent = over ? (s.winner === 'human' ? 'You win!' : 'Momo wins')
      : humanTurn ? 'Your turn' : 'Momo’s turn';

    el.stage.textContent = stage === 'serious' ? 'Getting serious.'
      : stage === 'final' ? 'The final bites.' : ' ';
    if (stage !== view.lastStage) {
      view.lastStage = stage;
      if (stage === 'serious' || stage === 'final') fx(function () { replay(el.stage, 'is-fresh'); });
    }

    el.bot.dataset.mood = over ? (s.winner === 'computer' ? 'happy' : 'sad')
      : s.phase === P.COMPUTER_THINKING ? 'thinking' : 'idle';

    for (var i = 0; i < momoEls.length; i++) {
      momoEls[i].classList.toggle('is-taken', s.slots[i] !== null);
    }

    el.panelPlay.classList.toggle('is-off', over);
    el.panelResult.classList.toggle('is-off', !over);
    if (over) {
      el.resultMsg.textContent = s.winner === 'human' ? 'You got the last momo!' : 'Momo got the last momo.';
      el.resultScore.textContent = scoreLine('—');
    }
    el.youTally.classList.toggle('is-delighted', over && s.winner === 'human');
  }

  /* ---------- Effects ---------- */

  function showBubble(text) {
    el.bubble.textContent = text;
    el.bubble.classList.add('is-on');
    cancel(showBubble.timer);
    showBubble.timer = later(hideBubble, BUBBLE_MS);
  }
  function hideBubble() { el.bubble.classList.remove('is-on'); }

  function chance(p) { return Math.random() < p; }

  // Momo is looking at what the human just left on the plate.
  function thinkingBubble() {
    view.bubbledThisTurn = false;
    if (view.bubbledLastTurn || state.lastMove === null) return;
    if (state.remaining % 3 === 0 && chance(0.6)) {
      showBubble('You’re counting, aren’t you?');
      view.bubbledThisTurn = true;
    }
  }

  // Momo has just moved (and not won).
  function moveBubble(move) {
    var spoke = view.bubbledThisTurn;
    if (!spoke && !view.bubbledLastTurn && chance(0.6)) {
      var line = move.count === 1 ? 'Just one. I’m being polite.' : 'Taking two. No regrets.';
      if (state.remaining % 3 === 0 && state.remaining <= 6 && chance(0.6)) line = 'That chutney won’t save you.';
      showBubble(line);
      spoke = true;
    }
    view.bubbledLastTurn = spoke;
  }

  function animateTake(move) {
    var who = move.player;
    var tally = who === 'human' ? el.youTally : el.momoTally;
    replay(el.remainingBadge, 'is-bumped');
    if (reducedMotion() || !el.plate.animate) { replay(tally, 'is-bumped'); return; }

    var target = (who === 'human' ? el.youTally.querySelector('.tally__icon') : el.bot).getBoundingClientRect();
    var tx = target.left + target.width / 2, ty = target.top + target.height * (who === 'human' ? 0.4 : 0.62);
    var fxBox = el.fx.getBoundingClientRect();

    move.slots.forEach(function (slot, k) {
      var m = momoEls[slot];
      if (!m) return;
      var r = m.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = tx - cx, dy = ty - cy;
      // Quadratic curve with the control point lifted, sampled into keyframes.
      var bend = (who === 'human' ? -1 : 1) * Math.min(70, Math.abs(dy) * 0.45 + 24);
      var qx = dx * 0.35 + (dx >= 0 ? -1 : 1) * 26, qy = dy * 0.25 + bend;
      var frames = [];
      for (var i = 0; i <= 6; i++) {
        var t = i / 6, u = 1 - t;
        var px = 2 * u * t * qx + t * t * dx, py = 2 * u * t * qy + t * t * dy;
        var sc = t < 0.35 ? 1 + t * 0.5 : 1.175 - (t - 0.35) * 1.2;
        frames.push({
          transform: 'translate(calc(-50% + ' + px.toFixed(1) + 'px), calc(-50% + ' + py.toFixed(1) + 'px)) scale(' + sc.toFixed(3) + ') rotate(' + (t * (dx >= 0 ? 40 : -40)).toFixed(1) + 'deg)',
          opacity: t > 0.85 ? 0 : 1
        });
      }
      m.style.zIndex = '200';
      track(m.animate(frames, { duration: 500, delay: k * 95, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'backwards' }));

      // A tiny puff of steam where the momo was.
      var puff = particle('', 'left:' + (cx - fxBox.left - 9) + 'px;top:' + (cy - fxBox.top - 12) + 'px;width:18px;height:18px;border-radius:50%;border:2.5px solid #B49A7C;opacity:0');
      track(puff.animate([
        { transform: 'translateY(0) scale(.4)', opacity: 0.7 },
        { transform: 'translateY(-16px) scale(1.5)', opacity: 0 }
      ], { duration: 420, delay: k * 95 + 40, easing: 'ease-out' }), puff);
    });

    later(function () { fx(function () { replay(tally, 'is-bumped'); }); }, 430 + (move.count - 1) * 95);
  }

  function confetti() {
    if (reducedMotion() || !el.fx.animate) return;
    var box = el.fx.getBoundingClientRect();
    var colors = ['#C92F1B', '#7C9A4E', '#C4673F', '#F4B63F', '#4D6529'];
    var originY = box.height * 0.72;
    for (var i = 0; i < 30; i++) {
      var fromLeft = i % 2 === 0;
      var w = 6 + Math.random() * 5, h = Math.random() < 0.5 ? w : w * 0.45;
      var n = particle('', 'left:' + (fromLeft ? -8 : box.width + 2) + 'px;top:' + originY + 'px;width:' + w + 'px;height:' + h + 'px;border-radius:' + (Math.random() < 0.3 ? '50%' : '2px') + ';background:' + colors[i % colors.length] + ';opacity:0');
      var reach = (0.12 + Math.random() * 0.4) * box.width * (fromLeft ? 1 : -1);
      var peak = -(box.height * (0.3 + Math.random() * 0.4));
      var spin = (Math.random() * 540 + 180) * (Math.random() < 0.5 ? -1 : 1);
      track(n.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(.15,.7,.4,1)' },
        { transform: 'translate(' + (reach * 0.75) + 'px,' + peak + 'px) rotate(' + (spin * 0.5) + 'deg)', opacity: 1, offset: 0.42, easing: 'cubic-bezier(.5,0,.9,.6)' },
        { transform: 'translate(' + reach + 'px,' + (box.height - originY + 20) + 'px) rotate(' + spin + 'deg)', opacity: 0.9 }
      ], { duration: 1050 + Math.random() * 450, delay: Math.random() * 140 }), n);
    }
  }

  function crumbs() {
    if (reducedMotion() || !el.fx.animate) return;
    var box = el.fx.getBoundingClientRect(), b = el.bot.getBoundingClientRect();
    var x0 = b.left - box.left + b.width / 2, y0 = b.top - box.top + b.height * 0.66;
    for (var i = 0; i < 7; i++) {
      var s = 3 + Math.random() * 3;
      var n = particle('', 'left:' + x0 + 'px;top:' + y0 + 'px;width:' + s + 'px;height:' + s + 'px;border-radius:40%;background:' + (i % 2 ? '#EFD9B6' : '#C9A47A') + ';border:1px solid #A9794B;opacity:0');
      var dx = (Math.random() - 0.5) * 70;
      track(n.animate([
        { transform: 'translate(0,0)', opacity: 1, easing: 'ease-out' },
        { transform: 'translate(' + dx * 0.6 + 'px,-14px)', opacity: 1, offset: 0.3, easing: 'ease-in' },
        { transform: 'translate(' + dx + 'px,44px)', opacity: 0 }
      ], { duration: 700 + Math.random() * 250, delay: 120 + i * 60 }), n);
    }
  }

  /* ---------- Focus ---------- */

  function focusQuietly(node) {
    try { node.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  // Disabled buttons drop keyboard focus; hand it back when the turn returns.
  function restoreFocus() {
    if (!view.userActed || state.phase !== P.HUMAN_TURN) return;
    var a = document.activeElement;
    if (a && a !== document.body && a !== el.take1 && a !== el.take2 && a !== el.rematch) return;
    if (a && (a === el.take1 || a === el.take2) && !a.disabled) return;
    focusQuietly(view.lastTake === 2 && !el.take2.disabled ? el.take2 : el.take1);
  }

  /* ---------- Game flow ---------- */

  function startMatch() {
    clearPending();
    state = L.newMatch(state, rng);
    view.bubbledLastTurn = false;
    view.bubbledThisTurn = false;
    view.lastStage = 'calm';
    hideBubble();
    el.hint.open = false;
    buildPlate();
    render();
    fx(function () { replay(el.plate, 'is-entering'); });
    announce('New match. ' + state.remaining + ' momos on the plate. ' +
      (state.phase === P.HUMAN_TURN ? 'Your turn.' : 'Momo goes first.'));
    if (state.phase === P.COMPUTER_THINKING) beginComputerTurn();
    else restoreFocus();
  }

  function humanTake(count) {
    var next = L.take(state, 'human', count);
    if (next === state) return;                     // not your turn, or not a legal move
    state = next;
    view.userActed = true;
    view.lastTake = count;
    afterMove();
  }

  function beginComputerTurn() {
    // The move was fixed when the turn began (state.pendingMove); this only waits.
    fx(thinkingBubble);
    later(function () {
      var next = L.take(state, 'computer', state.pendingMove);
      if (next === state) return;
      state = next;
      afterMove();
    }, THINK_MIN + Math.random() * THINK_SPREAD);
  }

  function afterMove() {
    var move = state.lastMove;
    var who = move.player === 'human' ? 'You' : 'Momo';
    render();
    fx(function () { animateTake(move); });
    fx(function () { sound.pop(move.count); });

    if (state.phase === P.GAME_OVER) { finish(); return; }

    if (move.player === 'computer') fx(function () { moveBubble(move); });
    announce(who + ' took ' + move.count + '. ' + state.remaining + ' left. ' +
      (move.player === 'human' ? 'Momo’s turn.' : 'Your turn.'));
    later(settle, reducedMotion() ? MOVE_MS_REDUCED : MOVE_MS);
  }

  function settle() {
    state = L.settle(state, rng);
    render();
    if (state.phase === P.COMPUTER_THINKING) beginComputerTurn();
    else restoreFocus();
  }

  function finish() {
    if (view.celebratedMatch === state.matchId) return;
    view.celebratedMatch = state.matchId;
    view.celebrations += 1;
    var humanWon = state.winner === 'human';
    fx(hideBubble);
    announce((humanWon ? 'You got the last momo! You win. ' : 'Momo got the last momo. Momo wins. ') +
      'Score: ' + scoreLine('—') + '.');
    fx(humanWon ? confetti : crumbs);
    later(function () { fx(function () { humanWon ? sound.win() : sound.lose(); }); }, 140);
    focusQuietly(el.rematch);
  }

  function rematch() {
    if (!state || state.phase !== P.GAME_OVER) return;
    view.userActed = true;
    startMatch();
  }

  /* ---------- Wiring ---------- */

  function noRepeat(e) {
    // Holding Enter/Space must not fire a string of moves or an instant rematch.
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
  }

  el.take1.addEventListener('click', function () { humanTake(1); });
  el.take2.addEventListener('click', function () { humanTake(2); });
  el.rematch.addEventListener('click', rematch);
  el.sound.addEventListener('click', toggleSound);
  [el.take1, el.take2, el.rematch].forEach(function (b) { b.addEventListener('keydown', noRepeat); });

  window.addEventListener('pagehide', function () {
    clearPending();
    sound.disable();
    el.sound.setAttribute('aria-pressed', 'false');
    el.soundText.textContent = 'Off';
  });
  // Restored from the back/forward cache with its timers cleared: start clean.
  window.addEventListener('pageshow', function (e) { if (e.persisted) startMatch(); });

  // Read-only peek for tests and debugging. `restart` exists so tests can prove
  // that callbacks from an abandoned match never touch the new one.
  window.LastMomo = {
    getState: function () {
      var copy = JSON.parse(JSON.stringify(state));
      copy.celebrations = view.celebrations;
      copy.pendingTimers = pending.timers.length;
      copy.liveParticles = el.fx.childElementCount;
      copy.soundOn = sound.on;
      return copy;
    },
    restart: startMatch
  };

  startMatch();
})();
