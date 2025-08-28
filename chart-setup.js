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

const coresCategorias = [
  '#4A90E2', // Alimentação
  '#2bc47d', // Transporte
  '#ff3d3d', // Moradia
  '#ffd700', // Lazer
  '#ff8a80', // Saúde
  '#e67e22', // Empréstimo
  '#e74c3c', // Cartão de Crédito
  '#1abc9c', // Energia
  '#95a5a6', // Água
  '#f39c12', // Gás
  '#16a085', // Internet
  '#c0392b', // Investimento
  '#f1c40f'  // Outros
];

/**
 * Cria o gráfico de despesas/receitas por categoria.
 * Deve ser chamado apenas uma vez na inicialização do app.
 */
export function createExpenseChart() {
  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInstance = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categoriasFixas,
      datasets: [{
        data: new Array(categoriasFixas.length).fill(0), // inicia com 0
        backgroundColor: coresCategorias,
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
 * Não perde dados já lançados - só atualiza a visualização.
 * @param {Array} transactions - Array de lançamentos (filtrados por mês ou tipo)
 * @param {Array} categories - Array de categorias (despesa ou receita)
 */
export function updateExpenseChart(transactions, categories) {
  if (!chartInstance) return;
  lastTransactions = transactions;

  const data = categories.map(cat =>
    transactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
  );

  chartInstance.data.labels = categories;
  chartInstance.data.datasets[0].data = data;
  chartInstance.data.datasets[0].backgroundColor = categories.map(cat => {
    const idx = categoriasFixas.indexOf(cat);
    return coresCategorias[idx] || '#cccccc';
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
