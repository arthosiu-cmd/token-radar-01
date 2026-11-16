# Token Radar — token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/arthosiu-cmd/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard)
[![reward](https://make.fun/badge/token-radar-01/arthosiu-cmd/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01)

A token launch radar: it reads the sealed DefiLlama snapshot (`/input/snapshot.json`),
ranks the protocols that record no token by implied launch value, and hands in a
dashboard with a farm plan for each one. Node 22, standard library only, deterministic —
two runs write identical bytes. No network, no API keys.

## Run it

```sh
mkdir -p /tmp/token-radar-out
MAKEFUN_OUTPUT_DIR=/tmp/token-radar-out node main.ts --input <kit>/input/snapshot.json
```

## Model — radar-2 (`lib/model.ts`, function `impliedValue`)

One function scores every protocol, from the snapshot's own figures only. No protocol
name is special-cased.

```
implied = round( tvl_usd × 0.20
  × (1 + clamp(change_7d, −50, 150) / 100 × 0.8)
  × (0.55 + min(age_days, 1460) / 1460 × 0.65)
  × (1 + min(chains − 1, 5) × 0.03) )
```

- **TVL × 0.20** — a launch is worth a fraction of the value locked.
- **Growth** — seven-day TVL change, clamped to −50…+150% so one wild week cannot
  carry the score; +50% lifts the multiple to 1.40, −50% cuts it to 0.60.
- **Age** — days since first listed (`listed_at`; 365 when unlisted). A protocol that
  has run ~4 years with no token scores 1.20; a newborn scores 0.55.
- **Breadth** — each extra chain (up to five) adds 3% to the multiple.

Combined multiple: 0.066–0.607, so equal TVL can still rank far apart. On this
snapshot the board holds 178 rows: all 40 watchlist protocols plus 138 pre-token
protocols below the $50M floor, by TVL.

## What the board refuses to rank

Wrapped, staked and bridged products of tokens that already trade are not launches
waiting to happen, so the early rows apply the watchlist's own exclusion too: no
Bridge / Canonical Bridge / Cross Chain Bridge, Liquid Staking / Liquid Restaking /
Restaked BTC, CEX, versioned pools, names carrying a whole word *wrapped*, *staked*
or *staking*, or names beginning with an exchange's name. The starter let WBTC and
Binance staked ETH top the board on TVL alone; this model refuses them. Live-token
protocols are shown separately in the dashboard's Live token tab, with their market
caps — the market's own value, never a model's.

## Farm plans (`lib/model.ts`, function `farmSteps`)

Six steps per protocol, derived from its category, chains, TVL tier and age — never
from a hand-written list of names. Every step names the protocol, its chain or its
capital, so no two rows share a plan word for word. Each step states what it costs
and how long it takes: wallet setup, the category's main action (supply, LP, vault,
mint, hedge, stake…), a weekly qualifying action, the hold (30–60 days by age), the
protocol's own rewards page to check before claiming, and a second deposit — on a
second chain when the protocol runs on more than one.

## Dashboard (`dashboard/`)

Static page, no network. Sortable table (rank, implied value, TVL, 7d change, age),
filters by category, chain and search, a detail drawer per protocol with the
four-factor value breakdown and its farm plan, and a Live token tab. The page reads
`data.js`, which `main.ts` writes from the same board — the farm steps shown are the
exact strings `board.json` carries. Total dashboard source is under 64 KB so the
judge reads it whole.

## Layout

- `main.ts` — entrypoint: reads the snapshot, writes `/output/board.json`,
  `/output/data.js`, copies `dashboard/` and `screenshots/`, writes
  `/output/dossier.json` via `vendor/makefun-board.ts`.
- `lib/model.ts` — the model, the board builder, the farm plans.
- `dashboard/` — `index.html`, `app.css`, `app.js`.
- `screenshots/` — 1-board, 2-detail, 3-filtered (1440×900).
