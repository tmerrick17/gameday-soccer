# Project Description — Youth Soccer Lineup & Auto-Sub Web App

## 1. The problem

Coaching youth soccer (U8, 8v8) means solving a live optimization problem every Saturday while also actually coaching: who plays, who sits, who subs for whom, when, in what position — under constraints like equal playing time, development goals, a goalie rotation, the scoreboard, and whoever actually showed up that day.

Today this is done with a laminated index card and mental math on the sideline. It's error-prone, hard to keep fair across a season, and falls apart the moment kids are absent or the game state changes. This project turns that index card into a **dynamic, preference-driven web app** that builds the rotation for you and tells you, at any moment in the game, **who can sub and who comes off.**

The app is built around a real worked example (the rotation we designed together) so the domain logic is grounded, not theoretical.

---

## 2. The domain — every decision and the options we considered

These are the "knobs." The app's value is letting a coach set these as **preferences** and having the engine generate a valid rotation. Each decision below becomes a configurable input. The **bold** option is what this coach chose; the others stay in the app as supported alternatives.

### 2.1 Substitution philosophy (the spine)
- (A) Equal playing time — fairness first
- (B) Competitive — best players play more, sub to win
- (C) Development — everyone cycles through positions
- **(A+C blend) — equal time as the primary objective the engine optimizes toward, development layered on top** ✅
  - Equal time is a **target the engine optimizes toward**, not a hard constraint it guarantees — it minimizes minute spread across the squad and surfaces drift, but real-game events (absences, injuries, breaks) can pull it off perfectly equal.

### 2.2 Goalie handling
- (A) Rotate keeper every half/game
- (B) One or two designated keepers
- (C) Keeper is just another rotation position
- **Chosen: two designated keepers, one per half** ✅
- Sub-decision — does goalie time count toward equal-time budget?
  - Half-value (keeper plays a full field half on their off-half)
  - **Full-value — keeper plays ~5 min field on their off-half, sits the rest (true equal time)** ✅

### 2.3 League substitution rules (a constraint, not a preference)
- **(A) Free subbing at any stoppage** ✅
- (B) Subs only at fixed stoppages (mid-half water break + halftime)
- (C) Subs only at halftime / quarter breaks
- (D) Rec-league honor system

### 2.4 Sub tempo / granularity
- 5-minute shifts — tightest equality, heavy management
- 10-minute blocks — simplest, wide per-game spread
- **~6-minute rolling waves of 2-3 players via a "next-up" queue** ✅

### 2.5 Wave composition
- (A) Pure FIFO ("next two up", ignore skill)
- **(B) Balanced waves — mix ability so you never stack 3 weak/3 strong** ✅ (implicitly, via position-based rotation)
- (C) Anchor players who stay on longer

### 2.6 Position-based rotation weighting
- **Forwards & mids rotate fast (the front five); defenders play longer because they touch the ball less** ✅
- Defenders rotate, just on a slower (~10-min) cadence — not parked all game
- Defender pool = 2-3 kids covering 2 back spots

### 2.7 Position variety across the season (development)
- (A) Pure specialization all season
- **(B) Clean roles within a game, rotate roles across the season** ✅
- (C) Full in-game position variety

### 2.8 Scoreboard-aware development mode
- Default (competitive): everyone plays favored roles
- **Trigger: at +5 goal lead → development mode (forwards drop back, defenders push up, least-experienced kids get the most attacking minutes)** ✅
- Hysteresis: enter at +5, **exit at +2/+3** to avoid flip-flopping
- Changes only ever happen at a stoppage, never mid-play

### 2.9 Short-roster collapse rules (fewer than full squad)
- **13–11 present:** run waves as designed
- **10–9 present:** drop fast waves, rotate 1-2 kids through a "breather" spot
- **8 present:** no subs, everyone plays the full game
- Always preserve: goalie-per-half + defenders on longer shifts

### 2.10 Season-long fairness rotation
- Front line: number kids 1-8, slide F-slot labels by one each week → rotates who starts on bench / closes the game
- Defenders: rotate the 20-min "short straw" slot on a 3-week cycle
- Keepers: swap first/second-half net each week

> The fully worked output of these decisions lives in `rotation-plan.md`.

---

## 3. The web app — vision

A coach opens the app, sets up their team once, sets their preferences once, and from then on:

