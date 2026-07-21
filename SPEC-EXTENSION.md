# SPEC — Step 2: The Rule Forge (custom chess rules extension)

## Goal

Turn the chess app into **Chess Forge**: at game creation the player opens the *Forge* panel and
toggles any combination of rule modifiers. The server engine recomputes move legality, check,
checkmate and win conditions under the forged ruleset. Both windows of a shared game play under
the same forged rules.

## Rule modifiers (all composable — any subset may be active)

| id | name | effect |
|----|------|--------|
| `royal-knights` | Royal Knights | Knights may ALSO move/capture one square in any direction (king-step). |
| `berserker-pawns` | Berserker Pawns | Pawns may ALSO capture straight ahead (their forward push can take). |
| `wormholes` | Wormholes | d4↔e5 and e4↔d5 are paired portals: a piece that ends its move on one instantly teleports to its pair if that square is empty (kings included — mind your step). |
| `atomic-captures` | Atomic Captures | Every capture detonates: all NON-PAWN pieces on the 8 squares around the capture square are destroyed (the capturing piece survives at ground zero). Destroying your own king this way is illegal; vaporizing the enemy king wins. |
| `king-dash` | King Dash | The king may ALSO move two squares in any straight or diagonal line if the intermediate square is empty (dash is not castling; normal castling still exists). |

## Requirements

### Engine (server/rules.js)
- ER1: Modifiers register into the engine's `MODS` registry; the engine consults
  `state.rules` (already plumbed in Step 1).
- ER2: `extraMoves` hooks inject additional pseudo-legal moves (royal-knights, berserker-pawns,
  king-dash). Injected moves participate in normal legality filtering (cannot leave own king in
  check) and in attack/check detection (a royal knight gives check with its king-step; a
  berserker pawn threatens the square ahead).
- ER3: `afterApply` hooks implement board side-effects (wormholes teleport, atomic explosion).
  Side-effects run inside move simulation, so legality accounts for them (a move whose wormhole
  exit leaves your king in check is illegal; an atomic capture that would vaporize your own king
  is illegal).
- ER4: Win condition: if a king is vaporized by an atomic blast, `status()` reports
  `king-exploded` with the surviving side as winner (Step 1 already handles a missing king).
- ER5: Any combination of modifiers must be valid — e.g. a berserker pawn capturing onto a
  wormhole teleports; an atomic capture on a wormhole detonates at the LANDING square (after
  teleport).

### API
- ER6: `POST /api/games` accepts `{ rules: [ids] }` (plumbed in Step 1), validates ids, and
  400s on unknown rule ids.
- ER7: `GET /api/rules` returns the modifier catalog (id, name, description, emoji) so the
  frontend renders the Forge panel from the server's source of truth.

### Frontend
- ER8: "⚒ FORGE" panel: modifier toggle cards shown before/at new game; "Forge New Game"
  creates a game with the selected rules.
- ER9: Active rules are displayed during play (badge list); wormhole squares get a visible glow;
  an atomic capture triggers an explosion flash animation on affected squares.
- ER10: The game link (URL hash) keeps working — a second window sees the same rules.

### Tests
- ET1: Per-modifier engine tests (movement, capture, teleport, explosion, dash) including the
  check-interaction cases in ER2/ER3.
- ET2: A combination test with all five modifiers active.
- ET3: API tests: rules catalog, game creation with rules, unknown rule rejection, and one
  HTTP game demonstrating a modifier in effect.

## Acceptance

A TA forges a game with wormholes + atomic captures, sees the glowing portals, makes a capture
next to a cluster and watches it detonate, and `npm test` stays green.
