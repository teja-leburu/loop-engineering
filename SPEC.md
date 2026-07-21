# SPEC — Step 1: Base System (Chess Forge core)

## Goal

A playable, server-authoritative chess web app. Two players share one browser (hot-seat) or two
browser windows pointed at the same game id. All rules are enforced by the backend engine; the
frontend never decides legality.

## Non-goals (base system)

- No accounts / auth.
- No engine opponent (human vs human only).
- No database — in-memory game store keyed by game id (persistence is optional future work).
- Custom rule modifiers are **Step 2** (the extension). The base engine must however be written
  so move generation is hookable/modifiable, because Step 2 will inject rule modifiers.

## Functional requirements

### Engine (server/engine.js — pure logic, no I/O)
- FR1: Board representation of a standard 8×8 game, standard starting position.
- FR2: Full legal move generation for all pieces: pawn (single/double push, diagonal capture,
  en passant, promotion), knight, bishop, rook, queen, king.
- FR3: Castling (both sides, both colors) with all standard preconditions
  (no prior king/rook movement, empty between, not through/into/out of check).
- FR4: A move is illegal if it leaves the mover's own king in check (validated by simulation).
- FR5: Game status detection: check, checkmate, stalemate, and draw by insufficient material
  (K vs K, K+B vs K, K+N vs K).
- FR6: Move history in coordinate notation (e.g. `e2e4`, `e7e8q` for promotion).
- FR7: Engine exposes: `newGame()`, `legalMoves(state, square)`, `allLegalMoves(state)`,
  `applyMove(state, from, to, promotion)`, `status(state)`. State is JSON-serializable.

### API (server/index.js — Express)
- FR8: `POST /api/games` → create game, returns `{ id, state }`.
- FR9: `GET /api/games/:id` → current state (board, turn, status, history, captured pieces).
- FR10: `GET /api/games/:id/moves?from=e2` → legal destination squares for that piece.
- FR11: `POST /api/games/:id/move` body `{ from, to, promotion? }` → applies move or 400 with reason.
- FR12: Serves the frontend statically from `public/`.

### Frontend (public/)
- FR13: Renders the board with unicode pieces, rank/file labels, dark/light squares,
  futuristic neon theme.
- FR14: Click a piece → its legal destinations highlight; click a destination → move is sent to
  the server; board re-renders from server state.
- FR15: Shows: whose turn, check/checkmate/stalemate banners, move history list, captured pieces.
- FR16: Promotion picker when a pawn reaches the last rank.
- FR17: "New game" button; game id shown in the URL hash so a second window can join the same game.

## Quality requirements

- Q1: Engine covered by automated tests (node:test): starting-position move counts (perft-lite
  depth 1–2), castling, en passant, promotion, check/checkmate/stalemate scenarios (e.g.
  fool's mate, stalemate position).
- Q2: API covered by tests using `fetch` against an ephemeral server instance.
- Q3: `npm install && npm start` is all a TA needs. `npm test` runs everything.
- Q4: Only production dependency: `express`.

## Acceptance

A TA can open http://localhost:3000, play a full game including castling and promotion, see
checkmate declared (e.g. play fool's mate), and `npm test` passes.
