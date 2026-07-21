# Running Chess Forge ⚡

## Prerequisites

- Node.js 18+ (uses the built-in `node:test` runner and `fetch`; developed on Node 25)
- npm

No database, no Redis, no environment variables — the game store is in-memory.

## Run it

```bash
npm install
npm start
```

Open **http://localhost:3000**. (Different port: `PORT=4000 npm start`.)

## Play it

1. **Plain chess:** just click a piece — legal destinations light up — then click a destination.
   Castling, en passant, and promotion (a picker dialog appears) all work. Checkmate,
   stalemate, and insufficient-material draws are declared in the status panel.
2. **Forge a variant:** in the left panel, toggle any combination of the five rule modifiers
   (hover a card for its description), then press **⚒ Forge New Game**:
   - ♞ **Royal Knights** — knights also step one square any direction.
   - ⚔ **Berserker Pawns** — pawns may capture straight ahead.
   - 🌀 **Wormholes** — d4↔e5 and e4↔d5 are portals; land on one, teleport to its pair
     (portals glow on the board). Try 1. e2–e4 and watch the pawn exit at d5.
   - 💥 **Atomic Captures** — captures detonate, destroying adjacent non-pawn pieces
     (explosion flash on the board). Vaporize the enemy king to win; vaporizing your own is illegal.
   - ⚡ **King Dash** — the king may leap two squares over an empty square.
3. **Two windows:** the game id is in the URL hash — open the same URL in a second window and
   it stays in sync (1.5 s polling), so two people can play from two browsers.

## Test it

```bash
npm test
```

38 tests: engine (move generation, castling, en passant, promotion, check/mate/stalemate/draws),
all five rule modifiers incl. combinations (e.g. atomic capture on a wormhole detonates at the
teleport exit), and full HTTP games against the REST API (scholar's mate over HTTP).

## API (if you want to poke it directly)

```bash
curl -X POST localhost:3000/api/games -H 'content-type: application/json' -d '{"rules":["wormholes"]}'
curl localhost:3000/api/games/<id>
curl "localhost:3000/api/games/<id>/moves?from=e2"
curl -X POST localhost:3000/api/games/<id>/move -H 'content-type: application/json' -d '{"from":"e2","to":"e4"}'
curl localhost:3000/api/rules
```
