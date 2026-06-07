# GameDay Soccer

A coach-facing web app that turns the sideline "laminated index card" into a deterministic rotation engine plus a live game-day assistant for youth soccer.

## Language

### Accounts & access

**User**:
An authenticated person (one sign-in). A User may coach more than one Team. There is no separate "account" concept — the User *is* the account.
_Avoid_: account, member

**Team**:
The unit everything hangs off: a Roster, a set of Preferences, attendance, and season history. Owned by one Head Coach, shared with invited Coaches.
_Avoid_: club, group

**Coach**:
A User's membership on a Team — a role, not a separate record. Has full edit on roster, preferences, attendance, and full live-game control. Cannot manage membership or delete the Team.
_Avoid_: assistant coach, co-coach (collapsed into this one role)

**Head Coach**:
The Team's creator/owner. Everything a Coach can do, **plus** inviting/removing members and deleting the Team. The only tier above Coach.
_Avoid_: owner, admin

Joining is **invite-only** (a code/link from the Head Coach); there is no public team discovery, because this is children's data.

### People & squad

**Player**:
A season-long roster member, identified by a stable internal id that is never reused.
_Avoid_: kid (in code/UI copy), participant

**Number**:
A Player's jersey number — a mutable display label, not identity. Teams may have no numbers at all.
_Avoid_: id, jersey id

**Roster**:
The full season-long list of Players on a team.
_Avoid_: team list

**Squad**:
The subset of Players present *and currently available* for one game — the engine's actual input. Produced by marking attendance. An injured or departed Player leaves the Squad (shrinking it and firing a re-solve), rather than sitting out.
_Avoid_: attendees, present list

**Lineup**:
The Players on the field during a given segment — one column of the planning grid.
_Avoid_: formation (that's the shape), on-field set

**Subs**:
Squad members not currently in the Lineup — the sideline pool the next wave comes in from. A derived view (Squad minus current Lineup), never stored separately. Distinct from a *substitution*/*wave*, which is the event.
_Avoid_: bench, sideline

**Next-up queue**:
The ordered front of the Subs — the 1–3 Players teed up to enter at the next stoppage.
_Avoid_: on-deck

### Positions & formation

**Role**:
The category a Position belongs to: one of the fixed four — **Forward, Mid, Defender, Keeper**. Roles drive all behavior: rotation cadence (forwards fast, defenders slow), scoreboard development swaps, and season variety. Coaches do not create new Roles.
_Avoid_: line, group

**Position**:
A single named spot in a Formation (one row of the planning grid). The display name is coach-configurable — "LF," "Striker," "Sweeper" — but every Position maps to exactly one Role. A wave moves a Player out of a Position and another in.
_Avoid_: slot, spot, position (legacy overloaded sense)

**Formation**:
The shape of the team on the field, stored as data: a count of Positions per Role, fully dynamic per team. Examples: 2-3-2+GK (8v8), 1-3-3+GK, 3-3-4+GK (11v11), 2-2+GK (small-sided). The only constraints: total Positions = the on-field side size, and Keeper is 0 or 1. Nothing is hardcoded to 8v8.
_Avoid_: shape, setup

### Engine

**Strategy**:
The rule that defines what the engine optimizes toward, by setting the priority order of the next-up queue. One per Team, chosen in setup. Equal-time = fewest minutes first; Competitive = highest ability first; Development = least Role variety first; Blend = fewest minutes tie-broken by variety. The engine mechanism is identical across Strategies — only the priority key changes.
_Avoid_: philosophy, mode, algorithm

**Preferred Roles**:
Up to two Roles a Player likes to play. Optional per Player. Bias input for assignment under the relevant Strategy; the engine works with none set.
_Avoid_: favorite position

**Stretch Role**:
One Role a Player doesn't prefer but is being developed in. Optional. In v2, development mode steers the Player toward this Role for experience. Captured in v1, acted on in v2.
_Avoid_: weakness, growth area

**Ability**:
A per-Player rating used by the Competitive Strategy to decide who stays on. Ignored by the Equal-time Strategy.
_Avoid_: skill, rating, rank

**Keeper pool**:
The set of Players eligible to play goal (the "can-keep-goal" tag) — any size, often larger than the 2 needed. Each game, the coach selects exactly two keepers (one per half) from the pool, defaulting to the season rotation but overridable per game. The season tracker spreads goalie duty across the whole pool over the weeks.
_Avoid_: goalies, keeper list

**Keeper lock**:
A hard engine invariant: a keeper plays their entire half in goal — no mid-half goalie substitution. Keeper changes happen only at halftime. The off-half keeper's cameo is therefore always an outfield shift.
_Avoid_: goalie hold

**Cadence**:
A per-Role minimum shift length — how long a Player in that Role stays before the engine will rotate them. Defenders have long Cadence; Mids and Forwards both have short Cadence (the fast-rotating "front line"). Long Cadence keeps defenders on the field longer, so by design they accumulate ~5–8 more total minutes per game than Mids/Forwards ("defenders run hot"). This per-game spread is accepted — Mids and Forwards play fewer minutes but get more ball touches per minute, and exact minute equality is reached across the season, not within one game. Layered as a constraint on top of the queue's priority sort.
_Avoid_: tempo, interval, rotation speed

**Fairness check**:
A post-generation *report* (not part of the optimization) on the minute spread a plan produced, flagging any Player drifting light or heavy. Describes the plan; never changes it.
_Avoid_: balancer

### Time & rotation

**Game**:
A single match a Team plays. For v1, a Game is always **two halves** (default 20 min each). Quarters and configurable structure are deferred; two-halves is a fixed v1 assumption that the keeper model and segment grid rely on.
_Avoid_: match (in code), fixture

**Half**:
One of a Game's two periods. The unit the keeper model turns on — one keeper per Half, keeper changes only at halftime (see Keeper lock).
_Avoid_: period

**Segment**:
A fixed slice of game clock shared by the whole field — the columns of the planning grid (~6 min by default). The engine's planning-time quantum: pre-game it fills every segment with a lineup. In live mode, segments are *targets*, not law — real stoppages bend them and trigger a re-solve.
_Avoid_: block, slice, period

**Wave**:
The set of players who enter and exit together at a single stoppage — a substitution *event*, not a duration. Size is a tunable Preference (1 up to a configurable max; this coach's max is 2, others run 3+).
_Avoid_: rotation, swap, group

**Breather**:
A Position a few Players rotate through purely for rest when Subs are too few (1–2) to run full Waves. Keeps short-rostered kids from playing the whole game flat-out.
_Avoid_: rest spot

**Shift**:
One player's continuous stretch of time on the field, spanning one or more segments.
_Avoid_: stint, run

**Cameo**:
A short field shift (~5 min) given to an off-half keeper so their playing time stays equal.
_Avoid_: appearance
