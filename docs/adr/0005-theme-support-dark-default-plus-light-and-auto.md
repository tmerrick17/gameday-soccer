# Theme support: dark default, plus light and auto

## Status

accepted

## Context

The app shipped dark-only (app-wide `bg-gray-950 text-gray-100`, green accent). But the primary use context is a coach on a phone, on a sideline, frequently **outdoors in daylight** — the one condition where a dark UI is hardest to read, because sunlight readability favours a light, high-contrast screen. Dark-only is therefore a real readability risk for the app's most important moment (live game-day mode), not a neutral aesthetic choice.

## Decision

Support **three themes: dark (default/brand), light, and auto**. Auto follows the OS appearance (and, if cheap, time-of-day) so a daytime field game lands on the readable light theme without the coach fiddling mid-game. Dark stays the default and the brand look (the live page palette is the reference). Every page must render correctly in both light and dark; the live game-day console is the priority surface to validate in direct sun.

## Consequences

- A theming layer is now required (CSS variables / Tailwind `dark:` discipline rather than hard-coded `gray-950`), and folding the winning layout prototypes into the real pages must build both themes in from the start — retrofitting light later is more expensive.
- The standing all-viewport responsive rule (`ui-responsive-all-viewports`) now pairs with an all-theme rule: phone + tablet + desktop × light + dark.
- Accepted cost: more styling surface and a small theme-state mechanism, in exchange for sideline readability in daylight — the scenario the product exists for.
