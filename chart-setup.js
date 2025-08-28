let chartInstance;
let lastTransactions = [];

const categoriasFixas = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Empréstimo',
  'Cartão de Crédito',
  'Energia',
  'Água',
  'Gás',
  'Internet',
  'Investimento',
  'Outros'
];

const coresCategorias = {
  'Alimentação': '#4A90E2',
  'Transporte': '#2bc47d',
  'Moradia': '#ff3d3d',
  'Lazer': '#ffd700',
  'Saúde': '#ff8a80',
  'Empréstimo': '#e67e22',
  'Cartão de Crédito': '#e74c3c',
  'Energia': '#1abc9c',
  'Água': '#95a5a6',
  'Gás': '#f39c12',
  'Internet': '#16a085',
  'Investimento': '#c0392b',
  'Outros': '#f1c40f'
};

const coresReceita = {
  'Salário': '#4A90E2',
  'Combustível': '#2bc47d',
  'Aluguel': '#ff3d3d',
  'Outros': '#ffd700'
};

/**
 * Cria o gráfico de despesas/receitas por categoria.
 * Deve ser chamado apenas uma vez na inicialização do app.
 */
export function createExpenseChart() {
  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInstance = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
      },
      onClick: chartClickHandler
    }
  });
}

/**
 * Atualiza o gráfico conforme os dados filtrados.
 * @param {Array} transactions - Array de lançamentos (filtrados por mês ou tipo)
 * @param {Array} categories - Array de categorias (despesa ou receita)
 * @param {String} tipo - 'despesa' ou 'receita'
 */
export function updateExpenseChart(transactions, categories, tipo = 'despesa') {
  if (!chartInstance) return;
  lastTransactions = transactions;

  const data = categories.map(cat =>
    transactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
  );

  const paleta = tipo === 'receita' ? coresReceita : coresCategorias;

  chartInstance.data.labels = categories;
  chartInstance.data.datasets[0].data = data;
  chartInstance.data.datasets[0].backgroundColor = categories.map(cat => {
    return paleta[cat] || '#cccccc';
  });

  chartInstance.update();
}

/**
 * Handler para clique em fatia do gráfico.
 * Mostra detalhes dos lançamentos da categoria clicada.
 */
function chartClickHandler(evt, elements) {
  if (!elements.length) return;
  const idx = elements[0].index;
  const cat = chartInstance.data.labels[idx];
  const filtered = lastTransactions.filter(t => t.category === cat);
  if (typeof window.showChartDetails === "function") {
    window.showChartDetails(cat, filtered);
  }
}
