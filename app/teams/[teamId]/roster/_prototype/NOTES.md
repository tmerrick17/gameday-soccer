# Prototype — Roster removal (handoff tension #2)

**Question:** The roster page currently **hard-deletes** a Player, but CONTEXT.md
says a Player has "a stable internal id that is never reused" and departure
happens at the **Squad** level (per-game attendance), not the Roster. Should the
Roster support **archive/deactivate** instead of (or alongside) delete?

**Shape:** UI prototype, sub-shape A — variants on the real `/teams/[teamId]/roster`
route behind `?variant=`, on mock players (in-memory; actions mutate local state
only, no Firestore). No `confirm()` dialogs (they block automation).

## How to view

`npm run dev` → `/teams/<teamId>/roster?variant=A` · cycle with ← / → or the bar.
Responsive: phone = single column, tablet/desktop = 2-col grid (all-viewport rule).

## Variants (spectrum from "never destroy" to "delete when safe")

- **A — Archive only:** no hard delete at all. Archive → collapsed Archived
  section, keeps id + history, Restore any time. Most glossary-aligned.
- **B — Smart delete/archive:** Delete is offered **only** for players who never
  played (`gamesPlayed === 0`, no Game references their id). Anyone with history
  can only be Archived. Lets you remove accidental/duplicate entries without
  violating id-reuse.
- **C — Status only, never remove:** the roster is the season list; nobody is
  removed here. Inline Active / Injured / Departed status per player; exclusion
  from a game happens later in the Squad. Most literal reading of the glossary.

## Decision inputs / open domain questions (→ grill-me-with-docs)

- Does the real `Player` type gain a season-level `status` / `archived` field?
  (It currently has none — identity is just `id`.) A & C both imply adding one.
- Is "Departed" a Roster concept (season-level) or only a Squad concept
  (per-game)? C blurs this deliberately — needs a glossary ruling.
- If B: define "safe to delete" precisely (no Game references) and where that
  check lives.

## Verdict

**Variant A — Archive only wins** (user, 2026-06-08). No hard delete; archive is
reversible and retains id + history. Rendered in **dark mode** (`bg-gray-950`,
matching the live console) at the user's request — note this diverges from the
current *light* roster page, so the fold-in is also a theme decision (is the
roster page going dark, or just this surface? flag at grill / ADR time).

Fold-in: replace `deletePlayer` hard-delete with an archive flow; add a
season-level `status`/`archived` field to `Player` + Firestore; exclude archived
players from attendance/Squad. Confirm the data-model + "Departed vs archived"
ruling in the grill-me-with-docs pass before implementing.
