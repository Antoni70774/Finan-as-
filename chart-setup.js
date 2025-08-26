let expenseChart = null;

export function createExpenseChart() {
    const ctx = document.getElementById('expense-chart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                label: 'Despesas',
                data: [],
                backgroundColor: [
                    '#4A90E2', '#50E3C2', '#F5A623', '#F8E71C', '#BD10E0', '#7ED321'
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 20,
                        font: {
                            family: "'Roboto', sans-serif",
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

export function updateExpenseChart(transactions, categories) {
    if (!expenseChart) return;

    const expenseData = categories.map(category =>
        transactions
            .filter(t => t.type === 'expense' && t.category === category)
            .reduce((sum, t) => sum + t.amount, 0)
    );

    const hasData = expenseData.some(d => d > 0);
    const chartContainer = expenseChart.canvas.closest('.chart-container');

    if (hasData) {
        expenseChart.data.labels = categories;
        expenseChart.data.datasets[0].data = expenseData;
        chartContainer.style.display = 'block';
    } else {
        chartContainer.style.display = 'none';
    }

    expenseChart.update();
}
