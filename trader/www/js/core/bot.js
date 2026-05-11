// Main trading loop. Runs in the WebView; the foreground service keeps the
// process alive when the screen is off.
import { HLExchange } from './exchange.js';
import { Storage } from './storage.js';
import { computeConsensus } from '../strategies/consensus.js';
import { atr } from '../strategies/indicators.js';
import { notify } from './notifications.js';
import { startForegroundService, stopForegroundService } from './foreground.js';

const HAS_NETWORK_PLUGIN = typeof window !== 'undefined' &&
  window.Capacitor?.isPluginAvailable?.('Network');
const Network = HAS_NETWORK_PLUGIN ? window.Capacitor.Plugins.Network : null;

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDayKey = (ts = Date.now()) => Math.floor(ts / DAY_MS);

export class TradingBot {
  constructor() {
    this.exchange = null;
    this.config = null;
    this.state = {
      running: false,
      circuitBreaker: false,
      positions: [],
      signals: {},
      pnlToday: 0,
      balance: 0,
      // Snapshot of account value at the start of the current UTC day. The
      // running PnL of the day = balance - dayStartBalance.
      dayStartBalance: 0,
      dayKey: utcDayKey(),
      fearGreed: { value: 50, label: 'Neutral' },
      trades: [],
      errors: [],
      lastUpdate: null,
      startedAt: null,
    };
    this.loopTimer = null;
    this.fearGreedTimer = null;
    this.onStateChange = null;
    // Re-entrancy guard: while a tick is in flight, the next interval fire is
    // skipped instead of running a second loop in parallel.
    this._tickInFlight = false;
  }

  async init() {
    this.config = await Storage.getConfig();
    if (!this.config) throw new Error('No config — run setup first');
    const wallet = await Storage.getWallet();
    if (!wallet) throw new Error('No wallet — run setup first');

    this.exchange = new HLExchange(wallet.privateKey, this.config.network);

    if (!(await this.exchange.ping())) {
      throw new Error('Hyperliquid /info unreachable');
    }

    const persisted = await Storage.getBotState();
    if (persisted) {
      this.state = { ...this.state, ...persisted };
      this.state.running = false;
      this.state.signals = {};
    }

    // Reconcile against on-chain truth at startup. Local state is advisory;
    // the exchange is authoritative. This also catches positions that were
    // closed (SL/TP filled) while the app was killed.
    await this._reconcileWithOnChain();
  }

  async start() {
    if (this.state.running) return;
    if (!this.exchange) await this.init();
    this.state.running = true;
    this.state.startedAt = new Date().toISOString();
    this._rolloverDayIfNeeded();
    this._emit();

    await startForegroundService();

    this._tick().catch((e) => this._logError(e.message));
    this.loopTimer = setInterval(() => {
      this._tick().catch((e) => this._logError(e.message));
    }, this.config.loopIntervalMs || 60_000);

    this.fearGreedTimer = setInterval(() => this._updateFearGreed(), 30 * 60 * 1000);
    this._updateFearGreed().catch(() => {});
  }

  stop() {
    if (this.loopTimer) { clearInterval(this.loopTimer); this.loopTimer = null; }
    if (this.fearGreedTimer) { clearInterval(this.fearGreedTimer); this.fearGreedTimer = null; }
    this.state.running = false;
    this._emit();
    stopForegroundService();
  }

  reloadConfig(config) {
    this.config = config;
  }

