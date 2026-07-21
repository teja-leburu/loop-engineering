import test from 'node:test';
import assert from 'node:assert/strict';
import './rules.js'; // registers modifiers
import {
  newGame, coords, sq, pseudoMoves, legalMovesAt, applyMove, status, pieceAt, inCheck,
} from './engine.js';
import { emptyGame } from './test-helpers.js';

const at = (s, square, mode) => pseudoMoves(s, ...Object.values(coords(square)), mode);
const targets = (moves) => moves.map((m) => sq(m.to.r, m.to.c)).sort();

test('royal-knights: knight gains the 8 king steps', () => {
  const s = emptyGame({ d4: { type: 'n', color: 'w' } });
  assert.equal(at(s, 'd4').length, 8);
  s.rules = ['royal-knights'];
  assert.equal(at(s, 'd4').length, 16);
  assert.ok(targets(at(s, 'd4')).includes('d5')); // king-step
});

test('royal-knights: adjacent knight delivers check', () => {
  const s = emptyGame(
    { e7: { type: 'n', color: 'w' }, e8: { type: 'k', color: 'b' }, a1: { type: 'k', color: 'w' } },
    'b'
  );
  assert.equal(inCheck(s, 'b'), false);
  s.rules = ['royal-knights'];
  assert.equal(inCheck(s, 'b'), true);
});

test('berserker-pawns: pawn captures straight ahead (and threatens check)', () => {
  const s = emptyGame({
    e4: { type: 'p', color: 'w' },
    e5: { type: 'p', color: 'b' },
    a1: { type: 'k', color: 'w' },
    h8: { type: 'k', color: 'b' },
  });
  assert.equal(at(s, 'e4').length, 0); // blocked without the rule
  s.rules = ['berserker-pawns'];
  assert.deepEqual(targets(at(s, 'e4')), ['e5']);
  const next = applyMove(s, 'e4', 'e5');
  assert.deepEqual(pieceAt(next, 'e5'), { type: 'p', color: 'w' });
  assert.deepEqual(next.captured.w, ['p']);

  // King directly ahead of an enemy pawn is in check under this rule.
  const chk = emptyGame(
    { e4: { type: 'p', color: 'w' }, e5: { type: 'k', color: 'b' }, a1: { type: 'k', color: 'w' } },
    'b'
  );
  assert.equal(inCheck(chk, 'b'), false);
  chk.rules = ['berserker-pawns'];
  assert.equal(inCheck(chk, 'b'), true);
});

test('king-dash: two-square dash over empty square only', () => {
  const s = emptyGame({ e4: { type: 'k', color: 'w' }, h8: { type: 'k', color: 'b' } });
  s.rules = ['king-dash'];
  const dashes = targets(at(s, 'e4')).filter((t) => ['e6', 'e2', 'c4', 'g4', 'c6', 'g6', 'c2', 'g2'].includes(t));
  assert.equal(dashes.length, 8);
  // blocked intermediate: piece on e5 kills the e4→e6 dash
  s.board[coords('e5').r][coords('e5').c] = { type: 'p', color: 'w' };
  assert.ok(!targets(at(s, 'e4')).includes('e6'));
});

test('extra moves still respect check (pinned royal knight stays on the file)', () => {
  const s = emptyGame({
    e1: { type: 'k', color: 'w' },
    e2: { type: 'n', color: 'w' },
    e8: { type: 'r', color: 'b' },
    a8: { type: 'k', color: 'b' },
  });
  s.rules = ['royal-knights'];
  const legal = targets(legalMovesAt(s, ...Object.values(coords('e2'))));
  assert.ok(legal.length > 0);
  assert.ok(legal.every((t) => t[0] === 'e'), `moves off the pin file: ${legal}`);
});

test('wormholes: landing on a portal teleports to its pair', () => {
  const s = emptyGame({
    a4: { type: 'r', color: 'w' }, a1: { type: 'k', color: 'w' }, h8: { type: 'k', color: 'b' },
  });
  s.rules = ['wormholes'];
  const next = applyMove(s, 'a4', 'd4');
  assert.equal(pieceAt(next, 'd4'), null);
  assert.deepEqual(pieceAt(next, 'e5'), { type: 'r', color: 'w' });
});

test('wormholes: occupied exit means no teleport', () => {
  const s = emptyGame({
    a4: { type: 'r', color: 'w' },
    e5: { type: 'p', color: 'w' }, // blocks the d4→e5 exit
    a1: { type: 'k', color: 'w' },
    h8: { type: 'k', color: 'b' },
  });
  s.rules = ['wormholes'];
  const next = applyMove(s, 'a4', 'd4');
  assert.deepEqual(pieceAt(next, 'd4'), { type: 'r', color: 'w' });
});

