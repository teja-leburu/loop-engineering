// Chess Forge engine — pure logic, no I/O. Server-authoritative.
// Board: state.board[rank][file], rank 0 = rank "1" (white home), file 0 = 'a'.
// Pieces: { type: 'p'|'n'|'b'|'r'|'q'|'k', color: 'w'|'b' }.

export const FILES = 'abcdefgh';

export function sq(r, c) {
  return FILES[c] + (r + 1);
}

export function coords(square) {
  const c = FILES.indexOf(square[0]);
  const r = Number(square[1]) - 1;
  return { r, c };
}

export function onBoard(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function pieceAt(state, square) {
  const { r, c } = coords(square);
  return state.board[r][c];
}

const BACK_RANK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

export function newGame(rules = []) {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: BACK_RANK[c], color: 'w' };
    board[1][c] = { type: 'p', color: 'w' };
    board[6][c] = { type: 'p', color: 'b' };
    board[7][c] = { type: BACK_RANK[c], color: 'b' };
  }
  return {
    board,
    turn: 'w',
    castling: { w: { k: true, q: true }, b: { k: true, q: true } },
    epSquare: null,
    history: [],
    captured: { w: [], b: [] }, // captured.w = pieces white has taken
    rules, // active rule-modifier ids (Step 2)
  };
}

export function clone(state) {
  return structuredClone(state);
}

export function findKing(state, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.type === 'k' && p.color === color) return { r, c };
    }
  }
  return null;
}