  async closePosition(coin) {
    try {
      await this.exchange.cancelAllOrders(coin);
      await this.exchange.marketClose(coin);
      await this._updatePositions();
      this._emit();
      if (this.config.notifications?.onTrade) {
        await notify('Position fermée', `${coin} fermé manuellement`);
      }
    } catch (err) {
      this._logError(`closePosition ${coin}: ${err.message}`);
      throw err;
    }
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  async _tick() {
    if (!this.state.running) return;
    if (this._tickInFlight) return; // Skip if previous tick still running.
    this._tickInFlight = true;

    try {
      if (Network) {
        try {
          const status = await Network.getStatus();
          if (!status.connected) return;
        } catch {}
      }

      this._rolloverDayIfNeeded();

      await this._updatePositions();
      if (this._checkCircuitBreaker()) {
        this._emit();
        return;
      }

      const mids = await this.exchange.getAllMids();

      for (const coin of this.config.coins) {
        if (this._hasPosition(coin)) continue;
        if (this.state.positions.length >= this.config.maxPositions) break;

        let candles;
        try {
          candles = await this.exchange.getCandles(coin, this.config.timeframe, 150);
        } catch (e) {
          this._logError(`candles ${coin}: ${e.message}`);
          continue;
        }
        if (!candles || candles.length < 50) continue;

        const price = parseFloat(mids[coin] || candles.at(-1).c);
        const consensus = await computeConsensus(candles, this.config, this.state.fearGreed);
        const atrVal = atr(candles, 14);

        this.state.signals[coin] = {
          price,
          direction: consensus.direction,
          score: consensus.score,
          longScore: consensus.longScore,
          shortScore: consensus.shortScore,
          strategies: consensus.strategies,
          updatedAt: new Date().toISOString(),
        };

        if (consensus.direction !== 'none') {
          try {
            await this._openPosition(coin, consensus.direction, price, atrVal);
          } catch (e) {
            this._logError(`open ${coin}: ${e.message}`);
          }
        }
      }

      this.state.lastUpdate = new Date().toISOString();
      await Storage.saveBotState(this.state);
      this._emit();
    } catch (err) {
      this._logError(err.message);
      this._emit();
    } finally {
      this._tickInFlight = false;
    }
  }

  async _openPosition(coin, direction, price, atrVal) {
    const c = this.config;
    const isLong = direction === 'long';
    const riskUsd = (c.capital * c.riskPerTradePct) / 100;

    const slDist = (atrVal || price * 0.015) * c.atrMultiplier;
    const slPrice = isLong ? price - slDist : price + slDist;
    const tpPrice = isLong
      ? price + slDist * c.rewardRiskRatio
      : price - slDist * c.rewardRiskRatio;

    let size = riskUsd / slDist;
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error('Invalid size computed');
    }

    // Margin sanity check: notional / leverage must fit comfortably in the
    // free balance, leaving 5% headroom for fees and price drift.
    const balance = this.state.balance || (await this.exchange.getBalance());
    const notional = size * price;
    const requiredMargin = notional / Math.max(c.leverage, 1);
    const maxMargin = balance * 0.95;
    if (requiredMargin > maxMargin) {
      const scale = maxMargin / requiredMargin;
      size = size * scale;
      this._logError(`${coin}: size scaled by ${scale.toFixed(2)} (margin cap)`);
      if (size <= 0 || !Number.isFinite(size)) {
        throw new Error('Insufficient margin for any meaningful size');
      }
    }

    await this.exchange.setLeverage(coin, c.leverage, c.marginMode === 'cross');
    const result = await this.exchange.marketOpen(coin, isLong, size);
    const ok = result?.status === 'ok';
    if (!ok) throw new Error(`open rejected: ${JSON.stringify(result)}`);

    // Place SL + TP BEFORE confirming the trade in local state. If either
    // fails we immediately close the position — a naked perp is the worst
    // possible state for a bot to be in.
    let slOk = false, tpOk = false;
    try {
      await this.exchange.placeStopLoss(coin, !isLong, size, slPrice);
      slOk = true;
      await this.exchange.placeTakeProfit(coin, !isLong, size, tpPrice);
      tpOk = true;
    } catch (e) {
      this._logError(`SL/TP ${coin} failed (${e.message}) — closing position`);
      try {
        if (slOk) await this.exchange.cancelAllOrders(coin);
        await this.exchange.marketClose(coin);
      } catch (closeErr) {
        // We tried. Surface loudly so the user can intervene manually.
        this._logError(`EMERGENCY: could not close ${coin} after SL/TP failure: ${closeErr.message}`);
        if (this.config.notifications?.onError) {
          notify('URGENT', `${coin} ouverte sans SL/TP — fermer manuellement`);
        }
      }
      throw new Error(`${coin} aborted: SL/TP placement failed`);
    }

    const trade = {
      coin,
      direction,
      size,
      entry: price,
      sl: slPrice,
      tp: tpPrice,
      leverage: c.leverage,
      openedAt: new Date().toISOString(),
      pnl: 0,
      status: 'opened',
    };
    this.state.positions.push(trade);
    this.state.trades.unshift(trade);
    this.state.trades = this.state.trades.slice(0, 100);
    await Storage.addTrade(trade);

    if (this.config.notifications?.onTrade) {
      await notify(
        `${direction.toUpperCase()} ${coin}`,
        `Entry $${price.toFixed(2)} · SL $${slPrice.toFixed(2)} · TP $${tpPrice.toFixed(2)}`,
      );
    }
  }

