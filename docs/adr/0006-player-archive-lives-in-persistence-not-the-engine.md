# Player archive lives in persistence, not the engine model

## Status

accepted

## Context

The Roster supports **Archive only** — no hard delete; archiving a Player is reversible and retains the Player's stable id and season history (see CONTEXT.md "Archived"). That needs a season-level `status` ('active' | 'archived'). The obvious place is the engine `Player` type (`lib/engine/types.ts`), but that type is a *pure rotation input*, and ADR-0004 deliberately keeps "the deterministic engine a pure client-side TS package independent of Firebase." Putting an archive flag on it would make every engine code path responsible for filtering a Player who should never reach the engine at all.

## Decision

Model `status: 'active' | 'archived'` on the **persistence-layer roster record** (the Firestore roster entry), not on the engine `Player`. Archived Players are filtered out when assembling the Roster, **before** it is handed to the engine. The engine `Player` stays identity-only and never sees an archived Player. Hard-delete remains permitted only for a Player with zero Game references (CONTEXT.md "Archived").

## Consequences

- The engine cannot accidentally rotate an archived Player — the case is structurally impossible, not guarded by a flag the engine must remember to check.
- The boundary ADR-0004 drew (engine independent of the data layer) is preserved; the data layer could still be swapped without touching rotation logic.
- Accepted cost: archive state lives one layer out from the Player it describes, so UI/persistence code (not the engine) owns the active/archived filter and the restore path.
- Past Games keep resolving their `playerId`s and season totals stay honest, because the id and history are never deleted — only filtered from the active Roster.
