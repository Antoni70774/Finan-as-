import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
  // STATE
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Esposo',
    users: ['Esposo', 'Esposa'],
    currentDate: new Date(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Emprestimo', 'Cartão de Credito', 'Agua', 'Energia', 'Gas', 'Internet',  'Lazer', 'Saúde', 'Outros'],
    incomeCategories: ['Salário', 'Freelance', 'Investimentos', 'Outros'], // ✅ revisado
  };

  // UI Elements
  const navItems = document.querySelectorAll('.nav-item');
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
  const currentUserNameEl = document.getElementById('current-user-name');
  const userButtons = document.querySelectorAll('.user-buttons button');
  const exportDataBtn = document.getElementById('export-data-btn');

  // INIT
  createExpenseChart();
  setCurrentDate();
  setTransactionType('expense'); // popula categorias no load
  updateAll();
  registerServiceWorker();

  // DATE NAVIGATION
  document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

  function changeMonth(direction) {
    state.currentDate.setMonth(state.currentDate.getMonth() + direction);
    updateAll();
  }

  function setCurrentDate() {
    const today = new Date();
    document.getElementById('date').value = today.toISOString().split('T')[0];
  }

  // NAVIGATION
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const pageId = item.getAttribute('data-page');
      document.getElementById(pageId).classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // MODALS
  function openModal(modal) { modal.classList.add('active'); }
  function closeModal(modal) { modal.classList.remove('active'); }

  addTransactionBtn.addEventListener('click', () => {
    transactionForm.reset();
    setCurrentDate();
    setTransactionType('expense');
    openModal(transactionModal);
  });
  cancelBtn.addEventListener('click', () => closeModal(transactionModal));

  addGoalBtn.addEventListener('click', () => {
    goalForm.reset();
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
    document.getElementById('delete-goal-btn').style.display = 'none';
    openModal(goalModal);
  });
  cancelGoalBtn.addEventListener('click', () => closeModal(goalModal));

  // CATEGORY OPTIONS
  function updateCategoryOptions(type) {
    const categories = type === 'expense' ? state.expenseCategories : state.incomeCategories;
    categorySelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // TYPE TOGGLE
  typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
  typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));

  function setTransactionType(type) {
    transactionTypeInput.value = type;
    typeExpenseBtn.classList.toggle('active', type === 'expense');
    typeIncomeBtn.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }

  // TRANSACTION SUBMIT
  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    if (isNaN(amount) || amount <= 0) {
      alert('Informe um valor maior que zero.');
      return;
    }

    const transaction = {
      id: Date.now().toString(),
      type: transactionTypeInput.value,
      amount: amount,
      description: document.getElementById('description').value,
      category: categorySelect.value,
      date: document.getElementById('date').value,
      user: state.currentUser
    };

    state.transactions.push(transaction);
    saveAndRerender();
    closeModal(transactionModal);
    transactionForm.reset();
  });

  // GOALS
  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('goal-id').value || Date.now().toString();
    const name = document.getElementById('goal-name').value;
    const target = parseFloat(document.getElementById('goal-target').value);
    const current = parseFloat(document.getElementById('goal-current').value);

    if (!name || isNaN(target) || isNaN(current)) {
      alert('Preencha todos os campos da meta corretamente.');
      return;
    }

    const existingIndex = state.goals.findIndex(g => g.id === id);
    const goal = { id, name, target, current };
    if (existingIndex >= 0) {
      state.goals[existingIndex] = goal;
    } else {
      state.goals.push(goal);
    }

    saveAndRerender();
    closeModal(goalModal);
  });

  document.getElementById('delete-goal-btn').addEventListener('click', () => {
    const goalId = document.getElementById('goal-id').value;
    if (!goalId) return;
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      state.goals = state.goals.filter(g => g.id !== goalId);
      saveAndRerender();
      closeModal(goalModal);
    }
  });

  // EDIT GOAL
  window.editGoal = function(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;
    document.getElementById('goal-id').value = goal.id;
    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-target').value = goal.target;
    document.getElementById('goal-current').value = goal.current;
    document.getElementById('goal-modal-title').textContent = 'Editar Meta';
    document.getElementById('delete-goal-btn').style.display = 'block';
    openModal(goalModal);
  };

  function renderGoals() {
    const container = document.getElementById('goals-list');
    container.innerHTML = '';
    if (!state.goals.length) {
      container.innerHTML = '<p>Nenhuma meta cadastrada.</p>';
      return;
    }
    state.goals.forEach(g => {
      const progress = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
      const div = document.createElement('div');
      div.className = 'goal-item';
      div.innerHTML = `
        <div class="goal-info">
          <p>${g.name}</p>
          <button class="edit-goal-btn" onclick="editGoal('${g.id}')">
            <span class="material-icons-sharp">edit</span>
          </button>
        </div>
        <div class="progress-bar"><div class="progress" style="width:${progress}%"></div></div>
        <div class="goal-values">
          <span>Atual: ${formatCurrency(g.current)}</span>
          <span>Alvo: ${formatCurrency(g.target)}</span>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // USERS
  userButtons.forEach(button => {
    button.addEventListener('click', () => {
      state.currentUser = button.dataset.user;
      localStorage.setItem('currentUser', state.currentUser);
      updateAll();
    });
  });

  // EXPORT
  exportDataBtn.addEventListener('click', () => {
    const data = { transactions: state.transactions, goals: state.goals };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'dados_financeiros.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // SAVE & RENDER
  function saveAndRerender() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    updateAll();
  }

  function updateAll() {
    const filtered = filterByMonth(state.transactions, state.currentDate);
    renderSummary(filtered);
    renderTransactionList(filtered);
    updateExpenseChart(filtered, state.expenseCategories);
    renderGoals();
    updateMonthDisplay();
    updateUserUI();
  }

  function filterByMonth(transactions, date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }

  function updateMonthDisplay() {
    document.getElementById('current-month-year').textContent =
      state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function renderSummary(transactions) {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    document.getElementById('month-income').textContent = formatCurrency(income);
    document.getElementById('month-expense').textContent = formatCurrency(expense);
    const balanceEl = document.getElementById('month-balance');
    balanceEl.textContent = formatCurrency(balance);
    balanceEl.style.color = balance >= 0 ? 'var(--text-light)' : '#ff8a80';
  }

  function renderTransactionList(transactions) {
    const listEl = document.getElementById('transaction-list');
    listEl.innerHTML = '';
    if (!transactions.length) {
      listEl.innerHTML = '<li>Nenhuma transação este mês.</li>';
      return;
    }
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.slice(0, 10).forEach(t => {
      const isIncome = t.type === 'income';
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.innerHTML = `
        <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
          <span class="material-icons-sharp">${isIncome ? 'arrow_upward' : 'arrow_downward'}</span>
        </div>
        <div class="transaction-details">
          <p>${t.description}</p>
          <span>${t.category} • ${t.user} • ${date}</span>
        </div>
        <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
        </div>
      `;
      listEl.appendChild(li);
    });
  }

  function updateUserUI() {
    currentUserNameEl.textContent = state.currentUser;
    userButtons.forEach(b => b.classList.toggle('active', b.dataset.user === state.currentUser));
  }

  // SERVICE WORKER
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('SW registrado:', reg.scope))
          .catch(err => console.log('SW falhou:', err));
      });
    }
  }

  // BANK INTEGRATION (stub)
  window.connectBank = async function(bankName) {
    try {
      alert(`Integração com ${bankName} em desenvolvimento. Em breve estará disponível.`);
    } catch (e) {
      console.error('Erro na conexão:', e);
      alert(`Não foi possível conectar ao ${bankName}. Tente novamente mais tarde.`);
    }
  };
});