  async _updatePositions() {
    const livePositions = await this.exchange.getPositions();
    const liveCoins = new Set(livePositions.map((p) => p.coin));

    const closed = this.state.positions.filter((p) => !liveCoins.has(p.coin));
    this.state.positions = this.state.positions.filter((p) => liveCoins.has(p.coin));

    for (const p of this.state.positions) {
      const live = livePositions.find((lp) => lp.coin === p.coin);
      if (live) {
        p.pnl = live.pnl;
        p.entryPrice = live.entryPrice;
        p.size = live.size;
      }
    }
    for (const p of closed) {
      if (this.config.notifications?.onTrade) {
        notify(`${p.coin} fermée`, `Position ${p.direction.toUpperCase()} clôturée`);
      }
      // When a position disappears from on-chain we cancel any orphan SL/TP
      // triggers it left behind, otherwise the next entry on the same coin
      // will be partially hedged by the stale order.
      this.exchange.cancelAllOrders(p.coin).catch(() => {});
    }

    this.state.balance = await this.exchange.getBalance();
    // Day PnL = (account value now) − (account value at UTC midnight).
    // This includes both realised and unrealised, which is what the circuit
    // breaker actually wants to gate on.
    this.state.pnlToday = this.state.balance - this.state.dayStartBalance;
  }

  // Reconcile local positions with the exchange. Any position that exists
  // on-chain but lacks a matching SL/TP is flagged so the user can act.
  async _reconcileWithOnChain() {
    try {
      const livePositions = await this.exchange.getPositions();
      const openOrders = await this.exchange.getOpenOrders().catch(() => []);
      this.state.positions = livePositions.map((live) => {
        const local = this.state.positions.find((p) => p.coin === live.coin);
        return {
          coin: live.coin,
          direction: live.direction,
          size: live.size,
          entry: local?.entry ?? live.entryPrice,
          entryPrice: live.entryPrice,
          sl: local?.sl,
          tp: local?.tp,
          leverage: live.leverage,
          openedAt: local?.openedAt ?? new Date().toISOString(),
          pnl: live.pnl,
          status: 'opened',
        };
      });

      // Warn on naked positions (no trigger orders on the same coin).
      for (const p of this.state.positions) {
        const triggers = openOrders.filter((o) => o.coin === p.coin && (o.tpsl || o.triggerPx));
        if (!triggers.length) {
          this._logError(`Position ${p.coin} sans SL/TP — vérifier`);
          if (this.config?.notifications?.onError) {
            notify('Position non protégée', `${p.coin} ouverte sans SL/TP`);
          }
        }
      }

      this.state.balance = await this.exchange.getBalance();
      // On a fresh restart, take the current balance as the day baseline.
      // It will be overwritten by _rolloverDayIfNeeded if persisted state is
      // already aligned with today.
      if (!this.state.dayStartBalance) this.state.dayStartBalance = this.state.balance;
    } catch (e) {
      this._logError(`reconcile: ${e.message}`);
    }
  }

  // Reset the day baseline when the UTC day has rolled over. Also resets the
  // circuit breaker so a new trading day can resume.
  _rolloverDayIfNeeded() {
    const today = utcDayKey();
    if (today !== this.state.dayKey) {
      this.state.dayKey = today;
      this.state.dayStartBalance = this.state.balance;
      this.state.circuitBreaker = false;
    }
  }

  async _updateFearGreed() {
    try {
      const res = await fetch('https://api.alternative.me/fng/');
      const data = await res.json();
      if (data?.data?.[0]) {
        this.state.fearGreed = {
          value: parseInt(data.data[0].value, 10),
          label: data.data[0].value_classification,
        };
      }
    } catch {}
  }

  _checkCircuitBreaker() {
    const limit = (this.config.capital * this.config.dailyDrawdownLimitPct) / 100;
    if (this.state.pnlToday < -limit) {
      if (!this.state.circuitBreaker) {
        this.state.circuitBreaker = true;
        if (this.config.notifications?.onCircuitBreaker) {
          notify('CIRCUIT BREAKER', `PnL jour ${this.state.pnlToday.toFixed(2)} USDC — trading suspendu`);
        }
      }
      return true;
    }
    return false;
  }

  _hasPosition(coin) {
    return this.state.positions.some((p) => p.coin === coin);
  }

  _logError(msg) {
    console.warn('[bot]', msg);
    this.state.errors.unshift({ time: new Date().toISOString(), msg });
    this.state.errors = this.state.errors.slice(0, 20);
    if (this.config?.notifications?.onError) {
      notify('Erreur bot', msg.slice(0, 100));
    }
  }

  _emit() {
    if (this.onStateChange) this.onStateChange({ ...this.state });
  }
}
