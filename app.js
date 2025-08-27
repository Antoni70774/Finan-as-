import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

// ==========================
// APP PRINCIPAL
// ==========================
document.addEventListener('DOMContentLoaded', () => {

  // --------------------------
  // STATE MANAGEMENT
  // --------------------------
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Esposo',
    users: ['Esposo', 'Esposa'],
    currentDate: new Date(),
    expenseCategories: [
      'Alimentação', 'Transporte', 'Moradia', 'Lazer',
      'Saúde', 'Outros', 'Agua', 'Energia', 'Empréstimo'
    ],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
  };

  // --------------------------
  // UTILITÁRIOS
  // --------------------------
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

  function ensureHiddenIdInput() {
    if (!document.getElementById('transaction-id')) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = 'transaction-id';
      hidden.name = 'transaction-id';
      transactionForm?.appendChild(hidden);
    }
  }

  // --------------------------
  // ELEMENTOS DA UI
  // --------------------------
  const addTransactionBtn = document.getElementById('add-transaction-btn');
  const transactionModal = document.getElementById('transaction-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const transactionForm = document.getElementById('transaction-form');
  const typeExpenseBtn = document.getElementById('type-expense-btn');
  const typeIncomeBtn = document.getElementById('type-income-btn');
  const transactionTypeInput = document.getElementById('transaction-type');
  const categorySelect = document.getElementById('category');
  const addGoalBtn = document.getElementById('add-goal-btn');
  const goalModal = document.getElementById('goal-modal');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');
  const goalForm = document.getElementById('goal-form');
  const userButtons = document.querySelectorAll('.user-buttons button');
  const currentUserNameEl = document.getElementById('current-user-name');
  const exportDataBtn = document.getElementById('export-data-btn');

  const monthExpenseTap = document.getElementById('month-expense');
  const monthIncomeTap = document.getElementById('month-income');

  // --------------------------
  // INICIALIZAÇÃO
  // --------------------------
  createExpenseChart();
  setCurrentDate();
  updateAll();
  makeFAB();

  // --------------------------
  // NAVEGAÇÃO DE MÊS
  // --------------------------
  const prevBtn = document.getElementById('prev-month');
  const nextBtn = document.getElementById('next-month');
  if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

  function changeMonth(direction) {
    state.currentDate.setMonth(state.currentDate.getMonth() + direction);
    updateAll();
  }

  function setCurrentDate() {
    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.value = formatDateLocalISO(new Date());
  }

  // --------------------------
  // MODAIS BÁSICOS
  // --------------------------
  function openModal(modal) { modal?.classList.add('active'); }
  function closeModal(modal) { modal?.classList.remove('active'); }

  if (addTransactionBtn) {
    addTransactionBtn.classList.add('fab');
    addTransactionBtn.addEventListener('click', openFABMenu);
  }
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(transactionModal));
  if (addGoalBtn) addGoalBtn.addEventListener('click', () => { goalForm?.reset(); openModal(goalModal); });
  if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', () => closeModal(goalModal));

  // --------------------------
  // FORM DE TRANSAÇÃO
  // --------------------------
  if (typeExpenseBtn) typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
  if (typeIncomeBtn) typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));
  setTransactionType('expense');

  function setTransactionType(type) {
    if (!transactionTypeInput) return;
    transactionTypeInput.value = type;
    typeExpenseBtn?.classList.toggle('active', type === 'expense');
    typeIncomeBtn?.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }

  function updateCategoryOptions(type) {
    if (!categorySelect) return;
    categorySelect.innerHTML = '';
    const categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }

  if (transactionForm) {
    ensureHiddenIdInput();
    transactionForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const idHidden = document.getElementById('transaction-id');
      const editingId = idHidden?.value || '';

      const tx = {
        id: editingId || Date.now().toString(),
        type: transactionTypeInput?.value || 'expense',
        amount: parseFloat(document.getElementById('amount')?.value || '0') || 0,
        description: (document.getElementById('description')?.value || '').trim(),
        category: categorySelect?.value || '',
        date: document.getElementById('date')?.value || formatDateLocalISO(new Date()),
        user: state.currentUser,
      };

      if (!tx.category || !tx.date || !tx.type || isNaN(tx.amount)) {
        alert('Preencha os campos corretamente.');
        return;
      }

      if (editingId) {
        const idx = state.transactions.findIndex((t) => t.id === editingId);
        if (idx !== -1) state.transactions[idx] = tx;
      } else {
        state.transactions.push(tx);
      }

      if (idHidden) idHidden.value = '';
      saveAndRerender();
      closeModal(transactionModal);
      this.reset();
      setCurrentDate();
    });
  }

  // --------------------------
  // METAS
  // --------------------------
  if (goalForm) {
    goalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const goal = {
        id: document.getElementById('goal-id')?.value || Date.now().toString(),
        name: document.getElementById('goal-name')?.value || '',
        target: parseFloat(document.getElementById('goal-target')?.value || '0') || 0,
        current: parseFloat(document.getElementById('goal-current')?.value || '0') || 0,
      };

      if (!goal.name) {
        alert('Informe o nome da meta.');
        return;
      }

      const existsIdx = state.goals.findIndex((g) => g.id === goal.id);
      if (existsIdx !== -1) state.goals[existsIdx] = goal;
      else state.goals.push(goal);

      saveAndRerender();
      closeGoalModal();
    });
  }

  function closeGoalModal() {
    closeModal(goalModal);
    goalForm?.reset();
  }

  // --------------------------
  // AÇÕES: USUÁRIOS, EXPORTAR
  // --------------------------
  userButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.currentUser = button.dataset.user;
      localStorage.setItem('currentUser', state.currentUser);
      updateAll();
    });
  });

  exportDataBtn?.addEventListener('click', exportData);

  function exportData() {
    const data = { transactions: state.transactions, goals: state.goals };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_financeiros.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --------------------------
  // RENDERIZAÇÃO
  // --------------------------
  function saveAndRerender() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    updateAll();
  }

  function updateAll() {
    const filtered = filterTransactionsByMonth(state.transactions, state.currentDate);
    renderSummary(filtered);
    updateExpenseChart(filtered, state.expenseCategories);
    renderGoals();
    updateMonthDisplay();
    updateUserUI();
  }

  function filterTransactionsByMonth(transactions, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return transactions.filter((t) => {
      const tDate = new Date(t.date + 'T00:00:00');
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  }

  function updateMonthDisplay() {
    const el = document.getElementById('current-month-year');
    if (el) el.textContent = state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function renderSummary(transactions) {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    document.getElementById('month-income').textContent = formatCurrency(income);
    document.getElementById('month-expense').textContent = formatCurrency(expense);
    const balanceEl = document.getElementById('month-balance');
    balanceEl.textContent = formatCurrency(balance);
    balanceEl.style.color = balance >= 0 ? 'green' : 'red';
  }

  function renderGoals() {
    const list = document.getElementById('goal-list');
    if (!list) return;
    list.innerHTML = '';
    if (state.goals.length === 0) {
      list.innerHTML = '<li>Nenhuma meta definida.</li>';
      return;
    }
    state.goals.forEach((goal) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${goal.name}</strong> - ${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}`;
      list.appendChild(li);
    });
  }

  function updateUserUI() {
    if (currentUserNameEl) currentUserNameEl.textContent = state.currentUser;
    userButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.user === state.currentUser);
    });
  }

  // --------------------------
  // FLOATING ACTION BUTTON
  // --------------------------
  let fabMenuEl = null;
  function makeFAB() {
    if (!addTransactionBtn) return;
    addTransactionBtn.title = 'Novo lançamento';
  }

  function openFABMenu() {
    if (fabMenuEl) { closeFABMenu(); return; }
    fabMenuEl = document.createElement('div');
    fabMenuEl.className = 'fab-menu';

    const btnDespesa = document.createElement('button');
    btnDespesa.className = 'btn';
    btnDespesa.textContent = '+ Despesa';
    btnDespesa.addEventListener('click', () => {
      openModal(transactionModal);
      setTransactionType('expense');
      transactionForm?.reset();
      ensureHiddenIdInput();
      document.getElementById('transaction-id').value = '';
      setCurrentDate();
      closeFABMenu();
    });

    const btnReceita = document.createElement('button');
    btnReceita.className = 'btn';
    btnReceita.textContent = '+ Receita';
    btnReceita.addEventListener('click', () => {
      openModal(transactionModal);
      setTransactionType('income');
      transactionForm?.reset();
      ensureHiddenIdInput();
      document.getElementById('transaction-id').value = '';
      setCurrentDate();
      closeFABMenu();
    });

    fabMenuEl.appendChild(btnDespesa);
    fabMenuEl.appendChild(btnReceita);
    document.body.appendChild(fabMenuEl);
  }

  function closeFABMenu() {
    fabMenuEl?.remove();
    fabMenuEl = null;
  }
});
