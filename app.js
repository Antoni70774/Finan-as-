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
  };

  const transactionForm = document.getElementById('transaction-form');
  const goalForm = document.getElementById('goal-form');
  const categorySelect = document.getElementById('category');
  const transactionTypeInput = document.getElementById('transaction-type');
  const typeExpenseBtn = document.getElementById('type-expense-btn');
  const typeIncomeBtn = document.getElementById('type-income-btn');
  const transactionModal = document.getElementById('transaction-modal');
  const goalModal = document.getElementById('goal-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');
  const addTransactionBtn = document.getElementById('add-transaction-btn');
  const addGoalBtn = document.getElementById('add-goal-btn');
  const currentUserNameEl = document.getElementById('current-user-name');
  const userButtons = document.querySelectorAll('.user-buttons button');
  const monthIncomeEl = document.getElementById('month-income');
  const monthExpenseEl = document.getElementById('month-expense');
  const monthBalanceEl = document.getElementById('month-balance');
  const currentMonthYearEl = document.getElementById('current-month-year');
  const transactionListEl = document.getElementById('transaction-list');

  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDateLocalISO(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function saveState() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    localStorage.setItem('currentUser', state.currentUser);
  }

  function updateCategoryOptions(type) {
    categorySelect.innerHTML = '';
    const categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }

  function setTransactionType(type) {
    transactionTypeInput.value = type;
    typeExpenseBtn.classList.toggle('active', type === 'expense');
    typeIncomeBtn.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }

  function updateDashboard() {
    const month = state.currentDate.getMonth();
    const year = state.currentDate.getFullYear();
    const filtered = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year && t.user === state.currentUser;
    });

    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    monthIncomeEl.textContent = formatCurrency(income);
    monthExpenseEl.textContent = formatCurrency(expense);
    monthBalanceEl.textContent = formatCurrency(balance);
    currentMonthYearEl.textContent = state.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    updateExpenseChart(filtered, state.expenseCategories);
    renderTransactions(filtered);
  }

  function renderTransactions(transactions) {
    transactionListEl.innerHTML = '';
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.slice(0, 5).forEach(t => {
      const li = document.createElement('li');
      li.textContent = `${t.date} • ${t.category} • ${formatCurrency(t.amount)}`;
      transactionListEl.appendChild(li);
    });
  }

  function updateAll() {
    currentUserNameEl.textContent = state.currentUser;
    updateDashboard();
  }

  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
  typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));
  setTransactionType('expense');

  cancelBtn.addEventListener('click', () => closeModal(transactionModal));
  cancelGoalBtn.addEventListener('click', () => closeModal(goalModal));

  addTransactionBtn.addEventListener('click', () => {
    transactionForm.reset();
    setTransactionType('expense');
    document.getElementById('date').value = formatDateLocalISO(new Date());
    openModal(transactionModal);
  });

  addGoalBtn.addEventListener('click', () => {
    goalForm.reset();
    openModal(goalModal);
  });

  transactionForm.addEventListener('submit', e => {
    e.preventDefault();
    const tx = {
      id: Date.now().toString(),
      type: transactionTypeInput.value,
      amount: parseFloat(document.getElementById('amount').value),
      description: document.getElementById('description').value,
      category: categorySelect.value,
      date: document.getElementById('date').value,
      user: state.currentUser,
    };
    state.transactions.push(tx);
    saveState();
    updateAll();
    closeModal(transactionModal);
  });

  goalForm.addEventListener('submit', e => {
    e.preventDefault();
    const goal = {
      id: Date.now().toString(),
      name: document.getElementById('goal-name').value,
      target: parseFloat(document.getElementById('goal-target').value),
      current: parseFloat(document.getElementById('goal-current').value),
    };
    state.goals.push(goal);
    saveState();
    closeModal(goalModal);
  });

  userButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentUser = btn.dataset.user;
      saveState();
      updateAll();
    });
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const pageId = item.getAttribute('data-page');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(pageId)?.classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  document.getElementById('prev-month').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    updateAll();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    updateAll();
  });

  createExpenseChart();
  updateAll();
});
