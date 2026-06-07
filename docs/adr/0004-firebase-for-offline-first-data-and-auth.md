# Firebase (Firestore + Auth) for offline-first data and accounts

## Status

accepted

## Context

ADR 0002 requires the full game to run offline on-device, with reads *and writes* (attendance, overrides, re-solves, minute tracking) queued and synced on reconnect. ADR 0002 also chose single-active-device + last-write-wins, which means no CRDT / multi-writer merge is needed. The app also needs accounts and invite-only multi-coach sharing (CONTEXT.md), is a solo-built PWA on Next.js, and should be low-ops and cheap at small scale. The convenient reactive backends already in the toolkit — Convex and Supabase — are not offline-first for writes; using them would mean bolting a custom local write-queue onto tools that don't want one.

## Decision

Use **Firebase**: **Cloud Firestore** for data and **Firebase Auth** for accounts. Firestore's built-in offline persistence queues reads and writes with no signal and syncs on reconnect — exactly the ADR 0002 behavior — and its default last-write-wins conflict model matches ADR 0002's decision, so no merge logic is written. Team data (roster, preferences, games, season history) is stored document-shaped; Team sharing is a membership document keyed to invited Users. The Firebase client SDK runs inside the Next.js PWA (deployed on Netlify); no sync server is operated.

## Consequences

- The hard offline requirement is satisfied out of the box, for free at this scale, with minimal ops.
- Accepted trade-offs: NoSQL document modeling (not Postgres/SQL) and Google lock-in; the TS DX is less elegant than Convex.
- Convex and Supabase were rejected specifically because offline *writes* for the length of a game are not their strength — recorded so the choice isn't re-litigated.
- The rejected SQL/local-first alternative was PowerSync (local SQLite) + Supabase (Postgres); revisit it only if SQL or reduced lock-in becomes a hard need.
- The deterministic engine stays a pure client-side TS package independent of Firebase, so the data layer could be swapped without touching rotation logic.
