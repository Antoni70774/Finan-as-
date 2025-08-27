let expenseChart = null;

export function createExpenseChart() {
  const ctx = document.getElementById('main-chart').getContext('2d');
  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: ['#4A90E2','#50E3C2','#F5A623','#F8E71C','#BD10E0','#7ED321','#FF6B6B','#6C5CE7'],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: {
        legend: { display: false }
      }
    }
  });
}

export function updateExpenseChart(categories, values) {
  if (!expenseChart) return;
  expenseChart.data.labels = categories;
  expenseChart.data.datasets[0].data = values;
  expenseChart.update();
}