1. **Builds the board** — drags players onto a 2-3-2 (or any) formation, assigning each a **number** and a **position/role preference**.
2. **Captures preferences** — equal-time vs. competitive, sub tempo, who can keep goal, who's a defender, scoreboard development trigger, etc. (everything in Section 2).
3. **Marks attendance** — taps who showed up today.
4. **Generates a rotation** — the engine produces a valid, fair sub plan for the game: shift charts, minute totals per kid, and a wave queue.
5. **Runs game day** — a live mode that, at every stoppage, tells the coach **exactly who subs in, who comes off, and into what position** — adjusting dynamically to the scoreboard and the clock.

The headline capability: **when you start a game, you always know who can sub.**

---

## 4. Core features

### 4.1 Roster & number board
- Create a team, add players, assign **jersey numbers**.
- Tag each player with role preferences/abilities: can-keep-goal, defender-pool, front-line, "developing" flag, stamina notes.
- Visual formation board — drag players into slots. **Formation is asked at setup and supports general N-v-N** (e.g. 8v8 / 2-3-2 + GK by default, but any side size and shape can be configured), so the app isn't locked to one format.

### 4.2 Preference engine
- A settings panel that mirrors Section 2: philosophy, goalie model, tempo, wave size, defender weighting, scoreboard trigger + hysteresis, short-roster behavior.
- Saved per team, reusable every week.

### 4.3 Attendance & auto-collapse
- Tap-to-mark who's present.
- Engine auto-applies the correct collapse rule for the headcount.

### 4.4 Rotation generator (the core algorithm)
- Takes roster + preferences + attendance → outputs a full game rotation:
  - Per-segment lineups (the wave grid)
  - Defender shift blocks
  - Goalie halves + field cameos
  - **Minute totals per player** with a fairness check
- Optimizes toward equal playing time as the objective (minimizing minute spread) rather than enforcing it as a hard guarantee — the fairness check reports how close the plan lands and flags any kid drifting light or heavy.
- Deterministic and explainable: the coach can see *why* a kid is subbing.

### 4.5 Live game-day mode
- A running clock with the current lineup and the on-deck wave.
- At each stoppage: a clear "**SUB NOW**" card — who's in, who's out, what position.
- Scoreboard tracker that flips into development mode at +5 (and back out at +2/+3), only suggesting role swaps at stoppages.
- Manual override anytime (kid gets hurt, bathroom, timeout) — the engine re-balances the remaining minutes on the fly.

### 4.6 Season tracker
- Carries the week-to-week starting rotation forward automatically (Section 2.10) so fairness is enforced across games, not just within one.
- Per-player season minute totals and position-variety history.

---

## 5. The dynamic / agentic angle

The "agentic" layer is what separates this from a static spreadsheet:

- **Dynamic re-planning:** any in-game event (absence, injury, score change, a kid needs a break) triggers an immediate re-solve of the remaining minutes so the plan stays fair to the final whistle.
- **Natural-language setup:** a coach describes their philosophy in plain English ("equal time, keep my two goalies, rotate forwards fast, go development mode if we're up big") and an agent maps it to the preference settings — exactly the conversation that produced this project.
- **Coaching assistant:** an agent that can answer "who should I sub next and why?", flag fairness drift ("Kid #7 is 6 minutes light this game"), and suggest season-level corrections.
- **Explainable suggestions:** every recommendation comes with its reasoning, so the coach stays in control and can veto.

---

## 6. Tech stack

- **Frontend:** Next.js (React) — formation board, preference panels, live game-day UI. Mobile-first (used one-handed on a sideline).
- **State/data:** accounts + cloud sync. A coach signs in, and **assistant coaches can find the same team and edit the same info** (roster, preferences, attendance, rotation) — shared, multi-coach access to a single team's data, persisted in the cloud for teams, preferences, and season history.
- **Rotation engine:** a deterministic core library (pure functions: roster + prefs + attendance + game state → lineup plan), kept separate from the UI so it's testable and reusable.
- **Agentic layer:** an LLM-backed assistant for NL setup, in-game Q&A, and re-planning narration — calling into the deterministic engine rather than replacing it.

---

## 7. MVP scope (first cut)

1. Create team + roster with jersey numbers and basic role tags.
2. Set core preferences (philosophy, goalie model, tempo, defender weighting).
3. Mark attendance.
4. Generate a static rotation card (like `rotation-plan.md`) with minute totals.
5. A simple live mode: clock + "who subs next" prompts at fixed intervals.

**Defer to v2+:** scoreboard development mode, full dynamic re-planning, NL setup agent, season-long fairness carryover, coaching-assistant Q&A.

---

## 8. Open questions to resolve next

- Where does the agent stop and the deterministic engine start (which decisions are LLM-made vs. rule-made)?
- Offline behavior — sidelines often have no signal; how much must work offline?
