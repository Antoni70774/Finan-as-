// --- app.js ---
// [Auth Guard] Firebase Authentication (exige login antes de iniciar o app)
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

// Config do Firebase (mesma do login.html)
const firebaseConfig = {
  apiKey: "AIzaSyBQeYc0Y-eYONv3ZfvZoJEzOjoKR371P-Y",
  authDomain: "controle-financeiro-65744.firebaseapp.com",
  projectId: "controle-financeiro-65744",
  storageBucket: "controle-financeiro-65744.firebasestorage.app",
  messagingSenderId: "587527394934",
  appId: "1:587527394934:web:c142740ef0139a5cf63157",
  measurementId: "G-RT2T1HNV4G"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Aguarda DOM e valida autenticação antes de iniciar
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    startApp();
  });
});

function startApp() {
  // Tema salvo
  const temaSalvo = localStorage.getItem('tema');
  if (temaSalvo === 'dark') document.body.classList.add('dark-theme');

  // Elementos da UI
  const navItems            = document.querySelectorAll('.nav-item');
  const pages               = document.querySelectorAll('.page');
  const addButton           = document.getElementById('add-transaction-btn');
  const transactionModal    = document.getElementById('transaction-modal');
  const cancelBtn           = document.getElementById('cancel-btn');
  const transactionForm     = document.getElementById('transaction-form');
  const typeExpenseBtn      = document.getElementById('type-expense-btn');
  const typeIncomeBtn       = document.getElementById('type-income-btn');
  const transactionTypeInput= document.getElementById('transaction-type');
  const categorySelect      = document.getElementById('category');
  const transactionModalTitle  = document.getElementById('transaction-modal-title');
  const transactionIdInput  = document.getElementById('transaction-id');
  const deleteTransactionBtn= document.getElementById('delete-transaction-btn');
  const menuBotao           = document.getElementById('menu-botao');
  const menuFlutuante       = document.getElementById('menu-perfil');

  const addGoalBtn          = document.getElementById('add-goal-btn');
  const goalModal           = document.getElementById('goal-modal');
  const cancelGoalBtn       = document.getElementById('cancel-goal-btn');
  const goalForm            = document.getElementById('goal-form');
  const goalList            = document.getElementById('goal-list');

  const currentUserNameEl   = document.getElementById('current-user-name');
  const exportDataBtn       = document.getElementById('export-data-btn');
  const chartBtns           = document.querySelectorAll('.chart-btn');
  const chartTitle          = document.getElementById('chart-title');

  // Payables
  const addPayableBtn       = document.getElementById('add-payable-btn');
  const payableModal        = document.getElementById('payable-modal');
  const cancelPayableBtn    = document.getElementById('cancel-payable-btn');
  const payableForm         = document.getElementById('payable-form');
  const payableList         = document.getElementById('payable-list');

  // STATE MANAGEMENT
  const state = {
    transactions:    JSON.parse(localStorage.getItem('transactions')) || [],
    goals:           JSON.parse(localStorage.getItem('goals'))        || [],
    payables:        JSON.parse(localStorage.getItem('payables'))     || [],
    currentUser:     localStorage.getItem('currentUser')              || 'Bem Vindo',
    currentDate:     new Date(),
    expenseCategories: [
      'Alimentação','Transporte','Moradia','Lazer','Saúde',
      'Empréstimo','Cartão de Crédito','Energia','Água',
      'Gás','Internet','Investimento','Outros'
    ],
    incomeCategories: ['Salário','Combustível','Aluguel','Outros'],
    chartType:       'all' // all | expense | income
  };  // ← aqui fecha o objeto state

  // -----------------------------
  // 📄 Atualiza a UI da Página Perfil
  // -----------------------------
  document.getElementById('perfil-usuario').textContent =
    auth.currentUser.displayName || 'Sem nome';
  document.getElementById('perfil-email').textContent =
    auth.currentUser.email;

  const bancoSalvo = localStorage.getItem('bancoConectado') || 'Nenhum';
  document.getElementById('perfil-banco').textContent = bancoSalvo;

  document.getElementById('btn-logout')
    .addEventListener('click', async () => {
      await auth.signOut();
      window.location.href = 'login.html';
    });

  const toggle = document.getElementById('toggle-theme');
  toggle.checked = document.body.classList.contains('dark-theme');
  toggle.addEventListener('change', trocarTema);

  document.getElementById('btn-change-password')
    .addEventListener('click', async () => {
      const nova = prompt('Digite sua nova senha:');
      if (!nova) return;
      try {
        await auth.currentUser.updatePassword(nova);
        alert('Senha alterada com sucesso!');
      } catch (e) {
        alert('Erro ao alterar senha: ' + e.message);
      }
    });

    // Inicialização do resto do app
  createExpenseChart();
  setCurrentDate();
  updateAll();
  registerServiceWorker();

  // Menu lateral toggle
  menuBotao.addEventListener('click', () => {
    menuFlutuante.style.display =
      menuFlutuante.style.display === 'none' ? 'block' : 'none';
  });

  // -----------------------------
  // Navegação de meses (Dashboard)
  // -----------------------------
  document.getElementById('prev-month')
    .addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month')
    .addEventListener('click', () => changeMonth(1));

  // Função auxiliar para trocar mês e re-renderizar
  function changeMonth(direction) {
    state.currentDate.setMonth(
      state.currentDate.getMonth() + direction
    );
    updateAll();
  }

  // Ajusta o campo <input type="date"> para hoje
  function setCurrentDate() {
    const today = new Date();
    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.value = today.toISOString().split('T')[0];
  }

// fecha startApp()
}

  // Navegação páginas
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
      'menu-page': 'Menu',
      'resumo-anual-page': 'Resumo Anual',
      'config-page': 'Configurações'
    };
    const header = document.querySelector('.app-header h1');
    if (header) header.textContent = titles[pageId] || 'Visão Geral';

    if (pageId === 'payables-page') renderPayables();
    if (pageId === 'dashboard-page') {
      carregarResumoMensal();
      atualizarNomeDoMes();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.getAttribute('data-page');
      if (pageId) navigateToPage(pageId);
    });
  });

  // Modal helpers
  function openModal(modal) { modal.classList.add('active'); }
  function closeModal(modal) { modal.classList.remove('active'); }

  // Modal Transação - abrir
  addButton.addEventListener('click', () => {
    openTransactionModal();
  });

  // [NOVO] Fecha modal de transação de forma robusta
  function closeTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('active');
    const form = document.getElementById('transaction-form');
    if (form) form.reset();
  }

  // Botão cancelar do modal
  cancelBtn.addEventListener('click', closeTransactionModal);

  // Deletar transação
  deleteTransactionBtn.addEventListener('click', () => {
    const id = transactionIdInput.value;
    if (!id) return;
    if (confirm("Deseja excluir esta transação?")) {
      state.transactions = state.transactions.filter(t => t.id !== id);
      localStorage.setItem('transactions', JSON.stringify(state.transactions));
      saveAndRerender();
      closeTransactionModal();
    }
  });

  // Ações de página do menu lateral
  function abrirPagina(paginaId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(paginaId).classList.add('active');
    menuFlutuante.style.display = 'none';
  }

  function abrirResumoAnual() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('resumo-anual-page').classList.add('active');
    menuFlutuante.style.display = 'none';

    const transacoes = state.transactions;
    const receitaTotal = transacoes.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const despesaTotal = transacoes.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const saldoTotal = receitaTotal - despesaTotal;

    document.getElementById("annual-revenue").textContent = receitaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("annual-expense").textContent = despesaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("annual-balance").textContent = saldoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    atualizarGraficoAnual();
  }

  let annualChart = null;
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

    if (annualChart) annualChart.destroy();

    annualChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [
          { label: 'Receita', data: receitas, backgroundColor: '#2bc47d' },
          { label: 'Despesa', data: despesas, backgroundColor: '#ff3d3d' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
  }

  function abrirConfig() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('config-page').classList.add('active');
    menuFlutuante.style.display = 'none';
  }

  // Resumo mensal
  function carregarResumoMensal() {
    const mesAtual = state.currentDate.getMonth();
    const anoAtual = state.currentDate.getFullYear();

    const transacoesDoMes = state.transactions.filter(t => {
      const data = new Date(t.date);
      return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });

    const receita = transacoesDoMes.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const despesa = transacoesDoMes.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const saldo = receita - despesa;

    document.getElementById("monthly-revenue").textContent = receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("monthly-expense").textContent = despesa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("monthly-balance").textContent = saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

  // Fecha menu ao clicar fora
  document.addEventListener("click", function (event) {
    const menu = document.getElementById("menu-perfil");
    const botaoMenu = document.getElementById("menu-botao");
    const menuVisivel = menu.style.display === "block";
    if (menuVisivel && !menu.contains(event.target) && !botaoMenu.contains(event.target)) {
      menu.style.display = "none";
    }
  });

  // Navegação no resumo mensal
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
          { label: 'Receita', data: receitas, backgroundColor: '#2bc47d' },
          { label: 'Despesa', data: despesas, backgroundColor: '#ff3d3d' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
  }

  // Exportar / Tema / Reset
  function exportarDados() {
    const dados = { transacoes: state.transactions, metas: state.goals, contas: state.payables };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados-financeiros.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function trocarTema() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('tema', isDark ? 'dark' : 'light');
  }

  function resetarApp() {
    if (confirm("Tem certeza que deseja resetar o aplicativo? Todos os dados serão apagados.")) {
      localStorage.clear();
      location.reload();
    }
  }

  // Alerta de contas a vencer (ícone do sino)
  window.abrirAlerta = function () {
    document.getElementById('alert-modal').classList.add('active');
  };

  window.fecharAlerta = function () {
    document.getElementById('alert-modal').classList.remove('active');
  };

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
        const dataFormatada = new Date(c.date).toLocaleDateString('pt-BR');
        return `<li>${c.description} - vence em ${dataFormatada}</li>`;
      }).join('')
      : "<li>Nenhuma conta próxima do vencimento</li>";
  }

  verificarContasAVencer();

  // Payables form
  payableForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('payable-id').value || Date.now().toString();
    const payable = {
      id,
      description: document.getElementById('payable-description').value,
      category: document.getElementById('payable-category').value,
      amount: parseFloat(document.getElementById('payable-amount').value),
      date: document.getElementById('payable-date').value,
      paid: false
    };

    const duplicada = state.payables.some(p =>
      p.description === payable.description &&
      p.date === payable.date &&
      p.amount === payable.amount &&
      p.category === payable.category &&
      p.id !== id
    );
    if (duplicada) {
      alert('Essa conta já foi lançada.');
      return;
    }

    const index = state.payables.findIndex(p => p.id === id);
    if (index > -1) {
      state.payables[index] = payable;
    } else {
      state.payables.push(payable);
    }

    localStorage.setItem('payables', JSON.stringify(state.payables));
    renderPayables();
    verificarContasAVencer();
    closeModal(payableModal);
  });

  // Botão "Nova Conta"
  addPayableBtn.addEventListener('click', () => {
    document.getElementById('payable-id').value = '';
    document.getElementById('payable-form').reset();
    openModal(payableModal);
  });

  // Form transação (novo/editar)
  transactionForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = transactionIdInput.value;
    const type = transactionTypeInput.value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const category = categorySelect.value;
    const date = document.getElementById('date').value;
    const user = state.currentUser;

    if (!amount || !description || !category || !date) {
      alert('Preencha todos os campos');
      return;
    }

    if (id) {
      const idx = state.transactions.findIndex(t => t.id === id);
      if (idx > -1) {
        state.transactions[idx] = { id, type, amount, description, category, date, user };
      }
    } else {
      state.transactions.push({
        id: crypto.randomUUID(),
        type,
        amount,
        description,
        category,
        date,
        user
      });
    }
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    saveAndRerender();
    closeTransactionModal();
  });

  // Tipo de transação
  typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
  typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));

  function setTransactionType(type) {
    transactionTypeInput.value = type;
    typeExpenseBtn.classList.toggle('active', type === 'expense');
    typeIncomeBtn.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }

  function updateCategoryOptions(type) {
    categorySelect.innerHTML = '';
    const cats = type === 'expense' ? state.expenseCategories : state.incomeCategories;
    cats.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }

  // Abrir modal transação (edição/novo)
  function openTransactionModal(transaction = null) {
    transactionForm.reset();
    setCurrentDate();
    transactionIdInput.value = '';
    deleteTransactionBtn.style.display = 'none';
    transactionModalTitle.textContent = transaction ? 'Editar Transação' : 'Nova Transação';
    if (transaction) {
      transactionTypeInput.value = transaction.type;
      setTransactionType(transaction.type);
      document.getElementById('amount').value = transaction.amount;
      document.getElementById('description').value = transaction.description;
      categorySelect.value = transaction.category;
      document.getElementById('date').value = transaction.date;
      transactionIdInput.value = transaction.id;
      deleteTransactionBtn.style.display = 'inline-block';
    } else {
      setTransactionType('expense');
    }
    openModal(transactionModal);
  }

  // Chart filter
  chartBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chartBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.chartType = btn.getAttribute('data-type');
      updateAll();
    });
  });

  // Persistência e render
  function saveAndRerender() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    localStorage.setItem('payables', JSON.stringify(state.payables));
    updateAll();
  }

  function updateAll() {
    const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);

    let transactionsForDisplay = monthFiltered;
    if (state.chartType === 'expense') {
      transactionsForDisplay = monthFiltered.filter(t => t.type === 'expense');
    } else if (state.chartType === 'income') {
      transactionsForDisplay = monthFiltered.filter(t => t.type === 'income');
    }

    renderSummary(monthFiltered);
    renderTransactionList(transactionsForDisplay);
    updateMainChart(monthFiltered);
    renderGoals();
    renderPayables();
    updateMonthDisplay();
    updateUserUI();
  }

  function filterTransactionsByMonth(transactions, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return transactions.filter(t => {
      const tDate = new Date(t.date + "T03:00:00");
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  }

  function updateMainChart(transactions) {
    let cats = state.expenseCategories;
    let filtered = transactions;
    let title = 'Movimentação por Categoria';

    if (state.chartType === 'expense') {
      filtered = transactions.filter(t => t.type === 'expense');
      cats = state.expenseCategories;
      title = 'Despesas por Categoria';
    } else if (state.chartType === 'income') {
      filtered = transactions.filter(t => t.type === 'income');
      cats = state.incomeCategories;
      title = 'Receitas por Categoria';
    }

    updateExpenseChart(filtered, cats);
    chartTitle.textContent = title;

    renderCategorySummary(filtered);
  }

  function renderCategorySummary(transactions) {
    const container = document.getElementById('category-summary');
    if (!container) return;

    container.innerHTML = '';

    const summary = {};
    transactions.forEach(t => {
      if (!summary[t.category]) summary[t.category] = { total: 0, type: t.type };
      summary[t.category].total += t.amount;
    });

    Object.entries(summary).forEach(([category, data]) => {
      const icon = getCategoryIcon(category);
      const card = document.createElement('div');
      card.className = `category-card ${data.type}`;
      card.innerHTML = `
        <div class="category-icon">
          <span class="material-icons-sharp">${icon}</span>
        </div>
        <div class="category-info">
          <span class="category-name">${category}</span>
          <span class="category-amount">R$ ${data.total.toFixed(2)}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

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

  function renderTransactionList(transactions) {
    const listEl = document.getElementById('transaction-list');
    listEl.innerHTML = '';
    if (transactions.length === 0) {
      listEl.innerHTML = '<li>Nenhuma transação neste filtro.</li>';
      return;
    }
    const sorted = [...transactions].sort((a, b) => new Date(b.date + "T03:00:00") - new Date(a.date + "T03:00:00"));
    sorted.forEach(t => {
      const item = document.createElement('li');
      item.className = 'transaction-item';
      item.dataset.id = t.id;
      const isIncome = t.type === 'income';
      const date = formatDateBR(t.date);
      item.innerHTML = `
        <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
          <span class="material-icons-sharp">${isIncome ? 'arrow_upward' : 'arrow_downward'}</span>
        </div>
        <div class="transaction-details">
          <p>${t.description}</p>
          <span>${t.category} • ${date}</span>
        </div>
        <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
        </div>
      `;
      item.addEventListener('click', () => openTransactionModal(t));
      listEl.appendChild(item);
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
          <button class="btn-danger" onclick="window.deleteGoal && deleteGoal('${goal.id}')">Excluir</button>
        </div>
      `;
      goalList.appendChild(card);

      const restante = goal.target - goal.current;
      const mesesRestantes = Math.max(Math.ceil((new Date(goal.date) - new Date()) / (1000 * 60 * 60 * 24 * 30)), 1);
      const sugestao = restante / mesesRestantes;
      document.getElementById(`monthly-${goal.id}`).textContent = `Sugestão: R$ ${sugestao.toFixed(2)} por mês`;

      const ctx = document.getElementById(`goal-chart-${goal.id}`).getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Concluído', 'Restante'], datasets: [{ data: [goal.current, restante], backgroundColor: ['#4A90E2', '#e0e0e0'], borderWidth: 0 }] },
        options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
      });
    });
  }

  window.deleteGoal = function (goalId) {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      state.goals = state.goals.filter(g => g.id !== goalId);
      saveAndRerender();
    }
  };

  function renderPayables() {
    payableList.innerHTML = '';
    if (state.payables.length === 0) {
      payableList.innerHTML = '<p>Nenhuma conta lançada.</p>';
      return;
    }
    state.payables.forEach(p => {
      payableList.innerHTML += `
        <div class="goal-card">
          <span class="meta-title">${p.description}</span>
          <span class="meta-info">Categoria: ${p.category}</span>
          <span class="meta-info">Valor: ${formatCurrency(p.amount)}</span>
          <span class="meta-info">Vencimento: ${formatDateBR(p.date)}</span>
          <span class="meta-info">Status: ${p.paid ? '<span style="color:green">Pago</span>' : '<span style="color:red">A pagar</span>'}</span>
          <div class="goal-actions">
            <button class="btn-secondary" onclick="window.markPayablePaid('${p.id}')">${p.paid ? 'Desfazer' : 'Marcar Pago'}</button>
            <button class="btn-secondary" onclick="window.editPayable('${p.id}')">Editar</button>
            <button class="btn-danger" onclick="window.deletePayable('${p.id}')">Excluir</button>
          </div>
        </div>
      `;
    });
  }

  window.markPayablePaid = function (id) {
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) {
      state.payables[idx].paid = !state.payables[idx].paid;
      localStorage.setItem('payables', JSON.stringify(state.payables));
      renderPayables();
    }
  };

  window.deletePayable = function (id) {
    if (confirm('Excluir esta conta?')) {
      state.payables = state.payables.filter(p => p.id !== id);
      localStorage.setItem('payables', JSON.stringify(state.payables));
      renderPayables();
    }
  };

  window.editPayable = function (id) {
    const payable = state.payables.find(p => p.id === id);
    if (!payable) return;
    openPayableModal(payable);
  };

  function openPayableModal(payable = null) {
    payableForm.reset();
    document.getElementById('payable-id').value = '';
    document.getElementById('payable-modal-title').textContent = payable ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar';
    if (payable) {
      document.getElementById('payable-id').value = payable.id;
      document.getElementById('payable-description').value = payable.description;
      document.getElementById('payable-category').value = payable.category;
      document.getElementById('payable-amount').value = payable.amount;
      document.getElementById('payable-date').value = payable.date;
    }
    openModal(payableModal);
  }

  // Helpers
  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDateBR(dateStr) {
    return new Date(dateStr + "T03:00:00").toLocaleDateString('pt-BR');
  }

  function renderSummary(transactions) {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    document.getElementById('month-income').textContent = formatCurrency(income);
    document.getElementById('month-expense').textContent = formatCurrency(expense);
    document.getElementById('month-balance').textContent = formatCurrency(balance);
    document.getElementById('month-balance').style.color = balance >= 0 ? 'var(--text-light)' : '#ff8a80';
  }

  function updateMonthDisplay() {
    document.getElementById('current-month-year').textContent =
      state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function updateUserUI() {
    currentUserNameEl.textContent = state.currentUser;
    const userButtons = document.querySelectorAll('.user-buttons button');
    userButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.user === state.currentUser);
    });
  }

  // Metas
  goalForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const goalId = document.getElementById('goal-id').value;
    const goalData = {
      name: document.getElementById('goal-name').value,
      target: parseFloat(document.getElementById('goal-target').value),
      current: parseFloat(document.getElementById('goal-current').value),
      date: document.getElementById('goal-date').value
    };

    if (!goalData.name || !goalData.target || isNaN(goalData.current)) {
      alert('Por favor, preencha todos os campos corretamente');
      return;
    }

    if (goalId) {
      const index = state.goals.findIndex(g => g.id === goalId);
      if (index !== -1) {
        state.goals[index] = { ...state.goals[index], ...goalData };
      }
    } else {
      state.goals.push({ id: Date.now().toString(), ...goalData });
    }

    saveAndRerender();
    closeGoalModal();
  });

  document.getElementById('delete-goal-btn').addEventListener('click', function () {
    const goalId = document.getElementById('goal-id').value;
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      state.goals = state.goals.filter(g => g.id !== goalId);
      saveAndRerender();
      closeModal(goalModal);
    }
  });

  window.editGoal = function (goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;
    document.getElementById('goal-id').value = goal.id;
    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-target').value = goal.target;
    document.getElementById('goal-current').value = goal.current;
    document.getElementById('goal-date').value = goal.date;
    document.getElementById('goal-modal-title').textContent = 'Editar Meta';
    document.getElementById('delete-goal-btn').style.display = 'block';
    openModal(goalModal);
  };

  window.closeGoalModal = function () {
    closeModal(goalModal);
    goalForm.reset();
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
    document.getElementById('delete-goal-btn').style.display = 'none';
  };

  // Export, tema, reset no escopo global
  window.abrirResumoMensal = abrirResumoMensal;
  window.abrirResumoAnual = abrirResumoAnual;
  window.abrirPagina = abrirPagina;
  window.abrirConfig = abrirConfig;
  window.exportarDados = exportarDados;
  window.trocarTema = trocarTema;
  window.resetarApp = resetarApp;

  // Service Worker
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  }
}
