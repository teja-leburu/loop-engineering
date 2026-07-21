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
