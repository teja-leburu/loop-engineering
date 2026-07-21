# Reflection

The most interesting software-engineering lesson from this exercise was how much the *quality of
the plan determines the quality of the loop*. The build loop itself is almost mindless — "take the
first unchecked task, implement it, make the tests green, commit" — which means every ounce of
engineering judgment has to be spent earlier, in the specify and plan stages. When I sliced
PLAN.md into small, dependency-ordered, independently testable tasks, the loop churned through
them without ever painting itself into a corner; the one architectural decision that paid off most
was made *before* any code existed: requiring in the spec that move generation be hookable, because
Step 2 would inject rule modifiers. That single sentence in SPEC.md meant the extension dropped in
as a registry of `extraMoves`/`afterApply` hooks with zero rewrites of the base engine — even the
nasty interaction cases (a wormhole teleport that must resolve *before* an atomic detonation, or an
explosion that would vaporize your own king being illegal) fell out of the existing
simulate-then-check legality pipeline. The loop also exposed the flip side: agents make confident
local mistakes (my first HTTP test "proved" a rule modifier worked via a move that was legal in
plain chess too), and the only durable defense is the same one we use with human teammates —
adversarial tests, tiny reviewable increments, and a commit history honest enough to audit. In
short: iteration automates the typing, but specification and test design are still where the
engineering lives.
