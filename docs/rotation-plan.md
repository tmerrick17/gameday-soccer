# Soccer Rotation Card — U8, 8v8, 2-3-2 + GK

**Roster:** 13 Players · **Game:** two 20-min Halves (40 min) · **On field (Lineup):** 8 (GK + 2 Defender + 3 Mid + 2 Forward) · **Subs:** 5

> This card is the engine's **acceptance test (oracle):** given this Roster, Formation (2-3-2+GK), the equal-time **Blend Strategy**, and a 2×20 Game, the engine should reproduce these minutes and Waves.
>
> **Terminology map:** the short labels below are *pool labels*, not Formation Positions. **K1/K2** = the two keepers (one per Half). **D1–D3** = the Defender pool (3 Players covering 2 back Positions). **F1–F8** = the front line (the Mid + Forward Roles, 5 Positions, rotated as one fast pool).

---

## 1. Assign your 13 Players to Roles (pencil in names)

| Role(s) | Pool labels | How many Players | Notes |
|---------|-------------|------------------|-------|
| **Keeper** | K1, K2 | 2 | One keeps each Half (from the Keeper pool) |
| **Defender** | D1, D2, D3 | 3 | Rotate the 2 back Positions on a long Cadence |
| **Mid + Forward (front line)** | F1–F8 | 8 | 3 Mid + 2 Forward Positions, fast Cadence |

| Pool label | Player name |
|------------|-------------|
| K1 | |
| K2 | |
| D1 | |
| D2 | |
| D3 | |
| F1 | |
| F2 | |
| F3 | |
| F4 | |
| F5 | |
| F6 | |
| F7 | |
| F8 | |

---

## 2. Keepers (by Half)

| | 1st Half (0–20') | 2nd Half (20–40') |
|--|------------------|-------------------|
| **In net** | K1 | K2 |
| **Off-Half keeper** | K2 — rests, ~5 min outfield Cameo | K1 — rests, ~5 min outfield Cameo |

> **Keeper lock:** a keeper plays the *entire* Half in net — no mid-Half goalie sub; keeper changes only at halftime.
> **Cameo (emergent):** keeper minutes count full-value, so after a Half in goal the off-Half keeper re-enters the next-up queue ~20 min ahead of everyone — the queue naturally parks them on the Subs and feeds them in for just one outfield Wave (~5 min) to top them up. The front-line Player they replace takes that Wave as extra rest.

---

## 3. Defenders (long Cadence — rotate at water breaks + halftime)

| Block | I (0–10') | II (10–20') | III (20–30') | IV (30–40') |
|-------|-----------|-------------|--------------|-------------|
| **In Lineup** | D1, D2 | D1, D3 | D2, D3 | D1, D2 |
| **On Subs** | D3 | D2 | D1 | D3 |

**Minutes:** D1 = 30 · D2 = 30 · D3 = 20.
→ The 20-min Player is the **short straw** — rotate which Player draws it every week so it evens out across the season.

---

## 4. Front line — Mid + Forward (short Cadence, rolling single-swap Waves)

Sub at the nearest stoppage near each 5-min mark. **SITS (Subs)** is the 3 resting Players that Segment; **Wave entering** is the single swap that starts the Segment (≤ the max Wave size of 2 — here exactly 1 each).

| Segment | ~Time | SITS (Subs) | Wave entering |
|---------|-------|-------------|---------------|
| 1 | 0–5' | F1, F2, F3 | *(starting Lineup)* |
| 2 | 5–10' | F2, F3, F4 | F4 off → F1 on |
| 3 | 10–15' | F3, F4, F5 | F5 off → F2 on |
| 4 | 15–20' | F4, F5, F6 | F6 off → F3 on |
| — | **HALFTIME** | | |
| 5 | 20–25' | F5, F6, F7 | F7 off → F4 on |
| 6 | 25–30' | F6, F7, F8 | F8 off → F5 on |
| 7 | 30–35' | F7, F8, F1 | F1 off → F6 on |
| 8 | 35–40' | F8, F1, F2 | F2 off → F7 on |

**Every front-line Player plays exactly 25 min** (rests 3 Segments of 5 min). Clean and equal, and **never more than 2 Players change at any stoppage** (this schedule changes exactly 1).

> **Why 1 per Wave, not 2?** With 8 front-line Players, 5 on the field, and 8 Segments, each Player must rest exactly 3 Segments (24 rest-slots ÷ 8). That parity makes a clean all-2-per-Wave schedule impossible — it would force a 3-player swap at the final boundary. A **rolling single-swap** (slide the resting trio by one each Segment) is the tightest plan that both honors the ≤2 Wave cap and keeps everyone dead-even at 25.

