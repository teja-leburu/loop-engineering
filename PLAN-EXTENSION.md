# PLAN — Step 2 build checklist (consumed by the build loop, one task per iteration)

Rules for the loop: take the FIRST unchecked task, implement it, make `npm test` green,
check the box, commit as `loop(step2-build): iteration <N> — <title>`.

- [ ] 1. Movement modifiers — `server/rules.js` with the MODS registry entries + catalog
      metadata; implement `royal-knights`, `berserker-pawns`, `king-dash` via `extraMoves`.
      Tests: extra moves exist and capture; royal knight delivers king-step check; berserker
      pawn forward-capture threatens check; dash blocked by occupied intermediate; none of the
      extra moves may leave own king in check.
- [ ] 2. Side-effect modifiers — `wormholes` and `atomic-captures` via `afterApply` inside the
      engine's apply pipeline. Tests: teleport on landing (incl. occupied-exit stays), atomic
      blast clears non-pawns in 3×3 but spares pawns and the capturer, own-king-explosion is
      illegal, enemy-king explosion ends the game (`king-exploded`), wormhole+atomic combo
      detonates at the teleport exit, all-five-modifiers combination game plays.
- [ ] 3. API surface — `GET /api/rules` catalog endpoint; validate rule ids on game creation
      (400 on unknown). Tests: catalog lists 5 modifiers; forged game echoes its rules; unknown
      id rejected; HTTP game with royal-knights shows a knight king-step move in /moves.
- [ ] 4. Forge frontend — Forge panel with toggle cards (rendered from /api/rules), "Forge New
      Game" button, active-rule badges during play, wormhole square glow, atomic explosion
      flash animation. Manual browser test; API already covered.
