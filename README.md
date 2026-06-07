# GameDay Soccer

A mobile-first PWA that turns the sideline "laminated index card" into a **deterministic rotation engine** plus a live game-day assistant for youth soccer. A coach sets up their team and preferences once; from then on the app builds a fair sub plan and, at any stoppage, tells them **exactly who subs in, who comes off, and into what position.**

## The problem

Coaching youth soccer means solving a live optimization problem every Saturday — who plays, who sits, who subs for whom, when, in what position — under equal-playing-time, development, goalie-rotation, and scoreboard constraints, with whoever actually showed up. Today it's a laminated card and sideline mental math: error-prone, hard to keep fair across a season, and it falls apart the moment kids are absent. This app builds the rotation for you.

## What it does (v1)

1. **Roster & number board** — create a Team, add Players, tag Roles/abilities, set a dynamic Formation (any N-v-N).
2. **Preferences** — pick a rotation Strategy (equal-time, competitive, development, blend) and the rules in §2 of the design docs.
3. **Attendance** — tap who's present to form the Squad.
4. **Rotation generator** — produce a full, explainable sub plan with per-Player minute totals and a fairness check.
5. **Live game-day mode** — a clock + "SUB NOW" prompts, with manual override and re-generate-from-here.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| UI | **Next.js (App Router) + TypeScript**, installable **PWA** | Mobile-first, one-handed sideline use; runs offline ([ADR 0002](docs/adr/0002-local-first-single-active-device.md)) |
| Rotation engine | **Pure TypeScript package** (`/lib/engine`), Firebase-independent | Deterministic, explainable, oracle-tested ([ADR 0001](docs/adr/0001-greedy-engine-pluggable-strategy.md)) |
| Data + auth | **Firebase Firestore + Firebase Auth** | Offline-first, last-write-wins, invite-only sharing ([ADR 0004](docs/adr/0004-firebase-for-offline-first-data-and-auth.md)) |
| State | **Zustand** | Live-game state (clock, Lineup, next-up queue) |
| Styling | **Tailwind CSS** | Hand-built mobile components |
| Testing | **Vitest** | `docs/rotation-plan.md` encoded as the engine's golden test |
| Hosting | **Netlify** | |

## Deferred to v2

- The **agentic / LLM layer** (natural-language setup, in-game Q&A, re-planning narration). Guardrail for when it returns: *the LLM never decides minutes — it translates and narrates around the deterministic engine.*
- **Scoreboard development mode** + hysteresis.
- **Season-fairness automation** (the engine still treats the season as the true fairness unit — see [ADR 0003](docs/adr/0003-fairness-is-a-season-level-target.md) — but the week-to-week carryover is a manual ritual in v1).

## Project docs — sources of truth

- **[`CONTEXT.md`](CONTEXT.md)** — the domain glossary (canonical language). Start here.
- **[`docs/adr/`](docs/adr/)** — architecture decisions and *why* they were made.
- **[`docs/rotation-plan.md`](docs/rotation-plan.md)** — the verified worked example; the engine's **acceptance test (oracle)**.
