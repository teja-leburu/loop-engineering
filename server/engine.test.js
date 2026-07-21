import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, pieceAt, sq, coords, allPseudoMoves, pseudoMoves } from './engine.js';
import { emptyGame } from './test-helpers.js';

test('square helpers round-trip', () => {
  assert.equal(sq(0, 0), 'a1');
  assert.equal(sq(7, 7), 'h8');
  assert.deepEqual(coords('e2'), { r: 1, c: 4 });
});

test('starting position layout and turn', () => {
  const s = newGame();
  assert.equal(s.turn, 'w');
  assert.deepEqual(pieceAt(s, 'e1'), { type: 'k', color: 'w' });
  assert.deepEqual(pieceAt(s, 'd8'), { type: 'q', color: 'b' });
  assert.deepEqual(pieceAt(s, 'a1'), { type: 'r', color: 'w' });
  assert.deepEqual(pieceAt(s, 'b8'), { type: 'n', color: 'b' });
  for (const f of 'abcdefgh') {
    assert.deepEqual(pieceAt(s, f + '2'), { type: 'p', color: 'w' });
    assert.deepEqual(pieceAt(s, f + '7'), { type: 'p', color: 'b' });
    assert.equal(pieceAt(s, f + '4'), null);
  }
});

test('starting position: 20 pseudo-legal moves for each side', () => {
  const s = newGame();
  assert.equal(allPseudoMoves(s, 'w').length, 20);
  assert.equal(allPseudoMoves(s, 'b').length, 20);
});

test('knight and rook move counts on open board', () => {
  const s = emptyGame({ d4: { type: 'n', color: 'w' }, a1: { type: 'r', color: 'w' } });
  assert.equal(pseudoMoves(s, ...Object.values(coords('d4'))).length, 8);
  assert.equal(pseudoMoves(s, ...Object.values(coords('a1'))).length, 14);
});

test('pawn: double push, blocked push, diagonal capture only when enemy present', () => {
  const s = emptyGame({
    e2: { type: 'p', color: 'w' },
    d3: { type: 'p', color: 'b' },
    f3: { type: 'p', color: 'w' },
  });
  const { r, c } = coords('e2');
  const targets = pseudoMoves(s, r, c).map((m) => sq(m.to.r, m.to.c)).sort();
  assert.deepEqual(targets, ['d3', 'e3', 'e4']); // captures d3, not own f3
  // blocked pawn: no forward moves
  const s2 = emptyGame({ e2: { type: 'p', color: 'w' }, e3: { type: 'p', color: 'b' } });
  assert.equal(pseudoMoves(s2, r, c).length, 0);
});

test('pawn promotion flag set on reaching last rank', () => {
  const s = emptyGame({ g7: { type: 'p', color: 'w' } });
  const { r, c } = coords('g7');
  const moves = pseudoMoves(s, r, c);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].promotion, true);
});
