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

// --- Rule-modifier registry (populated by rules.js in Step 2) ---------------
// Each modifier: { extraMoves?(state, r, c, piece, mode) -> move[], afterApply?(state, move) }
export const MODS = {};

export function activeMods(state) {
  return (state.rules || []).map((id) => MODS[id]).filter(Boolean);
}

// --- Move generation --------------------------------------------------------
// A move: { from:{r,c}, to:{r,c}, capture?, ep?, double?, promotion?, castle? }
// mode 'moves'  : playable moves (pawn pushes included, diagonals only when capturing)
// mode 'attacks': squares this piece could capture on (used for check detection)

const KNIGHT_D = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const BISHOP_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function stepMoves(state, r, c, piece, deltas) {
  const out = [];
  for (const [dr, dc] of deltas) {
    const nr = r + dr, nc = c + dc;
    if (!onBoard(nr, nc)) continue;
    const target = state.board[nr][nc];
    if (target && target.color === piece.color) continue;
    out.push({ from: { r, c }, to: { r: nr, c: nc }, capture: !!target });
  }
  return out;
}

function slideMoves(state, r, c, piece, deltas) {
  const out = [];
  for (const [dr, dc] of deltas) {
    let nr = r + dr, nc = c + dc;
    while (onBoard(nr, nc)) {
      const target = state.board[nr][nc];
      if (target) {
        if (target.color !== piece.color) {
          out.push({ from: { r, c }, to: { r: nr, c: nc }, capture: true });
        }
        break;
      }
      out.push({ from: { r, c }, to: { r: nr, c: nc }, capture: false });
      nr += dr;
      nc += dc;
    }
  }
  return out;
}

function pawnMoves(state, r, c, piece, mode) {
  const out = [];
  const dir = piece.color === 'w' ? 1 : -1;
  const startRank = piece.color === 'w' ? 1 : 6;
  const promoRank = piece.color === 'w' ? 7 : 0;
  const push = (m) => {
    if (m.to.r === promoRank) m.promotion = true;
    out.push(m);
  };
  // Diagonal captures (in attack mode, generated regardless of occupancy).
  for (const dc of [-1, 1]) {
    const nr = r + dir, nc = c + dc;
    if (!onBoard(nr, nc)) continue;
    const target = state.board[nr][nc];
    if (mode === 'attacks') {
      push({ from: { r, c }, to: { r: nr, c: nc }, capture: true });
    } else if (target && target.color !== piece.color) {
      push({ from: { r, c }, to: { r: nr, c: nc }, capture: true });
    } else if (!target && state.epSquare === sq(nr, nc)) {
      push({ from: { r, c }, to: { r: nr, c: nc }, capture: true, ep: true });
    }
  }
  if (mode === 'attacks') return out;
  // Forward pushes (never captures).
  const fr = r + dir;
  if (onBoard(fr, c) && !state.board[fr][c]) {
    push({ from: { r, c }, to: { r: fr, c }, capture: false });
    const dr2 = r + 2 * dir;
    if (r === startRank && !state.board[dr2][c]) {
      push({ from: { r, c }, to: { r: dr2, c }, capture: false, double: true });
    }
  }
  return out;
}

export function pseudoMoves(state, r, c, mode = 'moves') {
  const piece = state.board[r][c];
  if (!piece) return [];
  let out;
  switch (piece.type) {
    case 'p': out = pawnMoves(state, r, c, piece, mode); break;
    case 'n': out = stepMoves(state, r, c, piece, KNIGHT_D); break;
    case 'b': out = slideMoves(state, r, c, piece, BISHOP_D); break;
    case 'r': out = slideMoves(state, r, c, piece, ROOK_D); break;
    case 'q': out = slideMoves(state, r, c, piece, [...ROOK_D, ...BISHOP_D]); break;
    case 'k': out = stepMoves(state, r, c, piece, KING_D); break;
    default: out = [];
  }
  for (const mod of activeMods(state)) {
    if (mod.extraMoves) out.push(...mod.extraMoves(state, r, c, piece, mode));
  }
  return out;
}

export function allPseudoMoves(state, color, mode = 'moves') {
  const out = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color) out.push(...pseudoMoves(state, r, c, mode));
    }
  }
  return out;
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
