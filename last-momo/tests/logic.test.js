// Rules and state machine. Run with:  node --test last-momo/tests/logic.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const P = L.PHASE;

// Small seeded generator so every run is reproducible.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const constant = (v) => () => v;

function invariant(s) {
  assert.equal(s.collected.human + s.collected.computer + s.remaining, s.startCount);
  assert.equal(s.slots.filter((x) => x === null).length, s.remaining);
  assert.equal(s.slots.filter((x) => x === 'human').length, s.collected.human);
  assert.equal(s.slots.filter((x) => x === 'computer').length, s.collected.computer);
}

test('matches start with 10, 11, 13 or 14 momos', () => {
  const rng = seeded(1);
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(L.newMatch(null, rng).startCount);
  assert.deepEqual([...seen].sort((a, b) => a - b), [10, 11, 13, 14]);
});

test('taking one removes exactly one, taking two exactly two', () => {
  const s0 = L.newMatch(null, constant(0));
  assert.equal(s0.startCount, 10);
  const s1 = L.take(s0, 'human', 1);
  assert.equal(s1.remaining, 9);
  assert.equal(s1.collected.human, 1);
  const s2 = L.take(L.newMatch(null, constant(0)), 'human', 2);
  assert.equal(s2.remaining, 8);
  assert.equal(s2.collected.human, 2);
  invariant(s1); invariant(s2);
});

test('illegal amounts are rejected', () => {
  const s0 = L.newMatch(null, constant(0));
  for (const n of [0, 3, -1, 1.5, NaN, '1', undefined]) assert.equal(L.take(s0, 'human', n), s0);
  assert.deepEqual(L.legalMoves(1), [1]);
  assert.deepEqual(L.legalMoves(2), [1, 2]);
  assert.deepEqual(L.legalMoves(0), []);
});

test('the human cannot act outside humanTurn (double clicks do nothing)', () => {
  const s0 = L.newMatch(null, constant(0));
  const s1 = L.take(s0, 'human', 1);
  assert.equal(s1.phase, P.HUMAN_ANIMATING);
  assert.equal(L.take(s1, 'human', 1), s1);
  const s2 = L.settle(s1, constant(0));
  assert.equal(s2.phase, P.COMPUTER_THINKING);
  assert.equal(L.take(s2, 'human', 1), s2);
});

test('the computer moves once per turn, and only with the move it decided', () => {
  let s = L.settle(L.take(L.newMatch(null, constant(0)), 'human', 1), constant(0));
  const decided = s.pendingMove;
  assert.ok(decided === 1 || decided === 2);
  assert.equal(L.take(s, 'computer', decided === 1 ? 2 : 1), s, 'a different move is refused');
  const moved = L.take(s, 'computer', decided);
  assert.equal(moved.phase, P.COMPUTER_ANIMATING);
  assert.equal(moved.remaining, 9 - decided);
  assert.equal(L.take(moved, 'computer', decided), moved, 'no second move');
  assert.equal(L.take(moved, 'computer', null), moved);
  assert.equal(L.settle(moved, constant(0)).phase, P.HUMAN_TURN);
  // settle is a no-op once the turn is handed over
  const back = L.settle(moved, constant(0));
  assert.equal(L.settle(back, constant(0)), back);
});

test('with one or two left the computer always takes them all', () => {
  for (const r of [0, 0.3, 0.69, 0.7, 0.99]) {
    assert.equal(L.chooseComputerMove(1, constant(r)), 1);
    assert.equal(L.chooseComputerMove(2, constant(r)), 2);
  }
});

test('the optimal move leaves a multiple of three when one exists', () => {
  for (let n = 3; n <= 14; n++) {
    const moves = L.optimalMoves(n);
    if (n % 3 === 0) assert.deepEqual(moves, [1, 2], 'no good move: any legal move');
    else {
      assert.equal(moves.length, 1);
      assert.equal((n - moves[0]) % 3, 0);
    }
  }
});

test('the computer never picks an illegal move, and is optimal about 70% + half of 30%', () => {
  const rng = seeded(42);
  let optimal = 0;
  const trials = 20000;
  for (let i = 0; i < trials; i++) {
    const move = L.chooseComputerMove(7, rng);          // only "1" leaves 6
    assert.ok(move === 1 || move === 2);
    if (move === 1) optimal++;
  }
  const rate = optimal / trials;                        // expected 0.7 + 0.3 * 0.5 = 0.85
  assert.ok(rate > 0.83 && rate < 0.87, `optimal rate was ${rate}`);
  for (let n = 1; n <= 14; n++) {
    for (let i = 0; i < 200; i++) assert.ok(L.legalMoves(n).includes(L.chooseComputerMove(n, rng)));
  }
});

