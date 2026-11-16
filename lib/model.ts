// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds
// pre-token protocols below the watchlist floor: the early rows the radar exists to find. A protocol
// is pre-token when its index entry records no token (no market cap, no CoinGecko id, no symbol).
// The snapshot's live-token protocols are kept apart and shown as the market's own values, never
// mixed into the ranked board.
//
// A wrapped, staked or bridged product of a token that already trades is not a launch waiting to
// happen, so the early radar applies the watchlist's own exclusion to its extra rows too: no
// Bridge / Canonical Bridge / Cross Chain Bridge, no Liquid Staking / Liquid Restaking /
// Restaked BTC, no CEX, no versioned pool (a name ending in V2, v2, 2.0 or the like), no name
// carrying a whole word wrapped, staked or staking, and no name beginning with an exchange's
// name. The starter let WBTC and Binance staked ETH top the board on TVL alone; this model
// refuses them. Watchlist rows are always kept, whatever their category, because coverage is
// the gate's row and the watchlist already passed that rule.
//
// Implied value follows only from the snapshot's own figures, in four visible factors:
//
//   base        = tvl_usd x BASE_MULTIPLE                     (0.20: a launch is worth a
//                                                              fraction of the value locked)
//   growth      = clamp(change_7d, -50, 150) per cent         (one wild week cannot carry
//                                                              the score: the cap bites at
//                                                              +150% and the floor at -50%)
//   growthMult  = 1 + (growth / 100) x GROWTH_WEIGHT          (0.8: +50% in a week lifts
//                                                              the multiple to 1.40, -50%
//                                                              cuts it to 0.60)
//   ageMult     = 0.55 + min(age_days, 1460) / 1460 x 0.65    (age_days from listed_at;
//                                                              a protocol that has run
//                                                              ~4 years with no token
//                                                              scores 1.20, a newborn
//                                                              0.55; unknown age uses 365)
//   breadthMult = 1 + 0.03 x min(max(chains - 1, 0), 5)       (each extra chain, up to
//                                                              five, adds 3%: a footprint
//                                                              across chains is worth more
//                                                              than the same TVL on one)
//   implied     = max(1, round(base x growthMult x ageMult x breadthMult))
//
// The combined multiple runs from 0.20 x 0.60 x 0.55 x 1.00 = 0.066 to
// 0.20 x 2.20 x 1.20 x 1.15 = 0.607, so two protocols with the same TVL can sit almost
// tenfold apart on growth, age and breadth alone. No protocol name is ever special-cased:
// the same function scores every row, and the dashboard states the formula in full.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max_extra_chains: number;
}

