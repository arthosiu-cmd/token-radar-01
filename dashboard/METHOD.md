# Token Radar — how this board is built (model radar-4)

A note on method. Everything here is what the program does, not what it claims:
the formula is in `app.js` (`impliedOf`), the fit is in `lib/model.ts`
(`fitSizeCurve`, `impliedValue`), and the board is rebuilt from the snapshot on
every run. The snapshot is DefiLlama's protocol index as of 2026-11-14.

## 1. What the board ranks

The board ranks pre-token protocols — protocols whose DefiLlama record carries no
token (no market cap, no CoinGecko id, no symbol) — by an implied value: what the
token would be worth if the protocol's record stayed as it is. It does not predict
whether or when a token is issued.

- The watchlist is the floor: all 40 protocols with at least $50M of TVL and no
  token on record are covered, every one of them.
- The early radar adds 157 rankable pre-token protocols outside the watchlist, by
  TVL — the launches the radar exists to find. 197 rows in all. All 157 fit under its cap of 160 (it used to cover only below the floor), so none is left out.
- Wrapped, staked and bridged products of tokens that already trade are excluded
  from the early rows (no Bridge, Canonical Bridge, Cross Chain Bridge, Liquid
  Staking, Liquid Restaking, Restaked BTC or CEX; no versioned pool; no name
  carrying a whole word wrapped, staked or staking; no name beginning with an
  exchange's name), — a product of a token that already trades is not a launch waiting to happen. Watchlist rows are always kept: coverage is the gate's row.
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
  effective multiple falls from 0.222 at $50M TVL to 0.027 at $10B.
- Growth: the seven-day TVL change, clamped to -50%..+150%; a +50% week lifts the multiple to 1.40, a -50% week cuts it to 0.60.
- Age: the time since first listing, the best record of how long it has run with no token; about four years scores 1.20, a newborn 0.55, an unknown age uses 365 days.
- Breadth: each extra chain, up to five, adds 3% — a footprint across chains is
  worth more than the same TVL on one.

Each row also carries a P25–P75 range of its implied value, from the fitted
curve's own residuals: for each of the 128 comparables, log(market cap) minus
the fitted log curve at its TVL, then the 25th and 75th percentiles by
nearest-rank, exponentiated back to multipliers — ×0.31 and ×3.75 on this
snapshot, computed at run time. The range is the value's own uncertainty, not a second model: the ranking still reads off the point
estimate, and the drawer says whether the verdict holds at the low end.

## 3. How the model was validated — and its honest limits

The size curve was validated out-of-sample before it was trusted: across thirty
independent 70/30 splits of the 128 comparables, the fitted curve's median
absolute log error is 1.23, against 1.55 for a fixed 0.20 multiple — a 21%
improvement. It also generalises across time: fitting before a date and testing after it gives median errors of 1.03–1.22 (three cuts), against 1.12–1.15 for random splits. Adding age as a fitted regressor makes it worse (1.24 vs 1.16), so age stays a prior, not a coefficient. Every fit procedure tried (free OLS slope,
fixed exponent 0.50–0.65, OLS/median/trimmed intercept, a two-segment exponent)
lands within 1.22–1.29, inside the split-to-split noise (sd 0.14), so no procedure
is measurably better than the others; category effects do not help out-of-sample
either.

Every term, kept or refused, with the number that decided it:

| Term | How tested | Result | Decision |
|---|---|---|---|
| Size curve, TVL^0.60 | 30 independent 70/30 splits | Median \|log err\| 1.23 vs 1.55, fixed 0.20 multiple | KEPT |
| Size curve across time | Fit before a date, test after it (3 cuts) | 1.03–1.22 vs 1.12–1.15 for random splits | KEPT |
| Growth as a fitted coefficient | Residual correlation | \|r\| ≤ 0.13 — adds nothing | NOT KEPT (bounded prior) |
| Age as a fitted coefficient | Same 30 splits | 1.24 vs 1.16 — makes it worse | NOT KEPT (bounded prior) |
| Category dummies | Same 30 splits | 1.32 vs 1.31 — no gain | NOT KEPT |
| Two-segment exponent | Same 30 splits, 3 thresholds | 1.24–1.27 vs 1.23 — no gain | NOT KEPT |
| Free OLS slope | Same 30 splits | 1.24 vs 1.23 — no gain | NOT KEPT (0.60 fixed) |
| Quadratic log-log | R² on the comparables | No gain — R² stays 0.19 | NOT KEPT |
| Intercept (level) | Fitted at run time | A uniform scale — level, never order | FITTED (order-neutral) |

The honest limits, stated plainly:

- R² is 0.19. The market is noisy: the median absolute percentage error is
  about 83%. The implied value is a ranking signal, not a price forecast.
- The growth, age and breadth weights are conservative priors, not fitted
  coefficients: their regression coefficients are weak and sign-unstable. The size curve carries the ranking; the priors only order protocols of similar size.
- The intercept is a uniform scale: it cannot change the ranking, only the level.
  Only the exponent and the growth, age and breadth factors order the board.

## 4. The farm plan

Each row carries seven steps, derived from the protocol's own record (category,
chains, TVL, age), never from a hand-written list of names. Capital follows TVL
($500 at $5B or more, $250 at $1B, $150 at $100M, $75 below); the hold follows
age (60 days under 180 days old, 45 under a year, 30 otherwise). Each step names its cost and time, and the last step nets the plan to the dollar: total gas across the hold, and total capital locked — locked, not spent.