test('taking the last momo wins at once and schedules nothing further', () => {
  let s = L.newMatch(null, constant(0));
  s = Object.assign({}, s, { remaining: 2, slots: s.slots.map((v, i) => (i < 2 ? null : 'computer')), collected: { human: 0, computer: 8 } });
  const won = L.take(s, 'human', 2);
  assert.equal(won.phase, P.GAME_OVER);
  assert.equal(won.winner, 'human');
  assert.deepEqual(won.scores, { human: 1, computer: 0 });
  assert.equal(won.pendingMove, null);
  assert.equal(L.settle(won, constant(0)), won);
  assert.equal(L.take(won, 'human', 1), won);
  assert.equal(L.take(won, 'computer', 1), won);
});

test('the starter alternates and the human opens the first match', () => {
  let s = null;
  const starters = [];
  for (let i = 0; i < 6; i++) {
    s = L.newMatch(s, seeded(i));
    starters.push(s.starter);
    assert.equal(s.phase, s.starter === 'human' ? P.HUMAN_TURN : P.COMPUTER_THINKING);
    if (s.starter === 'computer') assert.ok(L.legalMoves(s.remaining).includes(s.pendingMove));
  }
  assert.deepEqual(starters, ['human', 'computer', 'human', 'computer', 'human', 'computer']);
});

test('momos leave the plate in a fixed order, nearest the taker first', () => {
  for (const n of L.START_COUNTS) {
    const human = L.slotOrder(n, 'human'), computer = L.slotOrder(n, 'computer');
    assert.deepEqual(human, L.slotOrder(n, 'human'));
    assert.equal(new Set(human).size, n);
    assert.equal(computer[0], 0, 'Momo starts at the top slot');
    assert.ok(Math.abs(human[0] - n / 2) <= 0.5, 'you start at the bottom slot');
  }
});

test('full simulated matches: invariants hold, one winner, one score per match', () => {
  const rng = seeded(7);
  let s = null;
  let humanWins = 0, computerWins = 0;
  for (let match = 0; match < 3000; match++) {
    s = L.newMatch(s, rng);
    const before = s.scores.human + s.scores.computer;
    let guard = 0;
    while (s.phase !== P.GAME_OVER) {
      assert.ok(++guard < 100);
      invariant(s);
      if (s.phase === P.HUMAN_TURN) {
        const legal = L.legalMoves(s.remaining);
        const n = legal[Math.floor(rng() * legal.length)];
        const next = L.take(s, 'human', n);
        assert.equal(next.remaining, s.remaining - n);
        s = next;
      } else if (s.phase === P.COMPUTER_THINKING) {
        const r = s.remaining, n = s.pendingMove;
        assert.ok(L.legalMoves(r).includes(n));
        if (r <= 2) assert.equal(n, r);
        s = L.take(s, 'computer', n);
        assert.equal(s.remaining, r - n);
      } else {
        s = L.settle(s, rng);
      }
    }
    invariant(s);
    assert.equal(s.remaining, 0);
    assert.equal(s.winner, s.lastMove.player);
    assert.equal(s.scores.human + s.scores.computer, before + 1);
    if (s.winner === 'human') humanWins++; else computerWins++;
  }
  assert.equal(s.scores.human, humanWins);
  assert.equal(s.scores.computer, computerWins);
  assert.ok(humanWins > 0 && computerWins > 0);
});

test('Momo is beatable: a perfect player wins a healthy share', () => {
  const rng = seeded(99);
  let s = null, wins = 0;
  const matches = 4000;
  for (let i = 0; i < matches; i++) {
    s = L.newMatch(s, rng);
    while (s.phase !== P.GAME_OVER) {
      if (s.phase === P.HUMAN_TURN) s = L.take(s, 'human', L.optimalMoves(s.remaining)[0]);
      else if (s.phase === P.COMPUTER_THINKING) s = L.take(s, 'computer', s.pendingMove);
      else s = L.settle(s, rng);
    }
    if (s.winner === 'human') wins++;
  }
  const rate = wins / matches;
  assert.ok(rate > 0.6 && rate < 0.98, `perfect-play win rate was ${rate}`);
});
