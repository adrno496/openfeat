/**
 * Geopolitik — Influence chart over time
 */

export class InfluenceChart {
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
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.w = rect.width;
    this.h = rect.height;
  }

  draw(history, nextTierMin = null) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!history || history.length < 2) return;

    const points = history.slice(-150);
    const values = points.map(p => p.influence);
    const min = Math.min(0, ...values);
    let max = Math.max(...values);
    if (nextTierMin && nextTierMin > max) max = nextTierMin;
    const range = (max - min) || 1;

    const padTop = 14, padBottom = 18, padLeft = 4, padRight = 4;
    const innerW = this.w - padLeft - padRight;
    const innerH = this.h - padTop - padBottom;

    const px = i => padLeft + (i / (points.length - 1)) * innerW;
    const py = v => padTop + (1 - (v - min) / range) * innerH;

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = padTop + (i / 4) * innerH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }

    // Next tier line (target)
    if (nextTierMin) {
      ctx.strokeStyle = "#d4a843";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      const tierY = py(nextTierMin);
      ctx.moveTo(0, tierY);
      ctx.lineTo(this.w, tierY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#d4a843";
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(`▲ ${nextTierMin}`, this.w - 4, tierY - 3);
    }

    // Filled area
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + innerH);
    grad.addColorStop(0, "rgba(61,109,217,0.30)");
    grad.addColorStop(1, "rgba(61,109,217,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px(0), padTop + innerH);
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(px(i), py(values[i]));
    }
    ctx.lineTo(px(points.length - 1), padTop + innerH);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = "#5d8de8";
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(px(0), py(values[0]));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(px(i), py(values[i]));
    }
    ctx.stroke();

    // Last point
    ctx.fillStyle = "#5d8de8";
    ctx.beginPath();
    ctx.arc(px(points.length - 1), py(values[values.length - 1]), 3, 0, Math.PI * 2);
    ctx.fill();

    // Glow
    ctx.shadowColor = "#5d8de8";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px(points.length - 1), py(values[values.length - 1]), 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
