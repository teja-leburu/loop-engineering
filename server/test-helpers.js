import { newGame, coords } from './engine.js';

// Build a position from scratch: emptyGame({ e4: {type:'k',color:'w'}, ... })
export function emptyGame(pieces, turn = 'w') {
  const s = newGame();
  s.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  s.castling = { w: { k: false, q: false }, b: { k: false, q: false } };
  for (const [square, piece] of Object.entries(pieces)) {
    const { r, c } = coords(square);
    s.board[r][c] = { ...piece };
  }
  s.turn = turn;
  return s;
}
