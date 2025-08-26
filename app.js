import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Esposo',
    users: ['Esposo', 'Esposa'],
    currentDate: new Date(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros', 'Agua', 'Energia', 'Emprestimo'],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
    currentChartType: 'all',
  };

  // Utilitários
  const formatCurrency = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDateLocalISO = (d) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Elementos
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const addTransactionBtn = document.getElementById('add-transaction-btn');
  const transactionModal = document.getElementById('transaction-modal');
  const transactionForm = document.getElementById('transaction-form');
  const typeExpenseBtn = document.getElementById('type-expense-btn');
  const typeIncomeBtn = document.getElementById('type-income-btn');
  const transactionTypeInput = document.getElementById('transaction-type');
  const categorySelect = document.getElementById('category');
  const addGoalBtn = document.getElementById('add-goal-btn');
  const goalModal = document.getElementById('goal-modal');
  const goalForm = document.getElementById('goal-form');
  const userButtons = document.querySelectorAll('.user-buttons button');
  const currentUserNameEl = document.getElementById('current-user-name');
  const exportDataBtn = document.getElementById('export-data-btn');
  const chartBtns = document.querySelectorAll('.chart-btn');
  const chartTitle = document.getElementById('chart-title');
  const chartDetails = document.getElementById('chart-details');
  const cancelTxBtn = document.getElementById('cancel-btn');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');

  // Inicialização
  createExpenseChart();
  setCurrentDate();
  updateAll();

  // Navegação
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.dataset.page;
      if (!pageId) return;
      pages.forEach((p) => p.classList.remove('active'));
      document.getElementById(pageId)?.classList.add('active');
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Controle gráfico
  chartBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      chartBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentChartType = btn.dataset.type;
      updateAll();
    });
  });

  function renderChart(transactions) {
    let filtered = transactions;
    let title = 'Movimentação por Categoria';

    if (state.currentChartType === 'expense') {
      filtered = transactions.filter((t) => t.type === 'expense');
      title = 'Despesas por Categoria';
    } else if (state.currentChartType === 'income') {
      filtered = transactions.filter((t) => t.type === 'income');
      title = 'Receitas por Categoria';
    }

    chartTitle.textContent = title;
    updateExpenseChart(filtered, [...state.expenseCategories, ...state.incomeCategories]);
    renderChartDetails(filtered);
  }

  function renderChartDetails(transactions) {
    chartDetails.innerHTML = '';
    if (transactions.length === 0) {
      chartDetails.innerHTML = '<p>Nenhum dado para este mês.</p>';
      return;
    }
    const grouped = {};
    transactions.forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });
    Object.entries(grouped).forEach(([cat, val]) => {
      const row = document.createElement('div');
      row.className = 'chart-detail-row';
      row.innerHTML = `<span>${cat}</span><span>${formatCurrency(val)}</span>`;
      chartDetails.appendChild(row);
    });
  }

  // Transações
  typeExpenseBtn?.addEventListener('click', () => setTransactionType('expense'));
  typeIncomeBtn?.addEventListener('click', () => setTransactionType('income'));

  function setTransactionType(type) {
    transactionTypeInput.value = type;
    typeExpenseBtn.classList.toggle('active', type === 'expense');
    typeIncomeBtn.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }

  function updateCategoryOptions(type) {
    categorySelect.innerHTML = '';
    const categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }

  transactionForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const tx = {
      id: Date.now().toString(),
      type: transactionTypeInput.value,
      amount: parseFloat(document.getElementById('amount').value || '0') || 0,
      description: document.getElementById('description').value.trim(),
      category: categorySelect.value,
      date: document.getElementById('date').value || formatDateLocalISO(new Date()),
      user: state.currentUser,
    };
    if (!tx.category || isNaN(tx.amount)) return alert('Preencha os campos corretamente.');
    state.transactions.push(tx);
    saveAndRerender();
    transactionForm.reset();
    setTransactionType('expense');
    closeModal(transactionModal);
  });

  cancelTxBtn?.addEventListener('click', () => closeModal(transactionModal));

  // Metas
  goalForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const goal = {
      id: Date.now().toString(),
      name: document.getElementById('goal-name').value,
      target: parseFloat(document.getElementById('goal-target').value || '0'),
      current: parseFloat(document.getElementById('goal-current').value || '0'),
    };
    state.goals.push(goal);
    saveAndRerender();
    closeModal(goalModal);
  });

  cancelGoalBtn?.addEventListener('click', () => closeModal(goalModal));

  // Exportar / Usuários
  userButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.currentUser = button.dataset.user;
      localStorage.setItem('currentUser', state.currentUser);
      updateAll();
    });
  });

  exportDataBtn?.addEventListener('click', () => {
    const data = { transactions: state.transactions, goals: state.goals };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dados_financeiros.json';
    a.click(); URL.revokeObjectURL(url);
  });

  // Renderização
  function saveAndRerender() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    updateAll();
  }

  function updateAll() {
    const filtered = filterTransactionsByMonth(state.transactions, state.currentDate);
    renderSummary(filtered);
    renderChart(filtered);
    updateMonthDisplay();
    updateUserUI();
  }

  function filterTransactionsByMonth(transactions, date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    return transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }

  function renderSummary(transactions) {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    document.getElementById('month-income').textContent = formatCurrency(income);
    document.getElementById('month-expense').textContent = formatCurrency(expense);
   
