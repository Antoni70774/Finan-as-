// --- app.js ---
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
  // === ELEMENTOS DA UI ===
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
  const currentUserNameEl = document.getElementById('current-user-name');
  const userButtons = document.querySelectorAll('.user-buttons button');
  const chartBtns = document.querySelectorAll('.chart-btn');
  const chartTitle = document.getElementById('chart-title');
  const goalList = document.getElementById('goal-list');
  const goalModal = document.getElementById('goal-modal');
  const goalForm = document.getElementById('goal-form');
  const payableModal = document.getElementById('payable-modal');
  const payableForm = document.getElementById('payable-form');
  const payableList = document.getElementById('payable-list');

  // === ESTADO ===
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    payables: JSON.parse(localStorage.getItem('payables')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Esposo',
    users: ['Esposo', 'Esposa'],
    currentDate: new Date(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
    chartType: 'all' // all, expense, income
  };

  // === INICIALIZAÇÃO ===
  createExpenseChart();
  setCurrentDate();
  updateAll();
  registerServiceWorker();

  // === NAVEGAÇÃO ENTRE PÁGINAS ===
  function navigateToPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    navItems.forEach(i => i.classList.toggle('active', i.dataset.page === pageId));
    const titles = {
      'dashboard-page': 'Visão Geral',
      'goals-page': 'Metas Pessoais',
      'payables-page': 'Despesas a Pagar',
      'menu-page': 'Menu',
      'resumo-anual-page': 'Resumo Anual',
      'config-page': 'Configurações'
    };
    document.querySelector('.app-header h1').textContent = titles[pageId] || 'Visão Geral';
    if (pageId === 'payables-page') renderPayables();
  }
  navItems.forEach(item => item.addEventListener('click', e => {
    e.preventDefault();
    navigateToPage(item.dataset.page);
  }));

  // === MODAIS ===
  function openModal(m) { m.classList.add('active'); }
  function closeModal(m) { m.classList.remove('active'); }

  addButton.addEventListener('click', () => openTransactionModal());
  cancelBtn.addEventListener('click', () => closeModal(transactionModal));
  deleteTransactionBtn.addEventListener('click', () => deleteTransaction());

  // === TRANSAÇÕES ===
  function openTransactionModal(transaction = null) {
    transactionForm.reset();
    setCurrentDate();
    transactionIdInput.value = '';
    deleteTransactionBtn.style.display = 'none';
    transactionModalTitle.textContent = transaction ? 'Editar Transação' : 'Nova Transação';
    if (transaction) {
      Object.assign(transactionIdInput, { value: transaction.id });
      document.getElementById('amount').value = transaction.amount;
      document.getElementById('description').value = transaction.description;
      categorySelect.value = transaction.category;
      document.getElementById('date').value = transaction.date;
      setTransactionType(transaction.type);
      deleteTransactionBtn.style.display = 'inline-block';
    } else setTransactionType('expense');
    openModal(transactionModal);
  }

  function setTransactionType(type) {
    transactionTypeInput.value = type;
    typeExpenseBtn.classList.toggle('active', type === 'expense');
    typeIncomeBtn.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }
  function updateCategoryOptions(type) {
    categorySelect.innerHTML = '';
    const cats = type === 'expense' ? state.expenseCategories : state.incomeCategories;
    cats.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      categorySelect.appendChild(option);
    });
  }

  transactionForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = transactionIdInput.value;
    const transaction = {
      id: id || crypto.randomUUID(),
      type: transactionTypeInput.value,
      amount: parseFloat(document.getElementById('amount').value),
      description: document.getElementById('description').value,
      category: categorySelect.value,
      date: document.getElementById('date').value,
      user: state.currentUser
    };
    if (!transaction.amount || !transaction.description || !transaction.category || !transaction.date) {
      alert('Preencha todos os campos');
      return;
    }
    if (id) {
      const idx = state.transactions.findIndex(t => t.id === id);
      if (idx > -1) state.transactions[idx] = transaction;
    } else state.transactions.push(transaction);
    saveAndRerender();
    closeModal(transactionModal);
  });

  function deleteTransaction() {
    const id = transactionIdInput.value;
    if (!id) return;
    if (confirm('Deseja excluir esta transação?')) {
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveAndRerender();
      closeModal(transactionModal);
    }
  }

  // === GOALS ===
  goalForm.addEventListener('submit', e => {
    e.preventDefault();
    const goalId = document.getElementById('goal-id').value;
    const goal = {
      id: goalId || Date.now().toString(),
      name: document.getElementById('goal-name').value,
      target: parseFloat(document.getElementById('goal-target').value),
      current: parseFloat(document.getElementById('goal-current').value),
      date: document.getElementById('goal-date').value
    };
    if (!goal.name || !goal.target || isNaN(goal.current)) return alert('Preencha corretamente');
    if (goalId) {
      const idx = state.goals.findIndex(g => g.id === goalId);
      if (idx !== -1) state.goals[idx] = goal;
    } else state.goals.push(goal);
    saveAndRerender();
    closeModal(goalModal);
  });

  window.editGoal = id => {
    const goal = state.goals.find(g => g.id === id);
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
  window.deleteGoal = id => {
    if (confirm('Excluir meta?')) {
      state.goals = state.goals.filter(g => g.id !== id);
      saveAndRerender();
    }
  };

  // === PAYABLES ===
  payableForm.addEventListener('submit', e => {
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
    const duplicada = state.payables.some(p => p.description === payable.description && p.date === payable.date && p.amount === payable.amount && p.category === payable.category && p.id !== id);
    if (duplicada) return alert('Essa conta já foi lançada.');
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) state.payables[idx] = payable; else state.payables.push(payable);
    saveAndRerender();
    closeModal(payableModal);
  });

  window.markPayablePaid = id => {
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) {
      state.payables[idx].paid = !state.payables[idx].paid;
      saveAndRerender();
    }
  };
  window.deletePayable = id => {
    if (confirm('Excluir conta?')) {
      state.payables = state.payables.filter(p => p.id !== id);
      saveAndRerender();
    }
  };

  // === ATUALIZAÇÃO GLOBAL ===
  function updateAll() {
    const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
    const filtered = state.chartType === 'expense' ? monthFiltered.filter(t => t.type === 'expense') :
                     state.chartType === 'income' ? monthFiltered.filter(t => t.type === 'income') :
                     monthFiltered;
    renderSummary(monthFiltered);
    renderTransactionList(filtered);
    updateMainChart(monthFiltered);
    renderGoals();
    renderPayables();
    updateMonthDisplay();
    updateUserUI();
  }

  function saveAndRerender() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    localStorage.setItem('payables', JSON.stringify(state.payables));
    updateAll();
  }

  function filterTransactionsByMonth(transactions, date) {
    return transactions.filter(t => {
      const d = new Date(t.date + 'T03:00:00');
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
    });
  }

  function renderSummary(transactions) {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    document.getElementById('month-income').textContent = formatCurrency(income);
    document.getElementById('month-expense').textContent = formatCurrency(expense);
    document.getElementById('month-balance').textContent = formatCurrency(balance);
  }

  function renderTransactionList(transactions) {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    if (!transactions.length) return list.innerHTML = '<li>Nenhuma transação.</li>';
    [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.innerHTML = `<div>${t.description} - ${formatCurrency(t.amount)} (${t.category})</div>`;
      li.addEventListener('click', () => openTransactionModal(t));
      list.appendChild(li);
    });
  }

  function updateMainChart(transactions) {
    const cats = state.chartType === 'income' ? state.incomeCategories : state.expenseCategories;
    const filtered = state.chartType === 'income' ? transactions.filter(t => t.type === 'income') :
                     state.chartType === 'expense' ? transactions.filter(t => t.type === 'expense') :
                     transactions;
    updateExpenseChart(filtered, cats);
    chartTitle.textContent = state.chartType === 'income' ? 'Receitas' : state.chartType === 'expense' ? 'Despesas' : 'Movimentação';
  }

  function renderGoals() {
    goalList.innerHTML = state.goals.map(g => `<div>${g.name} - ${formatCurrency(g.current)} / ${formatCurrency(g.target)}</div>`).join('');
  }

  function renderPayables() {
    payableList.innerHTML = state.payables.map(p => `<div>${p.description} - ${formatCurrency(p.amount)} (${formatDateBR(p.date)})</div>`).join('');
  }

  function updateMonthDisplay() {
    document.getElementById('current-month-year').textContent = state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function updateUserUI() {
    currentUserNameEl.textContent = state.currentUser;
    userButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.user === state.currentUser));
  }

  function setCurrentDate() {
    const today = new Date();
    document.getElementById('date').value = today.toISOString().split('T')[0];
  }

  function formatCurrency(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function formatDateBR(d) { return new Date(d).toLocaleDateString('pt-BR'); }

  // === SERVICE WORKER ===
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
  }
});
