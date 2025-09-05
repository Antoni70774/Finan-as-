import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
  const temaSalvo = localStorage.getItem('tema');
  if (temaSalvo === 'dark') document.body.classList.add('dark-theme');

  // Elementos da interface
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const addButton = document.getElementById('add-transaction-btn');
  const transactionModal = document.getElementById('transaction-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const transactionForm = document.getElementById('transaction-form');
  const typeExpenseBtn = document.getElementById('type-expense-btn');
  const typeIncomeBtn = document.getElementById('type-income-btn');
  const transactionTypeInput = document.getElementById('transaction-type');
  const categorySelect = document.getElementById('category');
  const transactionModalTitle = document.getElementById('transaction-modal-title');
  const transactionIdInput = document.getElementById('transaction-id');
  const deleteTransactionBtn = document.getElementById('delete-transaction-btn');
  const perfilTrigger = document.querySelector('.profile-trigger');
  const menuBotao = document.getElementById('menu-botao');
  const menuFlutuante = document.getElementById('menu-perfil');

  menuBotao.addEventListener('click', () => {
    menuFlutuante.style.display =
      menuFlutuante.style.display === 'none' ? 'block' : 'none';
  });

  const transBtn = document.getElementById("transBtn");
  const transContainer = document.getElementById("transContainer");
  const perfBtn = document.getElementById("perfBtn");
  const perfContainer = document.getElementById("perfContainer");

  if (transBtn && transContainer && perfBtn && perfContainer) {
    transBtn.addEventListener("click", () => {
      transContainer.style.display = "block";
      perfContainer.style.display = "none";
    });

    perfBtn.addEventListener("click", () => {
      transContainer.style.display = "none";
      perfContainer.style.display = "block";
    });
  }

  const addGoalBtn = document.getElementById('add-goal-btn');
  const goalModal = document.getElementById('goal-modal');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');
  const goalForm = document.getElementById('goal-form');
  const goalList = document.getElementById('goal-list');
  const userButtons = document.querySelectorAll('.user-buttons button');
  const currentUserNameEl = document.getElementById('current-user-name');
  const exportDataBtn = document.getElementById('export-data-btn');
  const chartBtns = document.querySelectorAll('.chart-btn');
  const chartTitle = document.getElementById('chart-title');

  const addPayableBtn = document.getElementById('add-payable-btn');
  const payableModal = document.getElementById('payable-modal');
  const cancelPayableBtn = document.getElementById('cancel-payable-btn');
  const payableForm = document.getElementById('payable-form');
  const payableList = document.getElementById('payable-list');

  // Estado global
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    payables: JSON.parse(localStorage.getItem('payables')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Bem Vindo',
    users: ['Esposo', 'Esposa'],
    currentDate: new Date(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
    chartType: 'all'
  };

  createExpenseChart();
  setCurrentDate();
  updateAll();
  registerServiceWorker();

  // Navegação entre páginas
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageId = item.getAttribute('data-page');
      navigateToPage(pageId);
    });
  });

  function navigateToPage(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) selectedPage.classList.add('active');

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-page') === pageId) item.classList.add('active');
    });

    const titles = {
      'dashboard-page': 'Visão Geral',
      'goals-page': 'Metas Pessoais',
      'payables-page': 'Despesas a Pagar',
      'resumo-mensal-page': 'Resumo Mensal',
      'resumo-anual-page': 'Resumo Anual',
      'profile-page': 'Perfil',
      'config-page': 'Configurações',
      'ajuda-page': 'Ajuda'
    };

    document.querySelector('.app-header h1').textContent = titles[pageId] || 'Visão Geral';

    if (pageId === 'payables-page') renderPayables();
    if (pageId === 'dashboard-page') {
      carregarResumoMensal();
      atualizarNomeDoMes();
    }
  }

  // Modal de transações
  addButton.addEventListener('click', () => {
    transactionModal.style.display = 'block';
    transactionModalTitle.textContent = 'Nova Transação';
    transactionForm.reset();
    transactionIdInput.value = '';
    deleteTransactionBtn.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    transactionModal.style.display = 'none';
  });

  typeExpenseBtn.addEventListener('click', () => {
    transactionTypeInput.value = 'despesa';
    categorySelect.innerHTML = '';
    state.expenseCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  });

  typeIncomeBtn.addEventListener('click', () => {
    transactionTypeInput.value = 'receita';
    categorySelect.innerHTML = '';
    state.incomeCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  });

  transactionForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = transactionIdInput.value;
    const tipo = transactionTypeInput.value;
    const categoria = categorySelect.value;
    const valor = parseFloat(document.getElementById('amount').value);
    const descricao = document.getElementById('description').value;
    const data = document.getElementById('date').value;

    if (id) {
      const index = state.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        state.transactions[index] = { id, tipo, categoria, valor, descricao, data };
      }
    } else {
      const novaTransacao = {
        id: Date.now().toString(),
        tipo,
        categoria,
        valor,
        descricao,
        data
      };
      state.transactions.push(novaTransacao);
    }

    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    transactionModal.style.display = 'none';
    updateAll();
  });

  deleteTransactionBtn.addEventListener('click', () => {
    const id = transactionIdInput.value;
    state.transactions = state.transactions.filter(t => t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    transactionModal.style.display = 'none';
    updateAll();
  });

  // Modal de metas
  addGoalBtn.addEventListener('click', () => {
    goalModal.style.display = 'block';
    goalForm.reset();
  });

  cancelGoalBtn.addEventListener('click', () => {
    goalModal.style.display = 'none';
  });

  goalForm.addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('goal-name').value;
    const valor = parseFloat(document.getElementById('goal-amount').value);
    const novaMeta = { id: Date.now().toString(), nome, valor };
    state.goals.push(novaMeta);
    localStorage.setItem('goals', JSON.stringify(state.goals));
    goalModal.style.display = 'none';
    renderGoals();
  });

  // Modal de contas a pagar
  addPayableBtn.addEventListener('click', () => {
    payableModal.style.display = 'block';
    payableForm.reset();
  });

  cancelPayableBtn.addEventListener('click', () => {
    payableModal.style.display = 'none';
  });

  payableForm.addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('payable-name').value;
    const valor = parseFloat(document.getElementById('payable-amount').value);
    const novaDespesa = { id: Date.now().toString(), nome, valor };
    state.payables.push(novaDespesa);
    localStorage.setItem('payables', JSON.stringify(state.payables));
    payableModal.style.display = 'none';
    renderPayables();
  });

  function carregarResumoMensal() {
  const mesAtual = state.currentDate.getMonth();
  const anoAtual = state.currentDate.getFullYear();

  const transacoesDoMes = state.transactions.filter(t => {
    const data = new Date(t.date);
    return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
  });

  const receita = transacoesDoMes
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const despesa = transacoesDoMes
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = receita - despesa;

  document.getElementById("monthly-revenue").textContent = formatCurrency(receita);
  document.getElementById("monthly-expense").textContent = formatCurrency(despesa);
  document.getElementById("monthly-balance").textContent = formatCurrency(saldo);
}

