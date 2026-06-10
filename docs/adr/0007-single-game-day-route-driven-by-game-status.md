# One game-day route driven by Game status, not separate plan/live routes

## Status

accepted

## Context

Game day was split across two routes: `games/[gameId]` (the rotation card / plan view) and `games/[gameId]/live` (the live console). The locked layout decision is **"Live-first + pull-up sheet"** (prototype Variant B): on a phone the route *is* the full-screen live console with the full plan as a pull-up sheet; on tablet/desktop it is two panes (live console + a persistent plan side panel). Keeping two routes fights that decision — the coach would be navigating between URLs mid-game, and "where's the plan vs. where's the clock" becomes a routing question instead of a layout one.

## Decision

Collapse the two routes into a **single `games/[gameId]` route whose view is driven by the Game's status** (`draft`/`planned` → `live` → `completed`):

- **draft / planned** — the rotation card is the primary surface, with a "Start game" call to action.
- **live** — the live console is the primary surface; the full plan is a pull-up sheet (phone) or a persistent side panel (≥ md).
- **completed** — review: plan plus final minutes.

The `games/[gameId]/live` sub-route is removed; the live state is reached by status, not by a distinct URL.

## Consequences

- The plan never competes with the live console for the primary surface — which surface leads is a function of Game status, resolved in one place.
- Accepted cost: one route now owns a small state machine and a responsive two-mode layout (phone sheet vs. desktop side panel), instead of two simpler pages. Deep-linking is to the Game, not to "the live page"; the status determines what renders.
- Implementation merges `games/[gameId]/page.tsx` and `live/page.tsx`; the `?variant=` prototype and its `_prototype/` folder are deleted as part of the fold-in.
- Live game-day is the priority surface for the ADR-0005 theme work — it must stay readable in daylight in both themes.
