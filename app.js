// --- app.js ---
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
  // ===== ELEMENTOS =====
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const addButton = document.getElementById('add-transaction-btn');

  // Transações
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

  // Metas
  const addGoalBtn = document.getElementById('add-goal-btn');
  const goalModal = document.getElementById('goal-modal');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');
  const goalForm = document.getElementById('goal-form');
  const goalList = document.getElementById('goal-list');

  // Perfil
  const currentUserNameEl = document.getElementById('current-user-name');
  const userButtons = document.querySelectorAll('.user-buttons button'); // pode estar vazio
  const exportDataBtn = document.getElementById('export-data-btn');

  // Gráfico
  const chartBtns = document.querySelectorAll('.chart-btn');
  const chartTitle = document.getElementById('chart-title');

  // Contas a pagar
  const addPayableBtn = document.getElementById('add-payable-btn');
  const payableModal = document.getElementById('payable-modal');
  const cancelPayableBtn = document.getElementById('cancel-payable-btn');
  const payableForm = document.getElementById('payable-form');
  const payableList = document.getElementById('payable-list');

  // Alerta
  const alertIcon = document.getElementById('alert-icon');
  const alertCount = document.getElementById('alert-count');
  const alertList = document.getElementById('alert-list');

  // ===== STATE =====
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    payables: JSON.parse(localStorage.getItem('payables')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Esposo',
    users: ['Esposo', 'Esposa'],
    currentDate: new Date(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
    chartType: 'all' // all | expense | income
  };

  // ===== INIT =====
  createExpenseChart();
  setCurrentDate();
  updateAll();
  registerServiceWorker();

  // ===== DATA & RENDER =====
  function saveAndRerender() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    localStorage.setItem('payables', JSON.stringify(state.payables));
    updateAll(); // inclui verificarContasAVencer()
  }

  function updateAll() {
    const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);

    let transactionsForDisplay = monthFiltered;
    if (state.chartType === 'expense') transactionsForDisplay = monthFiltered.filter(t => t.type === 'expense');
    if (state.chartType === 'income') transactionsForDisplay = monthFiltered.filter(t => t.type === 'income');

    renderSummary(monthFiltered);
    renderTransactionList(transactionsForDisplay);
    updateMainChart(monthFiltered);
    renderGoals();
    renderPayables();
    updateMonthDisplay();
    updateUserUI();

    verificarContasAVencer(); // <-- atualiza badge/lista sempre que algo muda
  }

  function filterTransactionsByMonth(transactions, date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    return transactions.filter(t => {
      const d = new Date(t.date + 'T03:00:00');
      return d.getFullYear() === y && d.getMonth() === m;
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
      const card = document.createElement('div');
      card.className = `category-card ${data.type}`;
      card.innerHTML = `
        <div class="category-icon"><span class="material-icons-sharp">${getCategoryIcon(category)}</span></div>
        <div class="category-info">
          <span class="category-name">${category}</span>
          <span class="category-amount">${formatCurrency(data.total)}</span>
        </div>`;
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
    const sorted = [...transactions].sort((a, b) => new Date(b.date + 'T03:00:00') - new Date(a.date + 'T03:00:00'));
    sorted.forEach(t => {
      const isIncome = t.type === 'income';
      const item = document.createElement('li');
      item.className = 'transaction-item';
      item.dataset.id = t.id;
      item.innerHTML = `
        <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
          <span class="material-icons-sharp">${isIncome ? 'arrow_upward' : 'arrow_downward'}</span>
        </div>
        <div class="transaction-details">
          <p>${t.description}</p>
          <span>${t.category} • ${formatDateBR(t.date)}</span>
        </div>
        <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
        </div>`;
      item.addEventListener('click', () => openTransactionModal(t));
      listEl.appendChild(item);
    });
  }

  function renderSummary(transactions) {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
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

  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDateBR(dateStr) {
    return new Date(dateStr + 'T03:00:00').toLocaleDateString('pt-BR');
  }

  // ===== NAVEGAÇÃO =====
  function navigateToPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    const selected = document.getElementById(pageId);
    if (selected) selected.classList.add('active');

    navItems.forEach(it => {
      it.classList.remove('active');
      if (it.getAttribute('data-page') === pageId) it.classList.add('active');
    });

    const titles = {
      'dashboard-page': 'Visão Geral',
      'goals-page': 'Metas Pessoais',
      'payables-page': 'Despesas a Pagar',
      'profile-page': 'Perfil'
    };
    document.querySelector('.app-header h1').textContent = titles[pageId] || 'Visão Geral';

    if (pageId === 'payables-page') renderPayables();
  }

  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const pageId = item.getAttribute('data-page');
      if (pageId) navigateToPage(pageId);
    });
  });

  // ===== MÊS =====
  document.getElementById('prev-month').addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth() - 1); updateAll(); });
  document.getElementById('next-month').addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth() + 1); updateAll(); });
  function setCurrentDate() {
    const today = new Date();
    const input = document.getElementById('date');
    if (input) input.value = today.toISOString().split('T')[0];
  }

  // ===== MODAL TRANSAÇÃO =====
  function openModal(m) { m.classList.add('active'); }
  function closeModal(m) { m.classList.remove('active'); }

  addButton.addEventListener('click', () => openTransactionModal());
  cancelBtn.addEventListener('click', () => closeModal(transactionModal));
  deleteTransactionBtn.addEventListener('click', () => {
    const id = transactionIdInput.value;
    if (!id) return;
    if (confirm('Deseja excluir esta transação?')) {
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveAndRerender();
      closeModal(transactionModal);
    }
  });

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
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }

  transactionForm.addEventListener('submit', e => {
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
      if (idx > -1) state.transactions[idx] = { id, type, amount, description, category, date, user };
    } else {
      state.transactions.push({ id: crypto.randomUUID(), type, amount, description, category, date, user });
    }
    saveAndRerender();
    closeModal(transactionModal);
  });

  // ===== METAS =====
  goalForm.addEventListener('submit', e => {
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
      const i = state.goals.findIndex(g => g.id === goalId);
      if (i !== -1) state.goals[i] = { ...state.goals[i], ...goalData };
    } else {
      state.goals.push({ id: Date.now().toString(), ...goalData });
    }
    saveAndRerender();
    closeGoalModal();
  });

  document.getElementById('delete-goal-btn').addEventListener('click', () => {
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
    goalModal.classList.add('active');
  };
  window.closeGoalModal = function () {
    goalModal.classList.remove('active');
    goalForm.reset();
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
    document.getElementById('delete-goal-btn').style.display = 'none';
  };

  // ===== CONTAS A PAGAR =====
  addPayableBtn.addEventListener('click', () => openPayableModal());
  cancelPayableBtn.addEventListener('click', () => payableModal.classList.remove('active'));

  payableForm.addEventListener('submit', e => {
    e.preventDefault();
    const payableId = document.getElementById('payable-id').value;
    const payableData = {
      description: document.getElementById('payable-description').value,
      category: document.getElementById('payable-category').value,
      amount: parseFloat(document.getElementById('payable-amount').value),
      date: document.getElementById('payable-date').value,
      paid: false
    };
    if (!payableData.description || !payableData.category || !payableData.amount || !payableData.date) {
      alert('Preencha todos os campos');
      return;
    }
    if (payableId) {
      const i = state.payables.findIndex(p => p.id === payableId);
      if (i !== -1) state.payables[i] = { ...state.payables[i], ...payableData };
    } else {
      state.payables.push({ id: Date.now().toString(), ...payableData });
    }
    saveAndRerender();
    payableModal.classList.remove('active');
  });

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
    payableModal.classList.add('active');
  }

  window.markPayablePaid = function (id) {
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) {
      state.payables[idx].paid = !state.payables[idx].paid;
      saveAndRerender();
    }
  };
  window.deletePayable = function (id) {
    if (confirm('Excluir esta conta?')) {
      state.payables = state.payables.filter(p => p.id !== id);
      saveAndRerender();
    }
  };
  window.editPayable = function (id) {
    const payable = state.payables.find(p => p.id === id);
    if (!payable) return;
    openPayableModal(payable);
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
        </div>`;
    });
  }

  // ===== CHART SELECTOR =====
  chartBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chartBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.chartType = btn.getAttribute('data-type');
      updateAll();
    });
  });

  // ===== PERFIL / EXPORT =====
  exportDataBtn.addEventListener('click', () => {
    const data = {
      transactions: state.transactions,
      goals: state.goals,
      payables: state.payables
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'dados_financeiros.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  userButtons.forEach(b => {
    b.addEventListener('click', () => {
      state.currentUser = b.dataset.user;
      localStorage.setItem('currentUser', state.currentUser);
      updateAll();
    });
  });
  function updateUserUI() {
    currentUserNameEl.textContent = state.currentUser;
    userButtons.forEach(b => b.classList.toggle('active', b.dataset.user === state.currentUser));
  }

  // ===== GOAL MODAL OPEN/CLOSE =====
  addGoalBtn.addEventListener('click', () => {
    goalModal.classList.add('active');
    goalForm.reset();
    document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
    document.getElementById('delete-goal-btn').style.display = 'none';
  });
  cancelGoalBtn.addEventListener('click', () => goalModal.classList.remove('active'));

  // ===== ALERTAS =====
  window.abrirAlerta = function () {
    document.getElementById('alert-modal').classList.add('active');
  };
  window.fecharAlerta = function () {
    document.getElementById('alert-modal').classList.remove('active');
  };

  function diasRestantes(dateStr) {
    const hoje = new Date();
    // normaliza para ignorar hora
    const base = new Date(hoje.toISOString().split('T')[0] + 'T00:00:00');
    const venc = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((venc - base) / 86400000); // 1 dia em ms
    return diff; // negativo = atrasado
  }

  function verificarContasAVencer() {
    const proximas = state.payables
      .filter(conta => {
        const dias = diasRestantes(conta.date);
        return !conta.paid && dias >= 0 && dias <= 5;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    alertCount.textContent = proximas.length;
    alertIcon.classList.toggle('ativo', proximas.length > 0);

    alertList.innerHTML = proximas.length
      ? proximas
          .map(c => {
            const d = diasRestantes(c.date);
            const quando = d === 0 ? 'vence hoje' : `vence em ${d} dia${d > 1 ? 's' : ''}`;
            return `<li>${c.description} — ${quando} (${formatDateBR(c.date)})</li>`;
          })
          .join('')
      : '<li>Nenhuma conta próxima do vencimento</li>';
  }

  // chama na primeira carga
  verificarContasAVencer();

  // ===== SERVICE WORKER =====
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  }
});

// Fora do DOMContentLoaded
window.connectBank = async function (bankName) {
  try {
    alert(`Integração com ${bankName} em desenvolvimento. Em breve estará disponível.`);
  } catch (e) {
    console.error('Erro na conexão:', e);
    alert(`Não foi possível conectar ao ${bankName}. Tente novamente mais tarde.`);
  }
};
