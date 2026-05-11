// Thin Chart.js wrapper for the dashboard mini-chart.

let activeChart = null;

export function renderPriceChart(canvas, candles) {
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext('2d');

  const labels = candles.map((c) => new Date(c.t).getHours() + 'h');
  const data = candles.map((c) => parseFloat(c.c));

  if (activeChart) {
    activeChart.data.labels = labels;
    activeChart.data.datasets[0].data = data;
    activeChart.update('none');
    return;
  }

  activeChart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#00D4FF',
        backgroundColor: 'rgba(0, 212, 255, 0.08)',
        borderWidth: 1.5,
        fill: true,
        pointRadius: 0,
        tension: 0.25,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, grace: '1%' },
      },
    },
  });
}

export function destroyChart() {
  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }
}