**Operating shortcut:** you don't need the grid in your head — run the **next-up queue**. The Player who's rested longest goes on; the Player who's played longest comes off. One in, one out, every ~5 min. The grid is your **fairness check** backstop.

---

## 5. Minutes summary (everyone within ~5–8 min per Game)

| Group | Minutes |
|-------|---------|
| Keepers (K1, K2) | 20 net + ~5 outfield = ~25 |
| Defenders (D1, D2) | 30 |
| Defender (D3 / short straw) | 20 |
| Front line — Mid + Forward (F1–F8) | 25 each |

**Defenders run hot on purpose** (long Cadence) — they touch the ball less, so they earn longer shifts and ~5–8 more minutes. Mids and Forwards play fewer minutes but get more ball touches per minute. **Exact equality is a season-level target**, reached by rotating the short-straw Defender weekly — not a per-Game guarantee (see ADR 0003).

---

## 6. Scoreboard rule (development mode) — **deferred to v2**

- **Default (tied / losing / lead under +5):** everyone plays favored Roles. Run the chart as written.
- **Up by +5 or more:** switch to development mode — Forwards drop back, Defenders push up, least-experienced Players (their **Stretch Role**) get the most attacking minutes.
- **Exit development mode** when the lead drops to **+2 or +3** (hysteresis stops flip-flopping).
- **Only ever change Roles at a stoppage** — never mid-play.

> Not in v1. Captured here so the season rules and Stretch Roles are ready when v2 lands.

---

## 7. Short-roster collapse (when the Squad is below full)

Collapse keys off **Subs available = Squad size − on-field size (8)**, not raw headcount:

| Squad present | Subs | Plan |
|---------------|------|------|
| **13–11** | 5–3 | Run the chart. Waves as designed. |
| **10–9** | 2–1 | Drop the fast Waves. Rotate 1–2 Players through a **Breather** Position every ~6–8 min so nobody's gassed. |
| **8** | 0 | No subs — everyone plays all 40. Keep keeper-per-Half if you can. |

**Always preserve regardless of bodies:** keeper changes at halftime (Keeper lock) + Defenders on a longer Cadence than the front line.

---

## 8. Sideline kit

- Laminate this card + dry-erase marker, **or** a magnet board.
- Write the **front-line next-up queue order** down — do not track 8-year-olds in your head while coaching.
- Call the next Wave ~30 seconds early so Players are ready at the stoppage.

---

## 9. Week-to-week starting rotation (season fairness) — **automation deferred to v2**

Without this, F1–F3 always start on the Subs and the same Player is always the 20-min Defender. ADR 0003 makes the season the true fairness unit, so this is load-bearing — even though its in-app automation waits for v2. Manual ritual for now:

### A. Front line — shift the labels one place each week

Number your **8 front-line Players 1–8** (fixed all season — assign once). Each week, read that week's row to see which **front-line label** each Player takes in the Section 4 grid. The labels slide down by one each week.

| Week | Player #1 | #2 | #3 | #4 | #5 | #6 | #7 | #8 |
|------|----|----|----|----|----|----|----|----|
| 1 | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
| 2 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F1 |
| 3 | F3 | F4 | F5 | F6 | F7 | F8 | F1 | F2 |
| 4 | F4 | F5 | F6 | F7 | F8 | F1 | F2 | F3 |
| 5 | F5 | F6 | F7 | F8 | F1 | F2 | F3 | F4 |
| 6 | F6 | F7 | F8 | F1 | F2 | F3 | F4 | F5 |
| 7 | F7 | F8 | F1 | F2 | F3 | F4 | F5 | F6 |
| 8 | F8 | F1 | F2 | F3 | F4 | F5 | F6 | F7 |

(Week 9 = back to Week 1.) This rotates **who starts on the Subs** (the F1–F3 Players) and **who closes the Game** (the F6–F8 Players) evenly across the season.

### B. Defenders — rotate the 20-min short straw every week

| Week (mod 3) | D1 (30') | D2 (30') | D3 (20' — short straw) |
|--------------|----------|----------|------------------------|
| 1 | Def A | Def B | **Def C** |
| 2 | Def B | Def C | **Def A** |
| 3 | Def C | Def A | **Def B** |

Each Defender draws the short 20-min Game once every 3 weeks.

### C. Keepers — swap Halves each week

| Week | 1st Half net | 2nd Half net |
|------|--------------|--------------|
| Odd | K1 | K2 |
| Even | K2 | K1 |

### Weekly ritual (before each Game)
1. **Front line:** read this week's row, write front-line labels next to names.
2. **Defenders:** move the short straw to the next Player.
3. **Keepers:** swap who takes the first Half.
4. If Players are absent, apply Section 7 collapse rules *after* setting the rotation.
