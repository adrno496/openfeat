/**
 * Crypto Trader Tycoon — Market simulator
 * Geometric Brownian Motion par asset, cycles bull/bear/choppy.
 * Tous les prix sont déterministes via une seed pour permettre offline gains.
 */

export const ASSETS = {
  BTC:  { name: "Bitcoin",   symbol: "BTC",  emoji: "₿", drift: 0.00012, vol: 0.038, basePrice: 65000,  unlockCost: 0,      tier: 0 },
  ETH:  { name: "Ethereum",  symbol: "ETH",  emoji: "Ξ", drift: 0.00015, vol: 0.055, basePrice: 3200,   unlockCost: 1000,   tier: 1 },
  SOL:  { name: "Solana",    symbol: "SOL",  emoji: "◎", drift: 0.00018, vol: 0.085, basePrice: 180,    unlockCost: 5000,   tier: 2 },
  DOGE: { name: "Dogecoin",  symbol: "DOGE", emoji: "Ð", drift: 0.00005, vol: 0.140, basePrice: 0.18,   unlockCost: 25000,  tier: 3 },
  PEPE: { name: "Pepe",      symbol: "PEPE", emoji: "🐸", drift: -0.00002, vol: 0.220, basePrice: 0.000012, unlockCost: 100000, tier: 4 }
};

export const REGIMES = {
  BULL:   { name: "Bull",   driftMult: 2.5,  volMult: 1.0,  minTicks: 60, maxTicks: 180 },
  BEAR:   { name: "Bear",   driftMult: -2.5, volMult: 1.4,  minTicks: 40, maxTicks: 120 },
  CHOPPY: { name: "Choppy", driftMult: 0.2,  volMult: 0.7,  minTicks: 50, maxTicks: 150 },
  EUPHORIA: { name: "Euphoria", driftMult: 4.5, volMult: 1.6, minTicks: 20, maxTicks: 50 },
  CAPITULATION: { name: "Capitulation", driftMult: -5.0, volMult: 2.0, minTicks: 15, maxTicks: 40 }
};

// Mulberry32 PRNG — déterministe, rapide
function mulberry32(seed) {
  let state = seed >>> 0;
  return function() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand) {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class Market {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.rand = mulberry32(seed);
    this.tick = 0;
    this.regime = "CHOPPY";
    this.regimeTicksLeft = 80;
    this.prices = {};
    this.history = {}; // symbol -> [{tick, price}]
    this.flash = {};   // symbol -> "up" | "down" | null pour UI
    this.activeEvent = null; // current temp event modifier

    for (const [sym, asset] of Object.entries(ASSETS)) {
      this.prices[sym] = asset.basePrice;
      this.history[sym] = [{ tick: 0, price: asset.basePrice }];
      this.flash[sym] = null;
    }
  }

  /**
   * Avance le marché de `ticks` pas. Retourne les changements pour notification UI.
   */
  advance(ticks = 1) {
    const changes = [];
    for (let i = 0; i < ticks; i++) {
      this.tick += 1;
      this.regimeTicksLeft -= 1;
      if (this.regimeTicksLeft <= 0) {
        this.changeRegime();
        changes.push({ type: "regime", regime: this.regime });
      }
      // Decay active event
      if (this.activeEvent) {
        this.activeEvent.ticksLeft -= 1;
        if (this.activeEvent.ticksLeft <= 0) {
          changes.push({ type: "eventEnd", event: this.activeEvent });
          this.activeEvent = null;
        }
      }

      const regime = REGIMES[this.regime];
      for (const [sym, asset] of Object.entries(ASSETS)) {
        let drift = asset.drift * regime.driftMult;
        let vol = asset.vol * regime.volMult;

        // Apply active event modifier
        if (this.activeEvent) {
          const mod = this.activeEvent.modifiers[sym] || this.activeEvent.modifiers.ALL || null;
          if (mod) {
            drift += mod.drift || 0;
            vol *= (mod.volMult ?? 1);
          }
        }

        const dt = 1; // 1 tick = 1 unit time
        const z = gaussian(this.rand);
        const oldPrice = this.prices[sym];
        const newPrice = oldPrice * Math.exp((drift - 0.5 * vol * vol) * dt + vol * Math.sqrt(dt) * z);
        // Floor to prevent zero
        this.prices[sym] = Math.max(newPrice, asset.basePrice * 0.05);

        // Flash for UI
        this.flash[sym] = newPrice > oldPrice ? "up" : (newPrice < oldPrice ? "down" : null);

        // Save history (keep last 200 points)
        this.history[sym].push({ tick: this.tick, price: this.prices[sym] });
        if (this.history[sym].length > 200) {
          this.history[sym].shift();
        }
      }
    }
    return changes;
  }

  changeRegime() {
    const regimes = Object.keys(REGIMES);
    const weights = {
      BULL: 0.30, BEAR: 0.25, CHOPPY: 0.30, EUPHORIA: 0.08, CAPITULATION: 0.07
    };
    const r = this.rand();
    let cumul = 0;
    let chosen = "CHOPPY";
    for (const reg of regimes) {
      cumul += weights[reg];
      if (r < cumul) { chosen = reg; break; }
    }
    this.regime = chosen;
    const r2 = REGIMES[chosen];
    this.regimeTicksLeft = Math.floor(r2.minTicks + this.rand() * (r2.maxTicks - r2.minTicks));
  }

  setEvent(event) {
    this.activeEvent = { ...event, ticksLeft: event.duration };
  }

  /**
   * Calcule la variation 24h simulée — on regarde 720 ticks en arrière (~24h à 2s/tick = 24min, mais en jeu = "1 jour").
   * Pour MVP : on regarde 60 ticks en arrière comme proxy.
   */
  getChange(symbol, lookback = 60) {
    const hist = this.history[symbol];
    if (!hist || hist.length < 2) return 0;
    const old = hist.length > lookback ? hist[hist.length - 1 - lookback] : hist[0];
    return (this.prices[symbol] - old.price) / old.price;
  }

  serialize() {
    return {
      seed: this.seed,
      tick: this.tick,
      regime: this.regime,
      regimeTicksLeft: this.regimeTicksLeft,
      prices: { ...this.prices },
      history: Object.fromEntries(
        Object.entries(this.history).map(([k, v]) => [k, v.slice(-50)]) // light history on save
      ),
      activeEvent: this.activeEvent
    };
  }

  static deserialize(data) {
    const m = new Market(data.seed);
    m.tick = data.tick;
    m.regime = data.regime;
    m.regimeTicksLeft = data.regimeTicksLeft;
    m.prices = { ...data.prices };
    m.history = data.history
      ? Object.fromEntries(Object.entries(data.history).map(([k, v]) => [k, [...v]]))
      : m.history;
    m.activeEvent = data.activeEvent || null;
    // Re-seed rand based on tick to keep determinism going forward-ish
    // (PRNG state isn't perfectly preserved, but acceptable for game)
    m.rand = mulberry32((data.seed ^ data.tick) >>> 0);
    return m;
  }
}
