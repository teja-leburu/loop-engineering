import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, pieceAt, sq, coords } from './engine.js';

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
