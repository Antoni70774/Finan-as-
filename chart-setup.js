let chartInstance;
let lastTransactions = [];

export function createExpenseChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    chartInstance = new window.Chart(ctx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#4A90E2', '#2bc47d', '#ff3d3d', '#ffd700', '#ff8a80', '#e6f7ee'], }] },
        options: {
            plugins: { legend: { position: 'bottom' } },
            onClick: chartClickHandler
        }
    });
}

export function updateExpenseChart(transactions, categories) {
    if (!chartInstance) return;
    lastTransactions = transactions;
    const data = categories.map(cat => transactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0));
    chartInstance.data.labels = categories;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
}

function chartClickHandler(evt, elements) {
    if (!elements.length) return;
    const idx = elements[0].index;
    const cat = chartInstance.data.labels[idx];
    const filtered = lastTransactions.filter(t => t.category === cat);
    window.showChartDetails(cat, filtered);
}
