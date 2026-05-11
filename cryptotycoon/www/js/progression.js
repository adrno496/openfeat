/**
 * Crypto Trader Tycoon — Progression system
 * Tiers basés sur la valeur totale du portfolio.
 */

export const TIERS = [
  { tier: 0, name: "Retail",         minValue: 0,        title: "Trader Retail" },
  { tier: 1, name: "Bronze",         minValue: 1000,     title: "Trader Bronze" },
  { tier: 2, name: "Argent",         minValue: 5000,     title: "Trader Argent" },
  { tier: 3, name: "Or",             minValue: 25000,    title: "Trader Or" },
  { tier: 4, name: "Platine",        minValue: 100000,   title: "Trader Platine" },
  { tier: 5, name: "Diamant",        minValue: 500000,   title: "Trader Diamant" },
  { tier: 6, name: "Million",        minValue: 1000000,  title: "Crypto Millionaire" },
  { tier: 7, name: "Hedge Fund",     minValue: 10000000, title: "Hedge Fund Manager" },
  { tier: 8, name: "Whale",          minValue: 100000000, title: "Crypto Whale" },
  { tier: 9, name: "Mogul",          minValue: 1000000000, title: "Crypto Mogul" }
];

export function getTier(totalValue) {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (totalValue >= t.minValue) current = t;
  }
  return current;
}

export function getNextTier(totalValue) {
  for (const t of TIERS) {
    if (totalValue < t.minValue) return t;
  }
  return null;
}

export const ACHIEVEMENTS = [
  { id: "first_trade",    name: "Premier trade",        description: "Effectuer votre premier achat",                  reward: 50,    check: (s) => s.totalTrades >= 1 },
  { id: "first_1k",       name: "Premier 1K",           description: "Atteindre 1 000$ de portefeuille",               reward: 100,   check: (s) => s.maxValue >= 1000 },
  { id: "first_10k",      name: "Premier 10K",          description: "Atteindre 10 000$ de portefeuille",              reward: 500,   check: (s) => s.maxValue >= 10000 },
  { id: "first_100k",     name: "Premier 100K",         description: "Atteindre 100 000$ de portefeuille",             reward: 2500,  check: (s) => s.maxValue >= 100000 },
  { id: "millionaire",    name: "Millionnaire",         description: "Atteindre 1 000 000$ de portefeuille",           reward: 25000, check: (s) => s.maxValue >= 1000000 },
  { id: "first_bot",      name: "Délégation",           description: "Acheter votre premier bot",                      reward: 100,   check: (s) => s.botsOwned >= 1 },
  { id: "bot_army",       name: "Armée de bots",        description: "Posséder 3 bots différents",                     reward: 5000,  check: (s) => s.botsOwned >= 3 },
  { id: "buy_dip",        name: "Buy the dip",          description: "Acheter pendant une Capitulation",               reward: 200,   check: (s) => s.boughtDuringCapitulation },
  { id: "diamond_hands",  name: "Diamond Hands",        description: "Hold pendant un Bear complet sans vendre",       reward: 1000,  check: (s) => s.heldThroughBear },
  { id: "ride_the_wave",  name: "Ride the wave",        description: "Réaliser un trade gagnant pendant Euphoria",     reward: 1500,  check: (s) => s.profitedDuringEuphoria },
  { id: "survived_swan",  name: "Black Swan survivor",  description: "Survivre à un effondrement d'exchange",          reward: 3000,  check: (s) => s.survivedBlackSwan },
  { id: "diversified",    name: "Diversifié",           description: "Détenir 4 cryptos différentes simultanément",    reward: 1000,  check: (s) => s.maxConcurrentHoldings >= 4 },
  { id: "all_unlocked",   name: "Catalogue complet",    description: "Débloquer toutes les cryptos",                    reward: 10000, check: (s) => s.unlockedCount >= 5 }
];

export class ProgressionTracker {
  constructor() {
    this.totalTrades = 0;
    this.maxValue = 100;
    this.botsOwned = 0;
    this.unlockedCount = 1;
    this.unlocked = { BTC: true };
    this.boughtDuringCapitulation = false;
    this.heldThroughBear = false;
    this.profitedDuringEuphoria = false;
    this.survivedBlackSwan = false;
    this.maxConcurrentHoldings = 1;
    this.achievementsUnlocked = new Set();
    this.lastBearStart = null;
    this.tradesDuringBear = 0;
  }

  /**
   * À appeler à chaque tick / event pour update les compteurs.
   */
  update(market, portfolio, botMgr) {
    const value = portfolio.totalValue(market.prices);
    if (value > this.maxValue) this.maxValue = value;

    // Bot count
    this.botsOwned = Object.keys(botMgr.bots).length;

    // Concurrent holdings
    const holdingCount = Object.values(portfolio.holdings).filter(h => h.units > 1e-9).length;
    if (holdingCount > this.maxConcurrentHoldings) this.maxConcurrentHoldings = holdingCount;

    // Bear tracking
    if (market.regime === "BEAR" || market.regime === "CAPITULATION") {
      if (this.lastBearStart === null) {
        this.lastBearStart = market.tick;
        this.tradesDuringBear = 0;
      }
    } else {
      if (this.lastBearStart !== null && market.tick - this.lastBearStart > 50 && this.tradesDuringBear === 0 && holdingCount > 0) {
        this.heldThroughBear = true;
      }
      this.lastBearStart = null;
    }
  }

  recordTrade({ market, type }) {
    this.totalTrades += 1;
    if (market.regime === "BEAR" || market.regime === "CAPITULATION") {
      this.tradesDuringBear += 1;
      if (type === "buy" && market.regime === "CAPITULATION") {
        this.boughtDuringCapitulation = true;
      }
    }
    if (type === "sell" && market.regime === "EUPHORIA") {
      this.profitedDuringEuphoria = true;
    }
  }

  recordEvent(event) {
    if (event.id === "ftx_moment") {
      this.survivedBlackSwan = true; // gagné si on est encore là
    }
  }

  unlock(symbol) {
    if (!this.unlocked[symbol]) {
      this.unlocked[symbol] = true;
      this.unlockedCount += 1;
    }
  }

  /**
   * Retourne les achievements nouvellement débloqués (et les marque).
   */
  checkAchievements() {
    const newly = [];
    for (const ach of ACHIEVEMENTS) {
      if (this.achievementsUnlocked.has(ach.id)) continue;
      if (ach.check(this)) {
        this.achievementsUnlocked.add(ach.id);
        newly.push(ach);
      }
    }
    return newly;
  }

  serialize() {
    return {
      totalTrades: this.totalTrades,
      maxValue: this.maxValue,
      botsOwned: this.botsOwned,
      unlockedCount: this.unlockedCount,
      unlocked: { ...this.unlocked },
      boughtDuringCapitulation: this.boughtDuringCapitulation,
      heldThroughBear: this.heldThroughBear,
      profitedDuringEuphoria: this.profitedDuringEuphoria,
      survivedBlackSwan: this.survivedBlackSwan,
      maxConcurrentHoldings: this.maxConcurrentHoldings,
      achievementsUnlocked: [...this.achievementsUnlocked],
      lastBearStart: this.lastBearStart,
      tradesDuringBear: this.tradesDuringBear
    };
  }

  static deserialize(data) {
    const p = new ProgressionTracker();
    if (!data) return p;
    Object.assign(p, data);
    p.unlocked = { ...(data.unlocked || { BTC: true }) };
    p.achievementsUnlocked = new Set(data.achievementsUnlocked || []);
    return p;
  }
}
