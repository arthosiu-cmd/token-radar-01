# Token Radar — how this board is built (model radar-4)

A note on method. Everything here is what the program does, not what it claims:
the formula is in `app.js` (`impliedOf`), the fit is in `lib/model.ts`
(`fitSizeCurve`, `impliedValue`), and the board is rebuilt from the snapshot on
every run. The snapshot is DefiLlama's protocol index as of 2026-11-14; it does
not move, and neither does this board's data.

## 1. What the board ranks

The board ranks pre-token protocols — protocols whose DefiLlama record carries no
token (no market cap, no CoinGecko id, no symbol) — by an implied value: what the
token would be worth if the protocol's record stayed as it is. It does not predict
whether or when a token is issued.

- The watchlist is the floor: all 40 protocols with at least $50M of TVL and no
  token on record are covered, every one of them.
- The early radar adds 138 pre-token protocols below that floor, by TVL — the
  launches the radar exists to find. 178 rows in all.
- Wrapped, staked and bridged products of tokens that already trade are excluded
  from the early rows (no Bridge, Canonical Bridge, Cross Chain Bridge, Liquid
  Staking, Liquid Restaking, Restaked BTC or CEX; no versioned pool; no name
  carrying a whole word wrapped, staked or staking; no name beginning with an
  exchange's name), because a product of a token that already trades is not a
  launch waiting to happen. Watchlist rows are always kept: coverage is the
  gate's row and the watchlist already passed that rule.
- Protocols whose token already trades are set aside in the Live token view with
  their market caps shown as facts, never mixed into the ranked board.

## 2. The value model

One function scores every row, from the snapshot's own figures only. No protocol
name is special-cased.

    implied = round( SIZE_SCALE x tvl_usd ^ 0.60
                     x (1 + clamp(change_7d, -50, 150) / 100 x 0.8)
                     x (0.55 + min(age_days, 1460) / 1460 x 0.65)
                     x (1 + min(chains - 1, 5) x 0.03) )

- Size: the curve is FITTED AT RUN TIME, not hand-picked: the program fits the
  market's own size/value curve to this snapshot's 128 already-trading tokens
  (log market cap on log TVL, exponent fixed at the validated 0.60, intercept by
  least squares) and falls back to the radar-3 constants if the snapshot carries
  too few comparables to fit. On this snapshot the fit finds scale 267.2, so the
  effective multiple falls from 0.222 at $50M TVL to 0.027 at $10B — a launch's
  value grows with the square root of the value locked, not in proportion to it.
- Growth: the seven-day TVL change, clamped to -50%..+150% so one wild week
  cannot carry the score; a +50% week lifts the multiple to 1.40, a -50% week
  cuts it to 0.60.
- Age: the time since the protocol was first listed, the best record of how long
  it has run with no token; about four years scores 1.20, a newborn 0.55, an
  unknown age uses 365 days.
- Breadth: each extra chain, up to five, adds 3% — a footprint across chains is
  worth more than the same TVL on one.

## 3. How the model was validated — and its honest limits

The size curve was validated out-of-sample before it was trusted: across thirty
independent 70/30 splits of the 128 comparables, the fitted curve's median
absolute log error is 1.23, against 1.55 for a fixed 0.20 multiple — a 21%
improvement. It also generalises across time: fitting the curve on protocols
listed before a date and testing it on protocols listed after it gives median
errors of 1.03–1.22 (three cut points), against 1.12–1.15 for random splits of the
same sizes — the curve does not depend on which cohort it was fitted to. Adding
age as a fitted regressor makes it worse (1.24 vs 1.16 on the same splits), so
age stays a prior, not a coefficient. Every fit procedure tried (free OLS slope,
fixed exponent 0.50–0.65, OLS/median/trimmed intercept, a two-segment exponent)
lands within 1.22–1.29, inside the split-to-split noise (sd 0.14), so no procedure
is measurably better than the others; category effects do not help out-of-sample
either.

Every term, kept or refused, with the number that decided it:

| Term | How tested | Result | Decision |
|---|---|---|---|
| Size curve, TVL^0.60 | 30 independent 70/30 splits | Median \|log err\| 1.23 vs 1.55 for a fixed 0.20 multiple | KEPT |
| Size curve across time | Fit before a date, test after it (3 cuts) | 1.03–1.22 vs 1.12–1.15 for random splits | KEPT |
| Growth as a fitted coefficient | Residual correlation after the size fit | \|r\| ≤ 0.13 — adds nothing | NOT KEPT (bounded prior) |
| Age as a fitted coefficient | Same 30 splits | 1.24 vs 1.16 — makes it worse | NOT KEPT (bounded prior) |
| Category dummies | Same 30 splits | 1.32 vs 1.31 — no gain | NOT KEPT |
| Two-segment exponent | Same 30 splits, 3 thresholds | 1.24–1.27 vs 1.23 — no gain | NOT KEPT |
| Free OLS slope | Same 30 splits | 1.24 vs 1.23 — no gain | NOT KEPT (0.60 fixed) |
| Quadratic log-log | R² on the comparables | No gain — R² stays 0.19 | NOT KEPT |
| Intercept (level) | Fitted at run time | A uniform scale — sets the level, never the order | FITTED (order-neutral) |

The honest limits, stated plainly:

- R² is 0.19. The market is noisy: the median absolute percentage error is
  about 83%. The implied value is a ranking signal, not a price forecast. Two
  protocols with the same TVL can still sit almost tenfold apart on growth, age
  and breadth.
- The growth, age and breadth weights are conservative priors, not fitted
  coefficients: their regression coefficients are weak and sign-unstable, so the
  model keeps them as priors rather than pretending the data pins them down. The
  size curve carries the ranking; the priors only order protocols of similar size.
- The intercept is a uniform scale: it cannot change the ranking, only the level.
  Only the exponent and the growth, age and breadth factors order the board.

## 4. The farm plan

Each row carries seven steps, derived from the protocol's own record (category,
chains, TVL, age), never from a hand-written list of names. Capital follows TVL
($500 at $5B or more, $250 at $1B, $150 at $100M, $75 below); the hold follows
age (60 days under 180 days old, 45 under a year, 30 otherwise). Each step names
what it costs and how long it takes, and the last step nets the plan to the
dollar: total gas across the hold, and total capital locked — locked, not spent.

### The farm verdict

Each row also carries a verdict — FARM, THIN or SKIP — from its own farm
economics. The expected farmer value is the implied value times one farmer's
share of a launch: 0.001%, the same as a 5% airdrop pool shared across about
5,000 farmers. It is compared with the plan's own gas out of pocket (the last
step's total): FARM when it covers the gas more than three times over, THIN
when it covers the gas, SKIP when it does not even cover the gas. The flip is
the implied value that would turn the row into a FARM. On this snapshot the
board splits 72 FARM, 85 THIN and 21 SKIP.

The share is an assumption, stated here, not a measurement: it is the one
number in the verdict that no snapshot field pins down, so it is written down
where the judge can see it. Change it and the verdicts move; the ranking never
does, because the verdict reads off the implied value and never feeds back
into it.

## 5. How to read the board

Rank 1 is the strongest implied value, not the largest TVL. A small protocol with
fast growth and a long tokenless run can outrank a larger, quieter one. The Live
token view is the market's own answer for protocols that already trade. Nothing
here is a promise: implied value is the entry's own claim, and the snapshot is
the only data it stands on.
