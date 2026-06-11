# Fold-in issues — promote prototype variants into real pages

Drafted from the grill-with-docs outcome (commit `1a42460`). Decisions are locked
in `CONTEXT.md` + ADRs 0005–0007; the `?variant=` prototypes are throwaway and get
deleted as each fold-in lands. Paste these into `to-issues` (or file directly).

**Dependency order:** #1 (theme) first — it's cross-cutting. #2–#4 build on it and
are otherwise independent. #3 and #4 are the heavier two (data-model / route merge).

---

## Issue 1 — Theme layer: dark default + light + auto (ADR-0005)

**Why:** App shipped dark-only, but it's used on a phone on the sideline, often in
daylight — the worst case for dark UI. ADR-0005 requires dark (default/brand) +
light + auto (follows OS / time-of-day). This is the foundation the page fold-ins
build on, so it lands first.

**Scope**
- Introduce a theme mechanism: CSS variables / Tailwind `dark:` discipline instead
  of hard-coded `bg-gray-950` etc.; a theme state (dark | light | auto) persisted
  per device; `auto` follows OS appearance.
- Convert the existing app-wide dark styling to theme tokens so both themes render.
- Provide a theme toggle entry point (placement TBD — likely team-home setup area).

**Acceptance criteria**
- Every production page renders correctly in light and dark; `auto` follows the OS.
- The **live game-day console is verified readable in direct daylight** in both
  themes (ADR-0005 priority surface).
- No hard-coded `gray-950`/`gray-100` colors remain on converted pages; `tsc` passes.

**Depends on:** nothing. **Blocks:** #2, #3, #4.

---

## Issue 2 — Team-home: fold in "Game-forward" layout (Variant A)

**Why:** Locked decision — the team home foregrounds the focus game (live → resume /
planned → rotation-card preview / none → New game), setup demoted to a pill row.
Aligns with the sideline-on-a-phone JTBD. See
`app/teams/[teamId]/_prototype/NOTES.md`.

**Scope**
- Fold `_prototype/VariantA` into `app/teams/[teamId]/page.tsx`; wire the real
  focus game (fetch via `listGames`, drive with `pickFocusGame`).
- Responsive: phone = single column (hero on top, setup pills below); ≥ md = two
  columns (hero main width, setup as quiet right-hand menu). Safe-area insets.
- Delete `app/teams/[teamId]/_prototype/` and the `?variant=` guard block in
  `page.tsx`.

**Acceptance criteria**
- Team home shows the correct hero for each focus-game state (none/planned/live)
  from real data; setup links reachable; both themes; all viewports.
- No `_prototype/` folder or `?variant=` code remains for this route.

**Depends on:** #1.

---

## Issue 3 — Roster: archive-only + Player status model (Variant A, ADR-0006)

**Why:** Locked decision — no hard delete; archive is reversible and retains the
Player's stable id + season history (`CONTEXT.md` "Archived"). ADR-0006: `status`
lives in the persistence layer, not the engine `Player`. See
`app/teams/[teamId]/roster/_prototype/NOTES.md`.

**Scope**
- Add `status: 'active' | 'archived'` to the **Firestore roster record** (not the
  engine `Player` type). Filter archived Players out before the Roster reaches the
  engine and before attendance/Squad selection.
- Replace the current `deletePlayer` hard-delete with an archive flow; collapsed
  "Archived" section with Restore. Keep hard-delete **only** for a Player with zero
  Game references ("safe to hard-delete").
- Fold `_prototype/VariantA` into the roster `page.tsx` (dark→themed per #1); delete
  `_prototype/` + the `?variant=` guard.

**Acceptance criteria**
- Archiving removes a Player from the active Roster + attendance but keeps id +
  season history; Restore brings them back; past Games still resolve their ids.
- Engine `Player` type unchanged (identity-only); archived Players never reach the
  engine. Hard-delete only offered when zero Game references. `tsc` passes.
- No `_prototype/` folder or `?variant=` code remains for this route.

**Depends on:** #1. (Data-model heavy — size accordingly.)

---

## Issue 4 — Game-day: merge plan + live into one status-driven route (Variant B, ADR-0007)

**Why:** Locked decision — "Live-first + pull-up sheet." ADR-0007: collapse
`games/[gameId]` (plan card) and `games/[gameId]/live` into one route driven by Game
status. See `app/teams/[teamId]/games/[gameId]/_prototype/NOTES.md`.

**Scope**
- Merge `games/[gameId]/page.tsx` + `live/page.tsx` into a single route with a
  status machine: draft/planned → rotation card + "Start game"; live → live console
  (plan = pull-up sheet on phone, persistent side panel ≥ md); completed → review.
- Remove the `games/[gameId]/live` sub-route.
- iPhone/iPad: dark fills the entire viewport (fixed backdrop), safe-area insets,
  no white overscroll. Themed per #1.
- Delete the game-day `_prototype/` + `?variant=` guard.

**Acceptance criteria**
- One route renders the correct surface per Game status; no separate `/live` URL.
- Phone = live console + pull-up plan sheet; ≥ md = console + persistent plan panel.
- Live console readable in daylight in both themes; `tsc` passes.
- No `_prototype/` folder or `?variant=` code remains for this route.

**Depends on:** #1. (Route/state-machine heavy — size accordingly.)
