// --- app.js ---
import firebaseConfig from './firebase-config.js'; // Importa o arquivo de configuração
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

// Inicialização do Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Estado global do app
const state = {
  transactions: [],
  goals: [],
  payables: [],
  currentUser: 'Carregando...',
  currentDate: new Date(),
  expenseCategories: [
    'Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde',
    'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água',
    'Gás', 'Internet', 'Investimento', 'Outros'
  ],
  incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
  chartType: 'all' // all | expense | income
};

// Referências aos elementos do DOM
let currentUserNameEl;

// Aguarda DOM e valida autenticação antes de iniciar
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    state.currentUser = user.displayName || user.email;
    startApp();
  });
});

async function startApp() {
  // Inicialização do app
  currentUserNameEl = document.getElementById('current-user-name');
  createExpenseChart();
  setCurrentDate();
  fetchAndRenderData();
  registerServiceWorker();

  // Menu lateral toggle
  document.getElementById('menu-botao').addEventListener('click', () => {
    const menuFlutuante = document.getElementById('menu-perfil');
    if (menuFlutuante) menuFlutuante.style.display = menuFlutuante.style.display === 'none' ? 'block' : 'none';
  });

  // Fecha menu ao clicar fora
  document.addEventListener("click", function (event) {
    const menu = document.getElementById("menu-perfil");
    const botaoMenu = document.getElementById("menu-botao");
    const menuVisivel = menu.style.display === "block";
    if (menuVisivel && !menu.contains(event.target) && !botaoMenu.contains(event.target)) {
      menu.style.display = "none";
    }
  });

  // Navegação de meses (Dashboard)
  document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

  function changeMonth(direction) {
    state.currentDate.setMonth(state.currentDate.getMonth() + direction);
    updateAll();
  }

  function setCurrentDate() {
    const today = new Date();
    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.value = today.toISOString().split('T')[0];
  }

  // --- NAVEGAÇÃO CENTRALIZADA ---
  const titles = {
    'dashboard-page': 'Visão Geral',
    'goals-page': 'Metas Pessoais',
    'payables-page': 'Despesas a Pagar',
    'profile-page': 'Meu Perfil',
    'resumo-mensal-page': 'Resumo Mensal',
    'resumo-anual-page': 'Resumo Anual',
    'config-page': 'Configurações'
  };

  function navigateToPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) selectedPage.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-page') === pageId) item.classList.add('active');
    });

    const header = document.querySelector('.app-header h1');
    if (header) header.textContent = titles[pageId] || 'Visão Geral';
    if (pageId === 'resumo-anual-page') atualizarResumoAnual();
    if (pageId === 'resumo-mensal-page') {
      carregarResumoMensal();
      atualizarNomeDoMes();
    }
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.getAttribute('data-page');
      if (pageId) navigateToPage(pageId);
      const menuFlutuante = document.getElementById('menu-perfil');
      if (menuFlutuante) menuFlutuante.style.display = 'none';
    });
  });

  // Funções Globais para o HTML
  window.navigateToPage = navigateToPage;
  window.abrirResumoMensal = () => navigateToPage('resumo-mensal-page');
  window.abrirResumoAnual = () => navigateToPage('resumo-anual-page');
  window.abrirPagina = (pageId) => navigateToPage(pageId);
  window.abrirConfig = () => navigateToPage('config-page');
  window.abrirAlerta = () => { document.getElementById('alert-modal').classList.add('active'); };
  window.fecharAlerta = () => { document.getElementById('alert-modal').classList.remove('active'); };
  window.exportarDados = exportarDados;
  window.trocarTema = trocarTema;
  window.resetarApp = resetarApp;
  window.markPayablePaid = markPayablePaid;
  window.editPayable = editPayable;
  window.deletePayable = deletePayable;
  window.editGoal = editGoal;
  window.deleteGoal = deleteGoal;
  window.closeGoalModal = closeGoalModal;

  // Modal helpers
  function openModal(modal) { modal.classList.add('active'); }
  function closeModal(modal) { modal.classList.remove('active'); }

  // Modal Transação - abrir
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
  const addGoalBtn = document.getElementById('add-goal-btn');
  const goalModal = document.getElementById('goal-modal');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');
  const goalForm = document.getElementById('goal-form');
  const goalList = document.getElementById('goal-list');
  const addPayableBtn = document.getElementById('add-payable-btn');
  const payableModal = document.getElementById('payable-modal');
  const cancelPayableBtn = document.getElementById('cancel-payable-btn');
  const payableForm = document.getElementById('payable-form');
  const payableList = document.getElementById('payable-list');
  const chartBtns = document.querySelectorAll('.chart-btn');
  const chartTitle = document.getElementById('chart-title');

  addButton.addEventListener('click', () => {
    openTransactionModal();
  });

  function closeTransactionModal() {
    if (transactionModal) transactionModal.classList.remove('active');
    if (transactionForm) transactionForm.reset();
  }
  cancelBtn.addEventListener('click', closeTransactionModal);

  // Deletar transação
  deleteTransactionBtn.addEventListener('click', () => {
    const id = transactionIdInput.value;
    if (!id) return;
    if (confirm("Deseja excluir esta transação?")) {
      deleteTransaction(id);
      closeTransactionModal();
    }
  });

  // Resumo mensal e anual
  function carregarResumoMensal() {
    const mesAtual = state.currentDate.getMonth();
    const anoAtual = state.currentDate.getFullYear();
    const transacoesDoMes = state.transactions.filter(t => {
      const data = new Date(t.date + "T03:00:00");
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

  function atualizarResumoAnual() {
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
      const data = new Date(t.date + "T03:00:00");
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

  // Payables form
  payableForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('payable-id').value || crypto.randomUUID();
    const payable = {
      id,
      description: document.getElementById('payable-description').value,
      category: document.getElementById('payable-category').value,
      amount: parseFloat(document.getElementById('payable-amount').value),
      date: document.getElementById('payable-date').value,
      paid: false
    };
    const duplicada = state.payables.some(p =>
      p.description === payable.description && p.date === payable.date &&
      p.amount === payable.amount && p.category === payable.category && p.id !== id
    );
    if (duplicada) { alert('Essa conta já foi lançada.'); return; }
    savePayable(payable);
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
    const id = transactionIdInput.value || crypto.randomUUID();
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
    const newTransaction = { id, type, amount, description, category, date, user };
    saveTransaction(newTransaction);
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

  // Função para buscar e renderizar todos os dados do Firestore
  function fetchAndRenderData() {
    if (!auth.currentUser) return;

    // Transações
    const transactionsRef = collection(db, `users/${auth.currentUser.uid}/transactions`);
    onSnapshot(transactionsRef, (snapshot) => {
      state.transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateAll();
    });

    // Metas
    const goalsRef = collection(db, `users/${auth.currentUser.uid}/goals`);
    onSnapshot(goalsRef, (snapshot) => {
      state.goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderGoals();
    });

    // Contas a pagar
    const payablesRef = collection(db, `users/${auth.currentUser.uid}/payables`);
    onSnapshot(payablesRef, (snapshot) => {
      state.payables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderPayables();
      verificarContasAVencer();
    });
  }

  // Funções de CRUD para Firestore
  async function saveTransaction(transaction) {
    try {
      const docRef = doc(db, `users/${auth.currentUser.uid}/transactions`, transaction.id);
      await setDoc(docRef, transaction);
    } catch (e) {
      console.error("Erro ao salvar transação: ", e);
      alert("Erro ao salvar transação: " + e.message);
    }
  }

  async function deleteTransaction(id) {
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/transactions`, id));
    } catch (e) {
      console.error("Erro ao deletar transação: ", e);
      alert("Erro ao deletar transação: " + e.message);
    }
  }

  async function saveGoal(goal) {
    try {
      const docRef = doc(db, `users/${auth.currentUser.uid}/goals`, goal.id);
      await setDoc(docRef, goal);
    } catch (e) {
      console.error("Erro ao salvar meta: ", e);
      alert("Erro ao salvar meta: " + e.message);
    }
  }

  async function deleteGoal(goalId) {
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/goals`, goalId));
    } catch (e) {
      console.error("Erro ao deletar meta: ", e);
      alert("Erro ao deletar meta: " + e.message);
    }
  }

  async function savePayable(payable) {
    try {
      const docRef = doc(db, `users/${auth.currentUser.uid}/payables`, payable.id);
      await setDoc(docRef, payable);
    } catch (e) {
      console.error("Erro ao salvar conta: ", e);
      alert("Erro ao salvar conta: " + e.message);
    }
  }

  async function deletePayable(id) {
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/payables`, id));
    } catch (e) {
      console.error("Erro ao deletar conta: ", e);
      alert("Erro ao deletar conta: " + e.message);
    }
  }

  async function markPayablePaid(id) {
    const payable = state.payables.find(p => p.id === id);
    if (!payable) return;
    payable.paid = !payable.paid;
    savePayable(payable);
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
    updateMonthDisplay();
    updateUserUI();
  }

  // Funções de renderização da UI (as mesmas que você já tinha)
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
      'Alimentação': 'restaurant', 'Transporte': 'directions_bus', 'Moradia': 'home',
      'Lazer': 'sports_esports', 'Saúde': 'local_hospital', 'Empréstimo': 'account_balance',
      'Cartão de Crédito': 'credit_card', 'Energia': 'bolt', 'Água': 'water_drop',
      'Gás': 'local_fire_department', 'Internet': 'wifi', 'Investimento': 'trending_up',
      'Outros': 'category', 'Salário': 'attach_money', 'Combustível': 'local_gas_station',
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
    if (!goalList) return;
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

  function renderPayables() {
    if (!payableList) return;
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
            <button class="btn-secondary" onclick="markPayablePaid('${p.id}')">${p.paid ? 'Desfazer' : 'Marcar Pago'}</button>
            <button class="btn-secondary" onclick="editPayable('${p.id}')">Editar</button>
            <button class="btn-danger" onclick="deletePayable('${p.id}')">Excluir</button>
          </div>
        </div>
      `;
    });
  }

  function editPayable(id) {
    const payable = state.payables.find(p => p.id === id);
    if (!payable) return;
    openPayableModal(payable);
  }

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
    if (currentUserNameEl) {
      currentUserNameEl.textContent = state.currentUser;
    }
  }

  // Metas
  goalForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const goalId = document.getElementById('goal-id').value || crypto.randomUUID();
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
    const newGoal = { id: goalId, ...goalData };
    saveGoal(newGoal);
    closeGoalModal();
  });

  function editGoal(goalId) {
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
  }

  function closeGoalModal() {
    closeModal(goalModal);
    goalForm.reset();
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
    document.getElementById('delete-goal-btn').style.display = 'none';
  }

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
      // Deleta todos os dados do usuário no Firestore
      const deleteCollection = async (collectionRef) => {
        const snapshot = await getDocs(collectionRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      };
      deleteCollection(collection(db, `users/${auth.currentUser.uid}/transactions`));
      deleteCollection(collection(db, `users/${auth.currentUser.uid}/goals`));
      deleteCollection(collection(db, `users/${auth.currentUser.uid}/payables`));
      localStorage.clear();
      location.reload();
    }
  }

  function diasRestantes(dataVencimento) {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento + "T03:00:00");
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
    if (alertCount) alertCount.textContent = proximas.length;
    if (alertIcon) alertIcon.classList.toggle('ativo', proximas.length > 0);
    if (alertList) {
      alertList.innerHTML = proximas.length
        ? proximas.map(c => {
          const dataFormatada = new Date(c.date).toLocaleDateString('pt-BR');
          return `<li>${c.description} - vence em ${dataFormatada}</li>`;
        }).join('')
        : "<li>Nenhuma conta próxima do vencimento</li>";
    }
  }
}

// Service Worker (mesma função de antes)
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registrado: ', registration);
        })
        .catch(registrationError => {
          console.log('SW falhou: ', registrationError);
        });
    });
  }
}
