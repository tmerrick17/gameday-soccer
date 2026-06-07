# Greedy rule engine with pluggable Strategy, not a black-box optimizer

## Status

accepted

## Context

The rotation engine must "optimize toward equal playing time (minimize minute spread)" while also being "deterministic and explainable" so a coach can see *why* a kid is subbing. A true optimizer (search / ILP) gives the tightest minutes but can only explain decisions as "the solver preferred it," which fails the explainability requirement. The app must also serve different team philosophies over time — a rec team wanting fair minutes today, a club team wanting the best players to stay on later.

## Decision

The engine is a **greedy, rule-based generator**: at each wave it subs in the highest-priority eligible Player for an open Position and subs out the lowest-priority one past their Role's minimum shift, with a fixed deterministic tiebreak (fewest minutes → fewest shifts → lowest PlayerId). What "highest priority" means is set by a swappable **Strategy** (Equal-time = fewest minutes first; Competitive = highest Ability first; Development = least Role variety first; Blend = fewest minutes tie-broken by variety), chosen per Team in setup. The mechanism is identical across Strategies — only the priority key changes. The fairness check is a *report* on the resulting spread, not part of the optimization.

## Consequences

- Every sub is explainable in one sentence, and live re-solve is trivial (re-sort the queue).
- Plans may not hit the mathematically minimal spread — accepted in exchange for explainability.
- One engine serves rec and club teams by swapping a single Preference, with no rewrite.
- Switching to a true optimizer later would mean rewriting the core; that cost is the reason this is recorded.
