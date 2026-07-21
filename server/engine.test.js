import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, pieceAt, sq, coords, allPseudoMoves, pseudoMoves,
  legalMovesAt, applyMove, status,
} from './engine.js';
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

test('pinned knight has no legal moves', () => {
  const s = emptyGame({
    e1: { type: 'k', color: 'w' },
    e3: { type: 'n', color: 'w' },
    e8: { type: 'r', color: 'b' },
    a8: { type: 'k', color: 'b' },
  });
  const { r, c } = coords('e3');
  assert.equal(pseudoMoves(s, r, c).length, 8);
  assert.equal(legalMovesAt(s, r, c).length, 0);
});

test("fool's mate is checkmate", () => {
  let s = newGame();
  s = applyMove(s, 'f2', 'f3');
  s = applyMove(s, 'e7', 'e5');
  s = applyMove(s, 'g2', 'g4');
  s = applyMove(s, 'd8', 'h4');
  const st = status(s);
  assert.deepEqual(
    { over: st.over, winner: st.winner, reason: st.reason },
    { over: true, winner: 'b', reason: 'checkmate' }
  );
  assert.deepEqual(s.history, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
});

test('stalemate: cornered king with no moves, not in check', () => {
  const s = emptyGame(
    { a8: { type: 'k', color: 'b' }, b6: { type: 'q', color: 'w' }, h1: { type: 'k', color: 'w' } },
    'b'
  );
  const st = status(s);
  assert.deepEqual(
    { over: st.over, winner: st.winner, reason: st.reason },
    { over: true, winner: null, reason: 'stalemate' }
  );
});

test('insufficient material: K vs K and K+N vs K are draws, K+R is not', () => {
  const kk = emptyGame({ a1: { type: 'k', color: 'w' }, h8: { type: 'k', color: 'b' } });
  assert.equal(status(kk).reason, 'insufficient-material');
  const kkn = emptyGame({
    a1: { type: 'k', color: 'w' }, h8: { type: 'k', color: 'b' }, d4: { type: 'n', color: 'w' },
  });
  assert.equal(status(kkn).reason, 'insufficient-material');
  const kkr = emptyGame({
    a1: { type: 'k', color: 'w' }, h8: { type: 'k', color: 'b' }, d4: { type: 'r', color: 'w' },
  });
  assert.equal(status(kkr).over, false);
});

test('en passant: capture removes the passed pawn', () => {
  let s = emptyGame({
    e5: { type: 'p', color: 'w' },
    d7: { type: 'p', color: 'b' },
    e1: { type: 'k', color: 'w' },
    e8: { type: 'k', color: 'b' },
  }, 'b');
  s = applyMove(s, 'd7', 'd5');
  assert.equal(s.epSquare, 'd6');
  s = applyMove(s, 'e5', 'd6');
  assert.deepEqual(pieceAt(s, 'd6'), { type: 'p', color: 'w' });
  assert.equal(pieceAt(s, 'd5'), null);
  assert.deepEqual(s.captured.w, ['p']);
});

test('promotion: pawn becomes chosen piece', () => {
  let s = emptyGame({
    g7: { type: 'p', color: 'w' },
    a1: { type: 'k', color: 'w' },
    h4: { type: 'k', color: 'b' },
  });
  s = applyMove(s, 'g7', 'g8', 'n');
  assert.deepEqual(pieceAt(s, 'g8'), { type: 'n', color: 'w' });
  assert.equal(s.history.at(-1), 'g7g8n');
});

test('illegal moves throw: wrong turn, illegal destination', () => {
  const s = newGame();
  assert.throws(() => applyMove(s, 'e7', 'e5'), /turn/);
  assert.throws(() => applyMove(s, 'e2', 'e5'), /illegal/);
  assert.throws(() => applyMove(s, 'e4', 'e5'), /no piece/);
});
