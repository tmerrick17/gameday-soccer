# Local-first with background cloud sync; single active device per live game

## Status

accepted

## Context

§6 committed to accounts + cloud sync with multi-coach access. But the app's most critical moment — live game-day mode on a Saturday sideline — is exactly when connectivity is least reliable. A cloud-first design would block or fail precisely when it matters most. Multi-coach + offline edits also raise conflict-resolution, which is hard for live game state and unnecessary for this audience (a single coach runs the game).

## Decision

The app is **local-first**: everything game-critical (view roster/squad, mark attendance, generate rotation, run live mode, override, re-solve) runs fully on-device with zero connectivity. Cloud sync is a **background** concern — it pushes/pulls when signal exists for (a) multi-coach sharing of setup data and (b) season history between games — and never blocks gameplay. A live game is held by a **single active device** at a time (others may claim/take over the session, but no simultaneous co-driving of the clock). Setup data (roster, preferences) syncs with **last-write-wins per field**.

## Consequences

- A coach can run an entire game in airplane mode and lose nothing.
- No real-time merge logic is needed for live game state — the single-active-device rule sidesteps it.
- The cloud's role is sharing and between-game continuity, not real-time co-presence during a game.
- Genuine simultaneous co-driving (two coaches, two devices, one live clock) is explicitly out of scope; adding it later would require real conflict resolution, which is why this is recorded.