export const MODEL: ModelConstants = {
  base_multiple: 0.2,
  growth_weight: 0.8,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.55,
  maturity_range: 0.65,
  maturity_days: 1460,
  unknown_age_days: 365,
  breadth_per_chain: 0.03,
  breadth_max_extra_chains: 5,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with the farm plan exactly as board.json carries it. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

/** A whole day count from `listedAt` to `asOf`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const asOfMs = Date.parse(`${asOf}T00:00:00Z`);
  const listedMs = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(asOfMs) || !Number.isFinite(listedMs)) return null;
  const days = Math.floor((asOfMs - listedMs) / DAY_MS);
  return Math.max(0, days);
}

/** The four multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(protocol: SnapshotProtocol, asOf: string, model: ModelConstants): { implied: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const extraChains = Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_extra_chains);
  const breadthMult = 1 + extraChains * model.breadth_per_chain;
  const base = protocol.tvl_usd * model.base_multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * breadthMult));
  return { implied, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const WRAPPED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** A name beginning with an exchange's name. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not a wrapped, staked or
 * bridged product of a token that already trades, not an exchange, not a versioned pool.
 * This is the watchlist's own exclusion, applied to the early rows too.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !WRAPPED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_WORD.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** The snapshot's protocols by slug, for the watchlist lookup. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  const index = new Map<string, SnapshotProtocol>();
  for (const p of protocols) index.set(p.slug, p);
  return index;
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor, by TVL, capped. Never a replacement
  // for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const { implied, growthPct, growthMult, maturityMult, breadthMult, age } = impliedValue(p, snapshot.as_of, model);
    return { p, implied, growthPct, growthMult, maturityMult, breadthMult, age };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_multiple: model.base_multiple,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** A second chain when the protocol runs on more than one, else null. */
function secondChainOf(p: SnapshotProtocol): string | null {
  return p.chains.length > 1 ? p.chains[1]! : null;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 500;
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 150;
  return 75;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's main action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain}, then borrow $20 of USDC against it and repay the borrow the same week so the loan is on record.`;
  if (c.includes('cdp')) return `Lock $${capital} of ETH as collateral in ${name} on ${chain} and mint $25 of its stable asset against it, keeping the ratio above the liquidation line.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s largest pool on ${chain} in a $25 USDC / $25 paired-asset split and keep the position in range.`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Deposit $${capital} of USDC into ${name}'s highest-TVL vault on ${chain} and turn on auto-compound so each harvest restakes.`;
  if (c.includes('risk curator') || c.includes('curator')) return `Allocate $${capital} across two ${name} curated vaults on ${chain} ($${Math.round(capital / 2)} each) and leave both allocations untouched for the full hold.`;
  if (c.includes('capital allocator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} allocation vault on ${chain} and keep the vault shares; check the vault's allocation report once a week.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield-bearing real-world asset on ${chain} and hold it in the farming wallet for the full hold.`;
  if (c.includes('basis')) return `Deposit $${capital} of USDC into ${name}'s basis vault on ${chain} and keep the position through one funding cycle.`;
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('synthetic') || c.includes('options')) return `Deposit $${capital} of USDC as margin on ${name} on ${chain} and open one $25 hedge, closing it after a week and reopening it once.`;
  if (c.includes('restak') || c.includes('staking pool')) return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the liquid receipt token in the farming wallet.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and deploy the bridged funds in the destination app the same day.`;
  if (c.includes('prediction')) return `Fund ${name} with $${capital} on ${chain} and place one $10 market position, then a second $10 position on a different market the next week.`;
  if (c.includes('launchpad')) return `Stake $${capital} of the launchpad asset in ${name} on ${chain} to qualify for allocations, and vote in one launch poll.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} for a protocol you already use, and keep the policy for the full hold.`;
  if (c.includes('payment')) return `Fund ${name} with $${capital} on ${chain} and send one $10 payment through it each week to a wallet you control.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it in the farming wallet for the full hold.`;
  if (c.includes('farm')) return `Deposit $${capital} of USDC into ${name}'s main farm on ${chain} and harvest the farm rewards once a week.`;
  if (c.includes('index')) return `Buy $${capital} of ${name}'s index token on ${chain} and hold it for the full hold.`;
  if (c.includes('locker') || c.includes('token locker')) return `Lock $${capital} of tokens in ${name} on ${chain} for the shortest lock that still qualifies, and keep the lock receipt.`;
  if (c.includes('liquidity manager')) return `Deposit $${capital} into ${name}'s managed liquidity position on ${chain} and let it rebalance for the full hold.`;
  if (c.includes('chain')) return `Bridge $${capital} of USDC onto ${name}'s chain and use it in one native app there each week.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open for the full hold.`;
}

/** The category's weekly qualifying action, so the plan is not one deposit and silence. */
function weeklyFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  const small = Math.max(10, Math.round(capital / 10));
  if (c.includes('lend') || c.includes('collateral') || c.includes('cdp')) return `Each week, borrow $${small} against the ${name} position on ${chain} and repay it within two days, so a fresh borrow is on record every week.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Each week, swap $${small} through ${name} on ${chain} and add the output back to the pool, so trading volume and liquidity both show activity.`;
  if (c.includes('yield')) return `Each week, harvest the ${name} vault yield on ${chain} and restake it the same day instead of withdrawing it.`;
  if (c.includes('curator') || c.includes('allocator')) return `Each week, move $${small} between the two ${name} vaults on ${chain} and read the new allocation report, so the curator sees an active allocator.`;
  if (c.includes('rwa') || c.includes('stable')) return `Each week, mint $${small} more of the ${name} asset on ${chain} and hold it, growing the position instead of letting it sit still.`;
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('synthetic') || c.includes('options') || c.includes('basis')) return `Each week, close the old ${name} hedge on ${chain} and open a fresh $${small} one, so the position is never more than a week old.`;
  if (c.includes('restak') || c.includes('staking pool')) return `Each week, restake the ${name} staking rewards on ${chain} so the staked balance compounds instead of sitting idle.`;
  if (c.includes('prediction')) return `Each week, place one $${small} position on a new ${name} market on ${chain} and let the earlier ones settle.`;
  if (c.includes('launchpad')) return `Each week, vote in one ${name} poll or join one testnet task on ${chain} so the account shows governance activity.`;
  if (c.includes('payment')) return `Each week, send $${small} through ${name} on ${chain} to a wallet you control, keeping a steady payment history.`;
  if (c.includes('insurance')) return `Each week, open ${name} on ${chain} and check the cover quote for a second protocol, so the account is active even while the policy runs.`;
  if (c.includes('farm') || c.includes('index') || c.includes('locker') || c.includes('liquidity manager')) return `Each week, harvest or rebalance the ${name} position on ${chain} and add $${small} to it, so the position grows through the hold.`;
  return `Each week, make one small qualifying action on ${name} on ${chain} — a $${small} deposit, swap or vote — so the wallet is active every week of the hold.`;
}

