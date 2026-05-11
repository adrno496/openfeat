// Hyperliquid REST wrapper. Uses fetch() and delegates signing to HLSigner.
import { HLSigner } from './signer.js';

const URLS = {
  testnet: 'https://api.hyperliquid-testnet.xyz',
  mainnet: 'https://api.hyperliquid.xyz',
};

export class HLExchange {
  constructor(privateKey, network = 'testnet') {
    if (!URLS[network]) throw new Error(`Unknown network: ${network}`);
    this.network = network;
    this.isMainnet = network === 'mainnet';
    this.baseUrl = URLS[network];
    this.signer = new HLSigner(privateKey);
    this.address = this.signer.getAddress();
    this._meta = null;
  }

  // ─── /info (read-only) ──────────────────────────────────────────────────

  async fetchInfo(type, payload = {}) {
    const res = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
    });
    if (!res.ok) throw new Error(`info ${type} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async getAllMids() {
    return this.fetchInfo('allMids');
  }

  async getCandles(coin, tf, n = 150) {
    const intervalMs = {
      '1m': 60_000, '3m': 180_000, '5m': 300_000, '15m': 900_000,
      '30m': 1_800_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
    };
    const step = intervalMs[tf] || 900_000;
    const endTime = Date.now();
    const startTime = endTime - n * step;
    return this.fetchInfo('candleSnapshot', {
      req: { coin, interval: tf, startTime, endTime },
    });
  }

  async getAccountState() {
    return this.fetchInfo('clearinghouseState', { user: this.address });
  }

  async getOpenOrders() {
    return this.fetchInfo('openOrders', { user: this.address });
  }

  async getMeta() {
    if (!this._meta) this._meta = await this.fetchInfo('meta');
    return this._meta;
  }

  async getAssetIndex(coin) {
    const meta = await this.getMeta();
    const idx = meta.universe.findIndex((a) => a.name === coin);
    if (idx < 0) throw new Error(`Asset not found in universe: ${coin}`);
    return idx;
  }

  async getAssetSpec(coin) {
    const meta = await this.getMeta();
    const a = meta.universe.find((x) => x.name === coin);
    if (!a) throw new Error(`Asset spec not found: ${coin}`);
    // szDecimals: how many decimals the size can have. pxDecimals derived from coin price.
    return a;
  }

  async ping() {
    const mids = await this.getAllMids();
    return mids && Object.keys(mids).length > 0;
  }

  // ─── /exchange (signed) ─────────────────────────────────────────────────

  // Signed exchange call. Read-only actions (cancel by oid, updateLeverage)
  // can be retried safely on transient network errors; order placements
  // cannot, because retrying with a fresh nonce would risk a double-fill.
  // The caller controls this via `idempotent`. Default is false.
  async fetchExchange(action, vaultAddress = null, { idempotent = false, retries = 2 } = {}) {
    const attempt = async () => {
      const nonce = Date.now();
      const signature = await this.signer.signL1Action(action, nonce, vaultAddress, this.isMainnet);
      const body = { action, nonce, signature, vaultAddress };
      const res = await fetch(`${this.baseUrl}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(`exchange failed: ${res.status} ${JSON.stringify(json)}`);
        err.status = res.status;
        err.transient = res.status >= 500 || res.status === 429;
        throw err;
      }
      if (json.status === 'err') throw new Error(`HL: ${json.response || JSON.stringify(json)}`);
      return json;
    };

    let lastErr;
    for (let i = 0; i <= (idempotent ? retries : 0); i++) {
      try {
        return await attempt();
      } catch (e) {
        lastErr = e;
        // Non-idempotent calls never retry: a 5xx might mean the order *was*
        // accepted but the response was lost, in which case a retry would
        // double-fill.
        if (!idempotent) throw e;
        // Network/timeout errors don't carry e.status — treat as transient.
        const transient = e.transient || !e.status;
        if (!transient) throw e;
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }
    throw lastErr;
  }

  async setLeverage(coin, leverage, isCross = false) {
    const asset = await this.getAssetIndex(coin);
    return this.fetchExchange({
      type: 'updateLeverage',
      asset,
      isCross,
      leverage,
    }, null, { idempotent: true });
  }

  async marketOpen(coin, isBuy, size, slippage = 0.005) {
    const asset = await this.getAssetIndex(coin);
    const spec = await this.getAssetSpec(coin);
    const mids = await this.getAllMids();
    const px = parseFloat(mids[coin]);
    if (!Number.isFinite(px)) throw new Error(`No mid price for ${coin}`);

    const limitPx = formatPrice(isBuy ? px * (1 + slippage) : px * (1 - slippage), px);
    const sz = formatSize(size, spec.szDecimals ?? 4);

    return this.fetchExchange({
      type: 'order',
      orders: [{
        a: asset,
        b: isBuy,
        p: limitPx,
        s: sz,
        r: false,
        t: { limit: { tif: 'Ioc' } },
      }],
      grouping: 'na',
    });
  }

  async marketClose(coin) {
    const positions = await this.getPositions();
    const pos = positions.find((p) => p.coin === coin);
    if (!pos) return null;
    const asset = await this.getAssetIndex(coin);
    const spec = await this.getAssetSpec(coin);
    const mids = await this.getAllMids();
    const px = parseFloat(mids[coin]);
    const isBuy = pos.direction !== 'long'; // close long = sell, close short = buy
    const limitPx = formatPrice(isBuy ? px * 1.005 : px * 0.995, px);
    const sz = formatSize(pos.size, spec.szDecimals ?? 4);

    return this.fetchExchange({
      type: 'order',
      orders: [{
        a: asset,
        b: isBuy,
        p: limitPx,
        s: sz,
        r: true,
        t: { limit: { tif: 'Ioc' } },
      }],
      grouping: 'na',
    });
  }

  async placeStopLoss(coin, isBuy, size, triggerPrice) {
    const asset = await this.getAssetIndex(coin);
    const spec = await this.getAssetSpec(coin);
    const px = formatPrice(triggerPrice, triggerPrice);
    const sz = formatSize(size, spec.szDecimals ?? 4);
    return this.fetchExchange({
      type: 'order',
      orders: [{
        a: asset,
        b: isBuy,
        p: px,
        s: sz,
        r: true,
        t: { trigger: { isMarket: true, triggerPx: px, tpsl: 'sl' } },
      }],
      grouping: 'na',
    });
  }

  async placeTakeProfit(coin, isBuy, size, triggerPrice) {
    const asset = await this.getAssetIndex(coin);
    const spec = await this.getAssetSpec(coin);
    const px = formatPrice(triggerPrice, triggerPrice);
    const sz = formatSize(size, spec.szDecimals ?? 4);
    return this.fetchExchange({
      type: 'order',
      orders: [{
        a: asset,
        b: isBuy,
        p: px,
        s: sz,
        r: true,
        t: { trigger: { isMarket: true, triggerPx: px, tpsl: 'tp' } },
      }],
      grouping: 'na',
    });
  }

  async cancelAllOrders(coin) {
    const orders = await this.getOpenOrders();
    const cancels = orders
      .filter((o) => o.coin === coin)
      .map((o) => ({ a: o.asset ?? o.coin, o: o.oid }));
    if (!cancels.length) return null;
    return this.fetchExchange({ type: 'cancel', cancels }, null, { idempotent: true });
  }

  // ─── Convenience accessors ──────────────────────────────────────────────

  async getBalance() {
    const state = await this.getAccountState();
    return parseFloat(state?.marginSummary?.accountValue || 0);
  }

  async getPositions() {
    const state = await this.getAccountState();
    return (state?.assetPositions || [])
      .filter((p) => parseFloat(p.position.szi) !== 0)
      .map((p) => {
        const szi = parseFloat(p.position.szi);
        return {
          coin: p.position.coin,
          size: Math.abs(szi),
          direction: szi > 0 ? 'long' : 'short',
          entryPrice: parseFloat(p.position.entryPx || 0),
          liquidationPrice: parseFloat(p.position.liquidationPx || 0) || null,
          pnl: parseFloat(p.position.unrealizedPnl || 0),
          leverage: p.position.leverage?.value || 1,
          margin: parseFloat(p.position.marginUsed || 0),
        };
      });
  }
}

// HL accepts up to 5 significant digits in the price (with at most 6 decimals
// for perps). Use a simple heuristic that scales decimals with magnitude.
function formatPrice(price, ref) {
  const r = Math.abs(ref || price);
  let dec;
  if (r >= 10_000) dec = 1;
  else if (r >= 1000) dec = 2;
  else if (r >= 100) dec = 3;
  else if (r >= 10) dec = 4;
  else if (r >= 1) dec = 5;
  else dec = 6;
  return Number(price).toFixed(dec);
}

function formatSize(size, szDecimals) {
  return Number(size).toFixed(Math.min(Math.max(szDecimals, 0), 8));
}
