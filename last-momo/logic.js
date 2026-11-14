/*
 * Last Momo — pure game rules and state machine.
 * No DOM, timers, audio or effects in here: every function takes a state and
 * returns the next one, so the rules can be tested on their own (see tests/).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LastMomoLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var START_COUNTS = [10, 11, 13, 14];
  var OPTIMAL_CHANCE = 0.7;

  var PHASE = Object.freeze({
    HUMAN_TURN: 'humanTurn',
    HUMAN_ANIMATING: 'humanAnimating',
    COMPUTER_THINKING: 'computerThinking',
    COMPUTER_ANIMATING: 'computerAnimating',
    GAME_OVER: 'gameOver'
  });

  function pick(list, rng) {
    var i = Math.floor(rng() * list.length);
    return list[Math.min(list.length - 1, Math.max(0, i))];
  }

  function legalMoves(remaining) {
    if (remaining <= 0) return [];
    return remaining === 1 ? [1] : [1, 2];
  }

  // Moves that win outright or leave the opponent a multiple of three.
  // When no such move exists, every legal move is equally (un)helpful.
  function optimalMoves(remaining) {
    if (remaining <= 0) return [];
    if (remaining <= 2) return [remaining];
    var mod = remaining % 3;
    return mod === 0 ? legalMoves(remaining) : [mod];
  }

  // Called exactly once per computer turn; the result is stored on the state.
  function chooseComputerMove(remaining, rng) {
    if (remaining <= 2) return remaining;
    if (rng() < OPTIMAL_CHANCE) return pick(optimalMoves(remaining), rng);
    return pick(legalMoves(remaining), rng);
  }

  // Slots sit on a ring, index 0 at the top (Momo's side), going clockwise.
  // The human takes the momos nearest the bottom, Momo those nearest the top.
  function slotOrder(count, player) {
    var order = [];
    for (var i = 0; i < count; i++) {
      order.push({ i: i, y: Math.round(-Math.cos((2 * Math.PI * i) / count) * 1e6) });
    }
    order.sort(function (a, b) {
      var d = player === 'human' ? b.y - a.y : a.y - b.y;
      return d !== 0 ? d : a.i - b.i;
    });
    return order.map(function (o) { return o.i; });
  }

  function pickSlots(state, player, count) {
    return slotOrder(state.startCount, player)
      .filter(function (i) { return state.slots[i] === null; })
      .slice(0, count);
  }

  // Starts match 1 (prev = null) or the next match, carrying the session score.
  function newMatch(prev, rng) {
    var matchId = prev ? prev.matchId + 1 : 1;
    var startCount = pick(START_COUNTS, rng);
    var starter = matchId % 2 === 1 ? 'human' : 'computer';
    var slots = [];
    for (var i = 0; i < startCount; i++) slots.push(null);
    return {
      matchId: matchId,
      startCount: startCount,
      remaining: startCount,
      starter: starter,
      phase: starter === 'human' ? PHASE.HUMAN_TURN : PHASE.COMPUTER_THINKING,
      pendingMove: starter === 'human' ? null : chooseComputerMove(startCount, rng),
      collected: { human: 0, computer: 0 },
      slots: slots,
      lastMove: null,
      winner: null,
      scores: prev ? { human: prev.scores.human, computer: prev.scores.computer } : { human: 0, computer: 0 }
    };
  }

  // Applies one move. Returns the SAME state object when the move is rejected.
  function take(state, player, count) {
    if (player === 'human') {
      if (state.phase !== PHASE.HUMAN_TURN) return state;
    } else if (player === 'computer') {
      if (state.phase !== PHASE.COMPUTER_THINKING || count !== state.pendingMove) return state;
    } else {
      return state;
    }
    if (legalMoves(state.remaining).indexOf(count) === -1) return state;

    var taken = pickSlots(state, player, count);
    var slots = state.slots.slice();
    taken.forEach(function (i) { slots[i] = player; });
    var remaining = state.remaining - count;
    var won = remaining === 0;
    var collected = { human: state.collected.human, computer: state.collected.computer };
    collected[player] += count;
    var scores = { human: state.scores.human, computer: state.scores.computer };
    if (won) scores[player] += 1;

    return {
      matchId: state.matchId,
      startCount: state.startCount,
      remaining: remaining,
      starter: state.starter,
      phase: won ? PHASE.GAME_OVER
        : player === 'human' ? PHASE.HUMAN_ANIMATING : PHASE.COMPUTER_ANIMATING,
      pendingMove: null,
      collected: collected,
      slots: slots,
      lastMove: { player: player, count: count, slots: taken },
      winner: won ? player : null,
      scores: scores
    };
  }

  // Called when a move's animation window ends. Hands the turn over.
  function settle(state, rng) {
    if (state.phase === PHASE.HUMAN_ANIMATING) {
      return Object.assign({}, state, {
        phase: PHASE.COMPUTER_THINKING,
        pendingMove: chooseComputerMove(state.remaining, rng)
      });
    }
    if (state.phase === PHASE.COMPUTER_ANIMATING) {
      return Object.assign({}, state, { phase: PHASE.HUMAN_TURN });
    }
    return state;
  }

  return {
    START_COUNTS: START_COUNTS,
    OPTIMAL_CHANCE: OPTIMAL_CHANCE,
    PHASE: PHASE,
    legalMoves: legalMoves,
    optimalMoves: optimalMoves,
    chooseComputerMove: chooseComputerMove,
    slotOrder: slotOrder,
    newMatch: newMatch,
    take: take,
    settle: settle
  };
});
