# Prototype — Game-day flow (handoff tension #5)

**Question:** Should the rotation card (plan view) and live mode be **one page in
two states**, or stay **separate routes** (`games/[gameId]` ↔ `games/[gameId]/live`)?
Driver: the phone-on-sideline flow.

**Shape:** UI prototype, sub-shape A — variants mounted on the real
`games/[gameId]` route behind `?variant=`, on self-contained mock game data
(no Firestore game needed — works with any gameId). `?phase=` toggles the mocked
live moment between `playing` and `sub-due` (to see the SUB NOW treatment).

## How to view

`npm run dev`, open any game URL and append params (gameId can be anything):

- `/teams/<teamId>/games/<anything>?variant=A&phase=sub-due`
- **← / →** keys or the indigo bar cycle variants; the **phase:** toggle flips playing / sub-due.

## Variants (all three are "one page" answers — baseline = current separate routes)

- **A — Tabbed:** one route, a *persistent* dark clock bar on top, Plan / Live
  tabs swap the body. Clock never disappears; plan is one tap away. Explicit modes.
- **B — Live-first + sheet:** the route *is* the full-screen dark live console;
  the full plan is a pull-up bottom sheet. Strongest sideline bias — plan never
  competes for the primary surface.
- **C — Single scroll, no modes:** live "now" (clock + SUB NOW + on-field) pinned
  at top; the full plan grid/subs/minutes continue in the *same scroll* below.
  No tabs, no sheet — scroll from "right now" into "what's coming".

Baseline to judge against: today's **separate routes** (plan card with a "Start
live" CTA → distinct dark live page). Still navigable normally (no `?variant=`).

## Verdict

**Leaning Variant B — Live-first + pull-up sheet** (user, 2026-06-08): the live
console is the route; the full plan is a pull-up bottom sheet.

Requirements captured during iteration:
- **iPhone / iPad target.** Dark must fill the *entire* viewport (fixed backdrop),
  not just the centered `max-w-md` column — no white iPad gutters, no white iOS
  overscroll flash. Safe-area insets (notch / Dynamic Island / home indicator /
  landscape ears) respected via `env(safe-area-inset-*)`. Root layout already
  sets `viewport-fit=cover`.
- **Tablet/desktop (>= md):** resolved — two panes: dark live console on the
  left, full plan as a *persistent* light side panel on the right (no sheet).
  Phone (< md) keeps the live-first console + pull-up sheet.

Fold-in is non-trivial: merges `games/[gameId]/page.tsx` + `live/page.tsx` into
one route/state machine. **Write an ADR before implementing.**
