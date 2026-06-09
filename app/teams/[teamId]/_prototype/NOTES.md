# Prototype — Team-home layout (handoff tension #1)

**Question:** What should the Team-home page (`/teams/[teamId]`) look like? The
sideline-on-a-phone JTBD ("run today's game") vs. neutral simplicity.

**Shape:** UI prototype, sub-shape A — variants mounted on the real route behind
`?variant=`, real team/members, mocked focus-game via `?state=` so all three
game states (none / planned / live) are comparable.

## How to view

`npm run dev`, then open a team and append the params:

- `/teams/<teamId>?variant=A&state=live`
- Flip variant with the **← / →** keys or the indigo bar; flip game state with the **game:** toggle.

## Variants

- **A — Game-forward:** the focus game is the hero (live → big red resume card;
  planned → rotation-card preview; none → big "New game"). Setup demotes to a pill row.
- **B — Link-hub:** equal-weight 2-col tile launcher + invite + coaches. Neutral,
  no opinion. Focus game is only a small badge on the New-game tile. (~current page.)
- **C — Two-mode split:** dark loud "Game Day" zone on top (thumb targets), quiet
  "Setup" list below. The JTBD split made spatial.

## Verdict

**Variant A — Game-forward wins** (user, 2026-06-08): "it just feels right."
Foreground the focus game (live → resume / planned → plan card / none → New game),
demote setup to a pill row. Aligns with the sideline-on-a-phone JTBD.

Responsive: phone = single column (hero on top, setup pills below); tablet/desktop
(>= md) = two columns (hero takes main width, setup is a quiet right-hand menu).
Safe-area insets respected. (Standing rule: build all UI for every viewport.)

TODO when prototyping wraps: delete `_prototype/` + the `?variant=` block in
`page.tsx`, fold VariantA into `page.tsx`, and wire the real focus-game (fetch
games via `listGames`, drive with `pickFocusGame`).