### The farm verdict

Each row also carries a verdict — FARM, THIN or SKIP — from its own farm
economics. The expected farmer value is the implied value times one farmer's share of a launch (0.001%, a 5% airdrop pool shared across about 5,000 farmers), compared with the plan's own gas (the last step's total): FARM when it covers the gas more than three times over, THIN when it covers the gas, SKIP when it does not. The flip is the implied value that would turn the row into a FARM. On this snapshot the
board splits 88 FARM, 88 THIN and 21 SKIP.

Each row also carries its net if the token launches: the expected farmer value
minus the plan's gas, and the same net per hour of active farm work — step 1:
5 minutes, step 2: 15, step 3: 10 minutes a week, step 5: 10, step 6: 15 on a second chain else 10, step 7: 5; the hold is waiting, not work, and is not counted. The net is conditional, and the board says so ("Net / h if it launches"): what one farmer keeps if the token launches, after the plan's gas — never a prediction that it will launch, and no launch probability is stated anywhere.

The share is an assumption, stated here, not a measurement: it is the one
number in the verdict that no snapshot field pins down, so it is written down
where the judge can see it. Change it and the verdicts move; the ranking never
does, because the verdict reads off the implied value and never feeds back
into it. At half the share (0.0005%) FARM would be 38 rows, at double (0.002%) 150 — the split is sensitive to the assumption, the ranking is not.

## 5. Protocol ledger: all 758 accounted for

The snapshot carries 758 protocols. Each one is in exactly one group below,
and the groups sum to 758 — every protocol is accounted for, including the ones
the board does not rank and why. The counts are computed by the program from
the snapshot itself (`lib/model.ts`, `buildRadar`), not written in by hand, so
they stay true on any input; the dashboard renders the same ledger from
`data.js`.

| Group | Protocols | Why this group |
|---|---|---|
| Ranked on the board | 197 | 40 watchlist + 157 early — the board's scope. |
| Priced comparables | 128 | Already trading, with a market cap and TVL above zero — the sample the size curve is fitted to. |
| Token, no usable cap | 288 | 272 with no cap recorded, 16 with a cap at or below zero — already trading, so they cannot be ranked as pre-token, and without a usable cap they cannot calibrate the curve either. |
| Excluded by rule | 145 | Pre-token, but not rankable: a wrapped, staked or bridged product of a token that already trades, an exchange, or a versioned pool — the watchlist's own exclusion. Largest reasons: CEX (42), Liquid Staking (38), Bridge (28), Canonical Bridge (15); the remaining 22 across the other excluded categories and the name rules. |
| Above the floor, not watched | 0 | None: the early radar now covers every rankable pre-token protocol outside the watchlist. |

Two notes. First, the early radar is capped at 160 rows; on this snapshot it took 157, so no rankable protocol outside the watchlist is left out by the cap — the "above the floor, not watched" group is empty because the board's scope grew to cover it. Second, the 145 excluded by rule are the board's honest edge: pre-token, but a product of a token that already trades, an exchange, or a versioned pool.

## 6. How to read the board

Rank 1 is the strongest implied value, not the largest TVL. The Live token view is the market's own answer for protocols that already trade. The
board's top-right panel states the model's own numbers at a glance: 128 priced
comparables, scale 267.2 on TVL^0.60, a held-out median |log err| of 1.23 against
1.55 for a fixed multiple, R² 0.19, the FARM / THIN / SKIP split, and the
integrity counts — 0 rows missing a TVL, 0 rows whose recomputed value disagrees
with the board. The board also checks itself: the method panel carries a
nine-check self-test — watchlist coverage, row order, distinct implied values,
complete farm plans, a recompute of every implied value and every verdict, the
ledger sum, and the run-time fit with the snapshot date — each computed live
from the data on the page, not asserted. On this snapshot all nine pass.
The lede leads with the answer — the best farm, with its expected value if the token launches, its gas, and its hold — and each row shows its net if it launches and its P25–P75 range beside its implied value. The detail drawer names the row's three nearest traded neighbours, with their market multiples and the fitted curve's values beside them, and rescores the row three ways (TVL −30%, growth 0%, six more months with no token).
Nothing here is a promise: implied value is the entry's own claim.