/** Where the protocol's own rewards page lives in the plan: what to check before claiming. */
function claimFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('curator') || c.includes('allocator')) return `Open ${name}'s vault page and read each vault's allocation report and any points tab before claiming anything.`;
  if (c.includes('dex')) return `Open ${name}'s pool page and check earned LP fees and any points tab before claiming anything.`;
  if (c.includes('lend') || c.includes('cdp')) return `Open ${name}'s dashboard and check the borrow history and any points tab before claiming anything.`;
  if (c.includes('yield')) return `Open ${name}'s vault page and check the harvest history and any points tab before claiming anything.`;
  if (c.includes('rwa') || c.includes('stable')) return `Open ${name}'s asset page and check the holding record and any points tab before claiming anything.`;
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('synthetic') || c.includes('options') || c.includes('basis')) return `Open ${name}'s trading page and check the closed-trade history and any points tab before claiming anything.`;
  if (c.includes('restak') || c.includes('staking pool')) return `Open ${name}'s staking page and check the staked balance and any points tab before claiming anything.`;
  return `Open ${name}'s own points or rewards page and check the wallet's activity record before claiming anything.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of
 * names — and every step names the protocol, its chain or its capital, so no two rows share a
 * plan word for word.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const second = secondChainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = capital >= 250 ? 8 : 4;
  const secondStep =
    second === null
      ? {
          text: `After ${Math.round(hold / 2)} days, add $${Math.round(capital / 2)} more to the ${p.name} position on ${chain} so the wallet shows a second, later deposit.`,
          cost: `$${Math.round(capital / 2)} of extra capital and about $${gas} of gas`,
          time: '10 minutes, once',
        }
      : {
          text: `After ${Math.round(hold / 2)} days, repeat the same ${p.name} position on ${second} with $${Math.round(capital / 2)} so the wallet is active on a second chain.`,
          cost: `$${Math.round(capital / 2)} of extra capital and about $${gas} of gas`,
          time: '15 minutes, once',
        };
  return [
    {
      text: `Use a fresh wallet that holds only the $${capital} you plan to farm on ${p.name} (${chain}), and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: weeklyFor(p, capital, chain),
      cost: `about $2 of gas a week on ${chain}`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the ${p.name} position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position on ${chain}`,
      time: `${hold} days`,
    },
    {
      text: `${claimFor(p)} Claim only from the link that page itself publishes, and never pay a fee to claim.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: secondStep.text,
      cost: secondStep.cost,
      time: secondStep.time,
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  const live = snapshot.protocols.filter((p) => !isPreToken(p) && p.category !== 'CEX');
  live.sort((a, b) => {
    const byMcap = (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0);
    return byMcap !== 0 ? byMcap : b.tvl_usd - a.tvl_usd;
  });
  return live.slice(0, LIVE_ROWS).map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    mcap_usd: p.mcap_usd,
    change_7d: p.change_7d,
  }));
}

