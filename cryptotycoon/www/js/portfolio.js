/**
 * Crypto Trader Tycoon — Portfolio management
 */

import { ASSETS } from "./market.js";

export class Portfolio {
  constructor(startingCash = 100) {
    this.cash = startingCash;
    this.holdings = {}; // symbol -> { units, avgCost }
    this.trades = []; // historique
    this.realizedPnL = 0;
    this.totalDeposited = startingCash;
    for (const sym of Object.keys(ASSETS)) {
      this.holdings[sym] = { units: 0, avgCost: 0 };
    }
  }

  /**
   * Achète `usdAmount` worth de la crypto au prix donné.
   * Retourne { ok, error, units, fee }
   */
  buy(symbol, usdAmount, price) {
    if (usdAmount <= 0) return { ok: false, error: "invalid_amount" };
    if (usdAmount > this.cash) return { ok: false, error: "insufficient_cash" };

    const fee = usdAmount * 0.001; // 0.1% fee
    const netUsd = usdAmount - fee;
    const units = netUsd / price;

    const h = this.holdings[symbol];
    const newUnits = h.units + units;
    h.avgCost = newUnits > 0
      ? (h.avgCost * h.units + price * units) / newUnits
      : 0;
    h.units = newUnits;

    this.cash -= usdAmount;

    this.trades.push({
      type: "buy",
      symbol,
      units,
      price,
      usdAmount,
      fee,
      tick: Date.now()
    });
    if (this.trades.length > 100) this.trades.shift();

    return { ok: true, units, fee };
  }

  /**
   * Vend `units` de la crypto. Si units = "all", vend tout.
   */
  sell(symbol, units, price) {
    const h = this.holdings[symbol];
    if (units === "all") units = h.units;
    if (units <= 0) return { ok: false, error: "invalid_amount" };
    if (units > h.units + 1e-9) return { ok: false, error: "insufficient_units" };

    const grossUsd = units * price;
    const fee = grossUsd * 0.001;
    const netUsd = grossUsd - fee;

    const costBasis = h.avgCost * units;
    const pnl = netUsd - costBasis;
    this.realizedPnL += pnl;

    h.units -= units;
    if (h.units < 1e-9) {
      h.units = 0;
      h.avgCost = 0;
    }
    this.cash += netUsd;

    this.trades.push({
      type: "sell",
      symbol,
      units,
      price,
      usdAmount: grossUsd,
      fee,
      pnl,
      tick: Date.now()
    });
    if (this.trades.length > 100) this.trades.shift();

    return { ok: true, units, fee, pnl };
  }

  /**
   * Valeur totale du portefeuille (cash + holdings au prix actuel)
   */
  totalValue(prices) {
    let v = this.cash;
    for (const [sym, h] of Object.entries(this.holdings)) {
      v += h.units * (prices[sym] || 0);
    }
    return v;
  }

  /**
   * P&L non réalisé pour un asset
   */
  unrealizedPnL(symbol, currentPrice) {
    const h = this.holdings[symbol];
    if (h.units === 0) return 0;
    return (currentPrice - h.avgCost) * h.units;
  }

  serialize() {
    return {
      cash: this.cash,
      holdings: { ...this.holdings },
      realizedPnL: this.realizedPnL,
      totalDeposited: this.totalDeposited,
      trades: this.trades.slice(-30)
    };
  }

  static deserialize(data) {
    const p = new Portfolio(0);
    p.cash = data.cash;
    p.holdings = { ...data.holdings };
    p.realizedPnL = data.realizedPnL || 0;
    p.totalDeposited = data.totalDeposited || data.cash;
    p.trades = [...(data.trades || [])];
    // Ensure all current assets have a holding entry
    for (const sym of Object.keys(ASSETS)) {
      if (!p.holdings[sym]) p.holdings[sym] = { units: 0, avgCost: 0 };
    }
    return p;
  }
}
