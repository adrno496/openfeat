/**
 * Crypto Trader Tycoon — Canvas price chart
 * Graphique simple ligne + zone, 200 derniers ticks.
 */

export class PriceChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.w = rect.width;
    this.h = rect.height;
  }

  draw(history, color = "#0db77b") {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!history || history.length < 2) return;

    const points = history.slice(-120);
    const prices = points.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const padTop = 12, padBottom = 8, padLeft = 4, padRight = 4;
    const innerW = this.w - padLeft - padRight;
    const innerH = this.h - padTop - padBottom;

    // Determine direction (up/down) for color based on first vs last
    const isUp = prices[prices.length - 1] >= prices[0];
    const lineColor = isUp ? "#0db77b" : "#e23d3d";
    const fillStart = isUp ? "rgba(13,183,123,0.18)" : "rgba(226,61,61,0.18)";
    const fillEnd = "rgba(13,183,123,0)";

    const px = i => padLeft + (i / (points.length - 1)) * innerW;
    const py = p => padTop + (1 - (p - min) / range) * innerH;

    // Subtle horizontal grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = padTop + (i / 4) * innerH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }

    // Filled area under line
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + innerH);
    grad.addColorStop(0, fillStart);
    grad.addColorStop(1, fillEnd);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px(0), padTop + innerH);
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(px(i), py(prices[i]));
    }
    ctx.lineTo(px(points.length - 1), padTop + innerH);
    ctx.closePath();
    ctx.fill();

    // Line stroke
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(px(0), py(prices[0]));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(px(i), py(prices[i]));
    }
    ctx.stroke();

    // Last price dot
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(px(points.length - 1), py(prices[prices.length - 1]), 3, 0, Math.PI * 2);
    ctx.fill();

    // Glow
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px(points.length - 1), py(prices[prices.length - 1]), 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