function atualizarNomeDoMes() {
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const mes = meses[state.currentDate.getMonth()];
  const ano = state.currentDate.getFullYear();
  document.getElementById("mes-atual").textContent = `${mes} de ${ano}`;
}

function abrirResumoMensal() {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById('resumo-mensal-page').classList.add('active');
  menuFlutuante.style.display = 'none';
  carregarResumoMensal();
  atualizarNomeDoMes();
  atualizarGraficoMensal();
}

document.getElementById('resumo-prev-month').addEventListener('click', () => {
  state.currentDate.setMonth(state.currentDate.getMonth() - 1);
  carregarResumoMensal();
  atualizarNomeDoMes();
  atualizarGraficoMensal();
});

document.getElementById('resumo-next-month').addEventListener('click', () => {
  state.currentDate.setMonth(state.currentDate.getMonth() + 1);
  carregarResumoMensal();
  atualizarNomeDoMes();
  atualizarGraficoMensal();
});

function atualizarGraficoMensal() {
  const ctx = document.getElementById('monthly-bar-chart').getContext('2d');
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const receitas = Array(12).fill(0);
  const despesas = Array(12).fill(0);

  state.transactions.forEach(t => {
    const data = new Date(t.date);
    const mes = data.getMonth();
    if (data.getFullYear() === state.currentDate.getFullYear()) {
      if (t.type === "income") receitas[mes] += t.amount;
      if (t.type === "expense") despesas[mes] += t.amount;
    }
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        {
          label: 'Receita',
          data: receitas,
          backgroundColor: '#2bc47d'
        },
        {
          label: 'Despesa',
          data: despesas,
          backgroundColor: '#ff3d3d'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function abrirResumoAnual() {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById('resumo-anual-page').classList.add('active');
  menuFlutuante.style.display = 'none';

  const transacoes = state.transactions;
  const receitaTotal = transacoes.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const despesaTotal = transacoes.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const saldoTotal = receitaTotal - despesaTotal;

  document.getElementById("annual-revenue").textContent = formatCurrency(receitaTotal);
  document.getElementById("annual-expense").textContent = formatCurrency(despesaTotal);
  document.getElementById("annual-balance").textContent = formatCurrency(saldoTotal);

  atualizarGraficoAnual();
}

function atualizarGraficoAnual() {
  const ctx = document.getElementById('annual-chart').getContext('2d');
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const receitas = Array(12).fill(0);
  const despesas = Array(12).fill(0);

  state.transactions.forEach(t => {
    const data = new Date(t.date);
    const mes = data.getMonth();
    const ano = data.getFullYear();
    if (ano === state.currentDate.getFullYear()) {
      if (t.type === "income") receitas[mes] += t.amount;
      if (t.type === "expense") despesas[mes] += t.amount;
    }
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        {
          label: 'Receita',
          data: receitas,
          backgroundColor: '#2bc47d'
        },
        {
          label: 'Despesa',
          data: despesas,
          backgroundColor: '#ff3d3d'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function renderGoals() {
  goalList.innerHTML = '';
  if (state.goals.length === 0) {
    goalList.innerHTML = '<p>Nenhuma meta financeira cadastrada.</p>';
    return;
  }

  state.goals.forEach(goal => {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <span class="meta-title">${goal.name}</span>
      <span class="meta-info">Alvo: <strong>${formatCurrency(goal.target)}</strong></span>
      <span class="meta-info">Atual: <strong>${formatCurrency(goal.current)}</strong></span>
      <span class="meta-info">Limite: <strong>${formatDateBR(goal.date)}</strong></span>

      <div class="goal-visual">
        <canvas id="goal-chart-${goal.id}" width="70" height="70"></canvas>
        <p class="monthly-suggestion" id="monthly-${goal.id}"></p>
      </div>

      <div class="goal-actions">
        <button class="btn-secondary" onclick="editGoal('${goal.id}')">Editar</button>
        <button class="btn-danger" onclick="deleteGoal('${goal.id}')">Excluir</button>
      </div>
    `;
    goalList.appendChild(card);

    const restante = goal.target - goal.current;
    const mesesRestantes = Math.max(
      Math.ceil((new Date(goal.date) - new Date()) / (1000 * 60 * 60 * 24 * 30)),
      1
    );
    const sugestao = restante / mesesRestantes;
    document.getElementById(`monthly-${goal.id}`).textContent =
      `Sugestão: R$ ${sugestao.toFixed(2)} por mês`;

    const ctx = document.getElementById(`goal-chart-${goal.id}`).getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Concluído', 'Restante'],
        datasets: [{
          data: [goal.current, restante],
          backgroundColor: ['#4A90E2', '#e0e0e0'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  });
}

function renderPayables() {
  payableList.innerHTML = '';
  if (state.payables.length === 0) {
    payableList.innerHTML = '<p>Nenhuma conta lançada.</p>';
    return;
  }

  state.payables.forEach(p => {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <span class="meta-title">${p.description}</span>
      <span class="meta-info">Categoria: ${p.category}</span>
      <span class="meta-info">Valor: ${formatCurrency(p.amount)}</span>
      <span class="meta-info">Vencimento: ${formatDateBR(p.date)}</span>
      <span class="meta-info">Status: ${p.paid ? '<span style="color:green">Pago</span>' : '<span style="color:red">A pagar</span>'}</span>
      <div class="goal-actions">
        <button class="btn-secondary" onclick="markPayablePaid('${p.id}')">${p.paid ? 'Desfazer' : 'Marcar Pago'}</button>
        <button class="btn-secondary" onclick="editPayable('${p.id}')">Editar</button>
        <button class="btn-danger" onclick="deletePayable('${p.id}')">Excluir</button>
      </div>
    `;
    payableList.appendChild(card);
  });
}

function diasRestantes(dataVencimento) {
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  const diff = vencimento - hoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function verificarContasAVencer() {
  const proximas = state.payables.filter(c => {
    const dias = diasRestantes(c.date);
    return dias >= 0 && dias <= 5;
  });

  const alertCount = document.getElementById('alert-count');
  const alertList = document.getElementById('alert-list');
  const alertIcon = document.getElementById('alert-icon');

  alertCount.textContent = proximas.length;
  alertIcon.classList.toggle('ativo', proximas.length > 0);

  alertList.innerHTML = proximas.length
    ? proximas.map(c => {
        const dataFormatada = formatDateBR(c.date);
        return `<li>${c.description} - vence em ${dataFormatada}</li>`;
      }).join('')
    : "<li>Nenhuma conta próxima do vencimento</li>";
}

function exportarDados() {
  const dados = {
    transacoes: state.transactions,
    metas: state.goals,
    contas: state.payables
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dados-financeiros.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ✅ Helpers de formatação
function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr) {
  return new Date(dateStr + "T03:00:00").toLocaleDateString('pt-BR');
}

// ✅ Ícones por categoria
function getCategoryIcon(category) {
  const icons = {
    'Alimentação': 'restaurant',
    'Transporte': 'directions_bus',
    'Moradia': 'home',
    'Lazer': 'sports_esports',
    'Saúde': 'local_hospital',
    'Empréstimo': 'account_balance',
    'Cartão de Crédito': 'credit_card',
    'Energia': 'bolt',
    'Água': 'water_drop',
    'Gás': 'local_fire_department',
    'Internet': 'wifi',
    'Investimento': 'trending_up',
    'Outros': 'category',
    'Salário': 'attach_money',
    'Combustível': 'local_gas_station',
    'Aluguel': 'business'
  };
  return icons[category] || 'category';
}

// ✅ Dias restantes para vencimento
function diasRestantes(dataVencimento) {
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  const diff = vencimento - hoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ✅ Verifica contas a vencer
function verificarContasAVencer() {
  const proximas = state.payables.filter(c => {
    const dias = diasRestantes(c.date);
    return dias >= 0 && dias <= 5;
  });

  const alertCount = document.getElementById('alert-count');
  const alertList = document.getElementById('alert-list');
  const alertIcon = document.getElementById('alert-icon');

  alertCount.textContent = proximas.length;
  alertIcon.classList.toggle('ativo', proximas.length > 0);

  alertList.innerHTML = proximas.length
    ? proximas.map(c => {
        const dataFormatada = formatDateBR(c.date);
        return `<li>${c.description} - vence em ${dataFormatada}</li>`;
      }).join('')
    : "<li>Nenhuma conta próxima do vencimento</li>";
}

// ✅ Registro do Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registrado:', reg.scope))
        .catch(err => console.warn('Falha ao registrar Service Worker:', err));
    });
  }
}

// ✅ Integração bancária (placeholder)
window.connectBank = async function(bankName) {
  try {
    alert(`Integração com ${bankName} em desenvolvimento. Em breve estará disponível.`);
  } catch (error) {
    console.error('Erro na conexão:', error);
    alert(`Não foi possível conectar ao ${bankName}. Tente novamente mais tarde.`);
  }
};

    // Funções globais para navegação e ações
    window.abrirResumoMensal = abrirResumoMensal;
    window.abrirResumoAnual = abrirResumoAnual;
    window.abrirPagina = abrirPagina;
    window.abrirConfig = abrirConfig;
    window.exportarDados = exportarDados;
    window.trocarTema = trocarTema;
    window.resetarApp = resetarApp;

    // Integração bancária simulada
    window.connectBank = async function(bankName) {
      try {
        alert(`Integração com ${bankName} em desenvolvimento. Em breve estará disponível.`);
      } catch (error) {
        console.error('Erro na conexão:', error);
        alert(`Não foi possível conectar ao ${bankName}. Tente novamente mais tarde.`);
      }
    };

    // Inicializa alertas ao carregar
    verificarContasAVencer();

    // Atualiza interface do usuário
    updateUserUI();

    // Atualiza tudo ao iniciar
    updateAll();
});
  