/** A board row's compact form for data.js, with the farm plan exactly as board.json carries it. */
export function radarRow(row: BoardRow): RadarRow {
  const { rank, slug, name, category, chains, tvl_usd, change_7d, mcap_usd, listed_at, age_days, implied_value_usd, farm_steps } = row;
  return {
    rank,
    slug,
    name,
    category,
    chains,
    tvl_usd,
    change_7d,
    mcap_usd,
    listed_at,
    age_days,
    implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const early = board.filter((r) => !watchlist.has(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The document's as_of date, or a refusal. */
function snapshotDate(doc: Record<string, unknown>): string {
  if (typeof doc.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(doc.as_of)) {
    throw new SnapshotError('snapshot.json has no as_of date');
  }
  return doc.as_of;
}

/** The document's source string, or a refusal. */
function snapshotSource(doc: Record<string, unknown>): string {
  if (typeof doc.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  return doc.source;
}

/** The document's watchlist floor in USD, or a refusal. */
function snapshotFloor(doc: Record<string, unknown>): number {
  if (typeof doc.floor_usd !== 'number' || !Number.isSafeInteger(doc.floor_usd) || doc.floor_usd <= 0) {
    throw new SnapshotError('snapshot.json has no floor_usd');
  }
  return doc.floor_usd;
}

/** One protocol entry out of the document's raw value, or a refusal naming its index. */
function snapshotProtocol(value: unknown, index: number): SnapshotProtocol {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SnapshotError(`snapshot.json's protocol ${index} is not an object`);
  }
  const p = value as Record<string, unknown>;
  if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
    throw new SnapshotError(`snapshot.json's protocol ${index} lacks a slug, a name or a TVL`);
  }
  return {
    slug: p.slug,
    name: p.name,
    category: typeof p.category === 'string' ? p.category : null,
    chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
    tvl_usd: p.tvl_usd,
    change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
    mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
    listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
    gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
    symbol: typeof p.symbol === 'string' ? p.symbol : null,
  };
}

/** The document's protocols array, or a refusal. */
function snapshotProtocols(doc: Record<string, unknown>): SnapshotProtocol[] {
  if (!Array.isArray(doc.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  return doc.protocols.map((v, i) => snapshotProtocol(v, i));
}

/** The document's watchlist of slugs, or a refusal. */
function snapshotWatchlist(doc: Record<string, unknown>): string[] {
  if (!Array.isArray(doc.watchlist) || doc.watchlist.some((s) => typeof s !== 'string')) {
    throw new SnapshotError('snapshot.json has no watchlist of slugs');
  }
  return doc.watchlist as string[];
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SnapshotError('snapshot.json is not a JSON object');
  }
  const doc = raw as Record<string, unknown>;
  const asOf = snapshotDate(doc);
  const source = snapshotSource(doc);
  const floor = snapshotFloor(doc);
  const protocols = snapshotProtocols(doc);
  const watchlist = snapshotWatchlist(doc);
  return { as_of: asOf, source, floor_usd: floor, protocols, watchlist };
}

/** The watchlist slugs the board does not cover, or null. */
function coverageIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length === 0) return null;
  return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
}

/** The first rank that is not its position, or null. */
function rankIssue(board: BoardRow[]): string | null {
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  return null;
}

/** The first row that outranks the row before it, or null. */
function orderIssue(board: BoardRow[]): string | null {
  for (let i = 1; i < board.length; i++) {
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  }
  return null;
}

/** The refusal when every row shares one implied value, or null. */
function sharedValueIssue(board: BoardRow[]): string | null {
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  return null;
}

/** The first row whose farm steps break the gate, or null. */
function stepsIssue(board: BoardRow[]): string | null {
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  return coverageIssue(board, snapshot) ?? rankIssue(board) ?? orderIssue(board) ?? sharedValueIssue(board) ?? stepsIssue(board);
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  const json = JSON.stringify(radar);
  return `window.RADAR=${json};\n`;
}
