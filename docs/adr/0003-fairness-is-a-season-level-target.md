# Fairness is a season-level target, not a per-game guarantee

## Status

accepted

## Context

"Equal playing time" is the headline value, and the obvious reading is *equal minutes for every kid in every game*. But soccer roles aren't symmetric: defenders touch the ball less and are disrupted by frequent subs, while mids and forwards get constant action in short bursts. Forcing strictly equal per-game minutes would mean yanking defenders on a short cycle (bad for them and the team) or capping the front line artificially. The coach's real-world worked plan (`docs/rotation-plan.md`) deliberately lets defenders run longer.

## Decision

Fairness is measured **across the season**, not within a single game. Within any one game, **defenders run hot** — long Cadence keeps them on ~5–8 minutes more than Mids and Forwards, who rotate fast (short Cadence), play fewer minutes, and are compensated by more ball touches per minute. Keepers land near the front-line total via their half plus an emergent outfield cameo. Exact minute equality is achieved over the weeks by rotating the long-shift "short straw" defender each game and rotating the front-line starting order. The Equal-time Strategy's least-minutes-first queue still drives toward equality; per-Role Cadence is what produces the accepted intra-game spread. This matches §2.1's framing of equal time as an optimization target, not a hard constraint.

## Consequences

- The fairness check reports per-game spread but does not treat defender-hot minutes as an error.
- A future dev must not "fix" the engine to force per-game equality — doing so would break defender shifts; that is why this is recorded.
- Season tracking (the short-straw and front-line-label rotations, §2.10) is load-bearing for fairness, not just a nicety — though its automation is deferred to v2.