test('atomic-captures: blast clears adjacent non-pawns, spares pawns and the capturer', () => {
  const s = emptyGame({
    d1: { type: 'r', color: 'w' },
    d5: { type: 'n', color: 'b' }, // victim
    c6: { type: 'b', color: 'b' }, // adjacent bishop — vaporized
    d6: { type: 'p', color: 'b' }, // adjacent pawn — spared
    e6: { type: 'n', color: 'w' }, // own knight in blast radius — vaporized too
    a1: { type: 'k', color: 'w' },
    h8: { type: 'k', color: 'b' },
  });
  s.rules = ['atomic-captures'];
  const next = applyMove(s, 'd1', 'd5');
  assert.deepEqual(pieceAt(next, 'd5'), { type: 'r', color: 'w' });
  assert.equal(pieceAt(next, 'c6'), null);
  assert.deepEqual(pieceAt(next, 'd6'), { type: 'p', color: 'b' });
  assert.equal(pieceAt(next, 'e6'), null);
  assert.deepEqual(next.captured.w.sort(), ['b', 'n']); // black knight + bishop
  assert.deepEqual(next.captured.b, ['n']); // white's own knight, lost to the blast
});

test('atomic-captures: exploding your own king is illegal', () => {
  const s = emptyGame({
    d1: { type: 'r', color: 'w' },
    d5: { type: 'n', color: 'b' },
    d6: { type: 'k', color: 'w' }, // own king adjacent to ground zero
    h8: { type: 'k', color: 'b' },
  });
  s.rules = ['atomic-captures'];
  assert.throws(() => applyMove(s, 'd1', 'd5'), /illegal/);
});

test('atomic-captures: vaporizing the enemy king wins', () => {
  const s = emptyGame({
    d1: { type: 'r', color: 'w' },
    d5: { type: 'n', color: 'b' },
    c6: { type: 'k', color: 'b' }, // enemy king adjacent to ground zero
    a1: { type: 'k', color: 'w' },
  });
  s.rules = ['atomic-captures'];
  const next = applyMove(s, 'd1', 'd5');
  const st = status(next);
  assert.deepEqual({ over: st.over, winner: st.winner, reason: st.reason },
    { over: true, winner: 'w', reason: 'king-exploded' });
});

test('combo: atomic capture on a portal detonates at the teleport EXIT (any rules order)', () => {
  const s = emptyGame({
    e1: { type: 'r', color: 'w' },
    e4: { type: 'n', color: 'b' }, // victim on a portal square (e4→d5)
    c6: { type: 'b', color: 'b' }, // adjacent to d5 exit — should be vaporized
    f3: { type: 'q', color: 'b' }, // adjacent to e4 entry only — should SURVIVE
    a1: { type: 'k', color: 'w' },
    h8: { type: 'k', color: 'b' },
  });
  s.rules = ['atomic-captures', 'wormholes']; // deliberately "wrong" order — priority must fix it
  const next = applyMove(s, 'e1', 'e4');
  assert.deepEqual(pieceAt(next, 'd5'), { type: 'r', color: 'w' }); // teleported
  assert.equal(pieceAt(next, 'c6'), null); // blast at exit
  assert.deepEqual(pieceAt(next, 'f3'), { type: 'q', color: 'b' }); // entry untouched
});

test('all five modifiers active: opening double-push rides the wormhole', () => {
  const ids = ['royal-knights', 'berserker-pawns', 'wormholes', 'atomic-captures', 'king-dash'];
  let s = newGame(ids);
  s = applyMove(s, 'e2', 'e4'); // lands on the e4 portal → exits at d5
  assert.equal(pieceAt(s, 'e4'), null);
  assert.deepEqual(pieceAt(s, 'd5'), { type: 'p', color: 'w' });
  s = applyMove(s, 'g8', 'f6');
  assert.equal(status(s).over, false);
});

test('modifiers only apply when their rule id is active', () => {
  const plain = emptyGame({ d4: { type: 'n', color: 'w' } });
  assert.equal(at(plain, 'd4').length, 8);
  const forged = emptyGame({ d4: { type: 'n', color: 'w' } });
  forged.rules = ['royal-knights'];
  assert.equal(at(forged, 'd4').length, 16);
  // In the starting position a royal knight's king-steps are all blocked by
  // its own army, so its move count is unchanged.
  const start = newGame(['royal-knights']);
  assert.equal(at(start, 'b1').length, 2);
});
