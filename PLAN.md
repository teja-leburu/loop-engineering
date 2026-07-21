# PLAN — Step 1 build checklist (consumed by the build loop, one task per iteration)

Rules for the loop: take the FIRST unchecked task, implement it, make `npm test` green,
check the box, commit as `loop(step1-build): iteration <N> — <title>`.

- [x] 1. Project scaffold — `package.json` (express dep, `start`/`test` scripts, node:test),
      `server/index.js` Express app serving `public/` + `GET /api/health`, placeholder
      `public/index.html`. Test: API test boots server, health returns ok.
- [ ] 2. Board core — `server/engine.js`: state shape (8×8 board array, turn, castling rights,
      en-passant square, history, captured), `newGame()`, square<->coords helpers, piece-set
      constants. Tests: starting position layout, turn is white.
- [ ] 3. Pseudo-legal move generation for all pieces — pawns (push/double/diagonal captures,
      en passant targets, promotion flags), knights, sliders (bishop/rook/queen), king (1 step).
      Tests: known move counts from the starting position (20 white moves) and crafted positions.
- [ ] 4. Legality + check — attack detection, filter pseudo-legal moves that leave own king in
      check, `applyMove` (mutating captures, en passant capture, promotion, history, captured
      list), `status()` returning ongoing/check/checkmate/stalemate/draw-material.
      Tests: pinned piece can't move, fool's mate is checkmate, stalemate position, K vs K draw.
- [ ] 5. Castling — rights tracking on king/rook moves & rook capture, both sides both colors,
      blocked/through-check rejection, rook relocation on apply. Tests: legal castle both sides,
      each rejection reason.
- [ ] 6. REST API — `POST /api/games`, `GET /api/games/:id`, `GET /api/games/:id/moves?from=`,
      `POST /api/games/:id/move` with 400 + reason on illegal, in-memory `server/store.js`.
      Tests: full API game — scholar's mate via HTTP ends in checkmate status.
- [ ] 7. Frontend board — `public/` neon-themed board rendering from `GET state`, click piece →
      highlight legal moves (from API), click target → POST move, turn indicator, game id in URL
      hash + New Game button. Manual test in browser; API contract already covered by tests.
- [ ] 8. Frontend game-flow polish — move history panel, captured pieces trays, check/mate/
      stalemate banners, promotion picker dialog. Manual test: full game incl. promotion.
