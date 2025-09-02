// app.js - VERSÃO REVISADA (substitua todo o conteúdo anterior por este)
// Objetivo: autenticação obrigatória, sincronização Firestore <-> localStorage, PWA compatível
// Usa: window.firebase (declarado em index.html), Chart.js já carregado em index.html

/* eslint-disable no-unused-vars */
document.addEventListener('DOMContentLoaded', () => {
  // -------------------------
  // Dependências expostas por index.html (window.firebase)
  // -------------------------
  const {
    auth, db, onAuthStateChanged, GoogleAuthProvider,
    signInWithPopup, signInWithRedirect, signOut,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
    sendPasswordResetEmail, collection, doc, setDoc, getDocs,
    onSnapshot, writeBatch
  } = window.firebase || {};

  if (!window.firebase) {
    console.error('window.firebase não encontrado. Verifique se o index.html inicializou o SDK Firebase corretamente.');
  }

  // -------------------------
  // Elementos do DOM (muitos assumidos com base no seu HTML)
  // -------------------------
  const appContainer = document.querySelector('.app-container');
  const authModal = document.getElementById('auth-modal');
  const loginEmailBtn = document.getElementById('btn-login-email');
  const signupEmailBtn = document.getElementById('btn-signup-email');
  const resetBtn = document.getElementById('btn-reset');
  const loginGoogleBtn = document.getElementById('btn-login-google');

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
  const menuBotao = document.getElementById('menu-botao');
  const menuFlutuante = document.getElementById('menu-perfil');

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

  const exportDataBtn = document.getElementById('export-data-btn');
  const currentUserNameEl = document.getElementById('current-user-name');
  const perfilUsuarioEl = document.getElementById('perfil-usuario');
  const perfilEmailEl = document.getElementById('perfil-email');
  const perfilBancoEl = document.getElementById('perfil-banco');

  const chartTitle = document.getElementById('chart-title');
  const chartBtns = document.querySelectorAll('.chart-btn');
  const transactionListEl = document.getElementById('transaction-list');

  // fallback checks to avoid null errors in some pages
  function elOrNull(id) { return document.getElementById(id) || null; }

  // -------------------------
  // State inicial (lê localStorage)
  // -------------------------
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    payables: JSON.parse(localStorage.getItem('payables')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Usuário',
    users: JSON.parse(localStorage.getItem('users')) || ['Pessoal'],
    currentDate: (() => { const d = new Date(); d.setDate(1); return d; })(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
    chartType: 'all'
  };

  // -------------------------
  // Firebase runtime state
  // -------------------------
  let currentUid = null;
  let unsubscribers = [];

  // -------------------------
  // Utility helpers
  // -------------------------
  function formatCurrency(value) {
    if (isNaN(value)) return 'R$ 0,00';
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDateBR(dateStr) {
    try { return new Date(dateStr + 'T03:00:00').toLocaleDateString('pt-BR'); } catch { return dateStr; }
  }
  function generateId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.floor(Math.random() * 10000);
  }

  // -------------------------
  // UI helpers (modals, navigation)
  // -------------------------
  function openModal(modal) { if (!modal) return; modal.classList.add('active'); modal.style.display = 'block'; }
  function closeModal(modal) { if (!modal) return; modal.classList.remove('active'); modal.style.display = 'none'; }

  function navigateToPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    const sel = document.getElementById(pageId);
    if (sel) sel.classList.add('active');
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-page') === pageId);
    });
    // small adjustments after navigation
    if (pageId === 'goals-page') renderGoals();
    if (pageId === 'payables-page') renderPayables();
    if (pageId === 'profile-page') updateProfileUI();
  }

  navItems.forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); const pageId = item.getAttribute('data-page'); if (pageId) navigateToPage(pageId); });
  });

  // -------------------------
  // Authentication UI wiring
  // -------------------------
  // Ensure the app is hidden until login completes
  function showApp() {
    if (appContainer) appContainer.style.visibility = 'visible';
    if (authModal) authModal.style.display = 'none';
  }
  function hideApp() {
    if (appContainer) appContainer.style.visibility = 'hidden';
    if (authModal) { authModal.style.display = 'block'; }
  }

  // Buttons (bind safely; some may be null)
  if (loginEmailBtn) loginEmailBtn.addEventListener('click', async () => {
    const email = (elOrNull('auth-email') && elOrNull('auth-email').value) || '';
    const pass = (elOrNull('auth-password') && elOrNull('auth-password').value) || '';
    if (!email || !pass) return alert('Informe e-mail e senha.');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged handle will hide modal
    } catch (err) {
      console.error('login error', err);
      alert(err.message || 'Falha no login.');
    }
  });

  if (signupEmailBtn) signupEmailBtn.addEventListener('click', async () => {
    const email = (elOrNull('auth-email') && elOrNull('auth-email').value) || '';
    const pass = (elOrNull('auth-password') && elOrNull('auth-password').value) || '';
    if (!email || !pass) return alert('Informe e-mail e senha para criar conta.');
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error('signup error', err);
      alert(err.message || 'Falha ao criar conta.');
    }
  });

  if (resetBtn) resetBtn.addEventListener('click', async () => {
    const email = (elOrNull('auth-email') && elOrNull('auth-email').value) || '';
    if (!email) return alert('Informe seu e-mail primeiro.');
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Email de recuperação enviado.');
    } catch (err) {
      console.error('reset error', err);
      alert(err.message || 'Falha ao enviar e-mail.');
    }
  });

  if (loginGoogleBtn) loginGoogleBtn.addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Google login failed', err);
      alert(err.message || 'Erro no login com Google.');
    }
  });

  // Add a logout button in profile area if not present
  function ensureLogoutButton() {
    let logoutBtn = elOrNull('btn-logout');
    if (!logoutBtn) {
      // create after export button if exists, otherwise append to profile
      const anchor = exportDataBtn || perfilUsuarioEl || document.body;
      if (!anchor) return;
      const btn = document.createElement('button');
      btn.id = 'btn-logout';
      btn.className = 'btn-secondary';
      btn.textContent = 'Sair';
      anchor.insertAdjacentElement('afterend', btn);
      btn.addEventListener('click', async () => {
        try { await signOut(auth); } catch (err) { console.error('logout failed', err); }
      });
    }
  }

  // -------------------------
  // Auth state observer - critical: shows modal if not logged
  // -------------------------
  if (onAuthStateChanged && auth) {
    // hide UI until auth determined
    hideApp();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // logged
        currentUid = user.uid;
        state.currentUser = user.displayName || user.email || state.currentUser;
        localStorage.setItem('currentUser', state.currentUser);
        // update profile display
        if (currentUserNameEl) currentUserNameEl.textContent = state.currentUser;
        if (perfilUsuarioEl) perfilUsuarioEl.textContent = state.currentUser;
        if (perfilEmailEl) perfilEmailEl.textContent = user.email || '';
        showApp();
        ensureLogoutButton();
        // run initial cloud sync and realtime listeners
        try { await firstCloudSync(); } catch (e) { console.warn('firstCloudSync error', e); }
        startRealtimeSync();
      } else {
        // not logged
        currentUid = null;
        stopRealtimeSync();
        hideApp();
      }
    });
  } else {
    // If Firebase not present, just show app (useful for local dev without Firebase)
    console.warn('onAuthStateChanged or auth missing - running in offline mode');
    showApp();
  }

  // -------------------------
  // Save / Sync functions
  // -------------------------
  async function saveAllToCloud() {
    if (!currentUid || !db || !writeBatch) return;
    try {
      const batch = writeBatch(db);
      const putAll = (name, arr) => {
        const colRef = collection(db, 'users', currentUid, name);
        (arr || []).forEach(item => {
          const id = item.id || generateId();
          const ref = doc(colRef, String(id));
          batch.set(ref, { ...item }, { merge: true });
        });
      };
      putAll('transactions', state.transactions);
      putAll('goals', state.goals);
      putAll('payables', state.payables);
      await batch.commit();
    } catch (err) {
      console.error('saveAllToCloud error', err);
      // swallow - local copy still exists
    }
  }

  async function firstCloudSync() {
    if (!currentUid || !db || !getDocs) return;
    try {
      const pull = async (name) => {
        const snap = await getDocs(collection(db, 'users', currentUid, name));
        return snap.docs.map(d => d.data());
      };
      const [remoteTx, remoteGoals, remotePay] = await Promise.all([
        pull('transactions'), pull('goals'), pull('payables')
      ]);
      // If remote has data, we adopt it; otherwise keep local.
      if ((remoteTx && remoteTx.length) || (remoteGoals && remoteGoals.length) || (remotePay && remotePay.length)) {
        // Optionally: merge by id - here we prefer remote data
        state.transactions = remoteTx.length ? remoteTx : state.transactions;
        state.goals = remoteGoals.length ? remoteGoals : state.goals;
        state.payables = remotePay.length ? remotePay : state.payables;
        // persist locally
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('goals', JSON.stringify(state.goals));
        localStorage.setItem('payables', JSON.stringify(state.payables));
        updateAll();
      }
    } catch (err) {
      console.error('firstCloudSync failed', err);
    }
  }

  function startRealtimeSync() {
    if (!currentUid || !db || !onSnapshot) return;
    stopRealtimeSync();
    const listen = (name, apply) => onSnapshot(collection(db, 'users', currentUid, name),
      snap => {
        const arr = snap.docs.map(d => d.data());
        apply(arr);
        localStorage.setItem(name, JSON.stringify(arr));
        updateAll();
      },
      err => console.error('onSnapshot error', name, err)
    );

    unsubscribers = [
      listen('transactions', arr => { state.transactions = arr || []; }),
      listen('goals', arr => { state.goals = arr || []; }),
      listen('payables', arr => { state.payables = arr || []; })
    ];
  }

  function stopRealtimeSync() {
    unsubscribers.forEach(fn => { try { fn && fn(); } catch {} });
    unsubscribers = [];
  }

  async function saveAndRerender() {
    try {
      localStorage.setItem('transactions', JSON.stringify(state.transactions));
      localStorage.setItem('goals', JSON.stringify(state.goals));
      localStorage.setItem('payables', JSON.stringify(state.payables));
      verificarContasAVencer();
      if (currentUid) {
        await saveAllToCloud();
      }
    } catch (err) {
      console.error('saveAndRerender error', err);
    } finally {
      updateAll();
    }
  }

  // -------------------------
  // UI: Transactions CRUD
  // -------------------------
  function setTransactionType(type) {
    if (!transactionTypeInput) return;
    transactionTypeInput.value = type;
    if (typeExpenseBtn) typeExpenseBtn.classList.toggle('active', type === 'expense');
    if (typeIncomeBtn) typeIncomeBtn.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }

  function updateCategoryOptions(type) {
    if (!categorySelect) return;
    categorySelect.innerHTML = '';
    const cats = type === 'expense' ? state.expenseCategories : state.incomeCategories;
    cats.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }

  function openTransactionModal(transaction = null) {
    if (!transactionForm || !transactionModal) return;
    transactionForm.reset();
    setCurrentDate();
    transactionIdInput && (transactionIdInput.value = '');
    deleteTransactionBtn && (deleteTransactionBtn.style.display = 'none');
    transactionModalTitle && (transactionModalTitle.textContent = transaction ? 'Editar Transação' : 'Nova Transação');

    if (transaction) {
      transactionTypeInput && (transactionTypeInput.value = transaction.type);
      setTransactionType(transaction.type);
      elOrNull('amount') && (elOrNull('amount').value = transaction.amount);
      elOrNull('description') && (elOrNull('description').value = transaction.description);
      categorySelect && (categorySelect.value = transaction.category);
      elOrNull('date') && (elOrNull('date').value = transaction.date);
      transactionIdInput && (transactionIdInput.value = transaction.id);
      deleteTransactionBtn && (deleteTransactionBtn.style.display = 'inline-block');
    } else {
      setTransactionType('expense');
    }
    openModal(transactionModal);
  }

  if (addButton) addButton.addEventListener('click', () => openTransactionModal());

  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(transactionModal));

  if (deleteTransactionBtn) deleteTransactionBtn.addEventListener('click', () => {
    const id = (transactionIdInput && transactionIdInput.value) || null;
    if (!id) return;
    if (!confirm('Excluir transação?')) return;
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveAndRerender();
    closeModal(transactionModal);
  });

  if (transactionForm) transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = transactionIdInput && transactionIdInput.value;
    const type = transactionTypeInput && transactionTypeInput.value;
    const amount = parseFloat((elOrNull('amount') && elOrNull('amount').value) || 0);
    const description = (elOrNull('description') && elOrNull('description').value) || '';
    const category = (categorySelect && categorySelect.value) || '';
    const date = (elOrNull('date') && elOrNull('date').value) || '';
    const user = state.currentUser;

    if (!amount || !description || !category || !date) {
      return alert('Preencha todos os campos.');
    }

    if (id) {
      const idx = state.transactions.findIndex(t => t.id === id);
      if (idx > -1) state.transactions[idx] = { id, type, amount, description, category, date, user };
    } else {
      state.transactions.push({
        id: generateId(),
        type, amount, description, category, date, user
      });
    }

    saveAndRerender();
    closeModal(transactionModal);
  });

  if (typeExpenseBtn) typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
  if (typeIncomeBtn) typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));

  // -------------------------
  // Goals CRUD
  // -------------------------
  if (addGoalBtn) addGoalBtn.addEventListener('click', () => {
    if (goalForm) goalForm.reset();
    if (elOrNull('goal-id')) elOrNull('goal-id').value = '';
    document.getElementById('goal-modal') && openModal(goalModal);
  });
  if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', () => closeModal(goalModal));

  if (goalForm) goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const goalId = elOrNull('goal-id') && elOrNull('goal-id').value;
    const goalData = {
      id: goalId || generateId(),
      name: elOrNull('goal-name') && elOrNull('goal-name').value,
      target: parseFloat(elOrNull('goal-target') && elOrNull('goal-target').value) || 0,
      current: parseFloat(elOrNull('goal-current') && elOrNull('goal-current').value) || 0,
      date: elOrNull('goal-date') && elOrNull('goal-date').value
    };
    if (!goalData.name || !goalData.target) return alert('Preencha todos os campos da meta.');
    const idx = state.goals.findIndex(g => g.id === goalData.id);
    if (idx > -1) state.goals[idx] = goalData;
    else state.goals.push(goalData);
    saveAndRerender();
    closeModal(goalModal);
  });

  window.editGoal = function (goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;
    if (elOrNull('goal-id')) elOrNull('goal-id').value = goal.id;
    elOrNull('goal-name') && (elOrNull('goal-name').value = goal.name);
    elOrNull('goal-target') && (elOrNull('goal-target').value = goal.target);
    elOrNull('goal-current') && (elOrNull('goal-current').value = goal.current);
    elOrNull('goal-date') && (elOrNull('goal-date').value = goal.date);
    openModal(goalModal);
  };

  window.deleteGoal = function (goalId) {
    if (!confirm('Excluir meta?')) return;
    state.goals = state.goals.filter(g => g.id !== goalId);
    saveAndRerender();
  };

  // -------------------------
  // Payables CRUD
  // -------------------------
  if (addPayableBtn) addPayableBtn.addEventListener('click', () => {
    payableForm && payableForm.reset();
    elOrNull('payable-id') && (elOrNull('payable-id').value = '');
    openModal(payableModal);
  });
  if (cancelPayableBtn) cancelPayableBtn.addEventListener('click', () => closeModal(payableModal));

  if (payableForm) payableForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = elOrNull('payable-id') && elOrNull('payable-id').value || generateId();
    const payable = {
      id,
      description: elOrNull('payable-description') && elOrNull('payable-description').value,
      category: elOrNull('payable-category') && elOrNull('payable-category').value,
      amount: parseFloat(elOrNull('payable-amount') && elOrNull('payable-amount').value) || 0,
      date: elOrNull('payable-date') && elOrNull('payable-date').value,
      paid: false
    };
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) state.payables[idx] = payable;
    else state.payables.push(payable);
    saveAndRerender();
    closeModal(payableModal);
  });

  window.markPayablePaid = function (id) {
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) {
      state.payables[idx].paid = !state.payables[idx].paid;
      saveAndRerender();
    }
  };
  window.editPayable = function (id) {
    const p = state.payables.find(pp => pp.id === id);
    if (!p) return;
    elOrNull('payable-id') && (elOrNull('payable-id').value = p.id);
    elOrNull('payable-description') && (elOrNull('payable-description').value = p.description);
    elOrNull('payable-category') && (elOrNull('payable-category').value = p.category);
    elOrNull('payable-amount') && (elOrNull('payable-amount').value = p.amount);
    elOrNull('payable-date') && (elOrNull('payable-date').value = p.date);
    openModal(payableModal);
  };
  window.deletePayable = function (id) {
    if (!confirm('Excluir conta?')) return;
    state.payables = state.payables.filter(p => p.id !== id);
    saveAndRerender();
  };

  // -------------------------
  // Render functions (transactions, goals, payables, charts)
  // -------------------------
  function renderTransactionList(transactions) {
    if (!transactionListEl) return;
    transactionListEl.innerHTML = '';
    if (!transactions || !transactions.length) {
      transactionListEl.innerHTML = '<li>Nenhuma transação.</li>';
      return;
    }
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(t => {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.dataset.id = t.id;
      li.innerHTML = `
        <div class="transaction-icon">${t.type === 'income' ? '➕' : '➖'}</div>
        <div class="transaction-details">
          <p>${t.description}</p>
          <small>${t.category} • ${formatDateBR(t.date)}</small>
        </div>
        <div class="transaction-amount">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</div>
      `;
      li.addEventListener('click', () => openTransactionModal(t));
      transactionListEl.appendChild(li);
    });
  }

  function renderGoals() {
    if (!goalList) return;
    goalList.innerHTML = '';
    if (!state.goals.length) { goalList.innerHTML = '<p>Nenhuma meta.</p>'; return; }
    state.goals.forEach(g => {
      const card = document.createElement('div');
      card.className = 'goal-card';
      card.innerHTML = `
        <div><strong>${g.name}</strong></div>
        <div>Alvo: ${formatCurrency(g.target)}</div>
        <div>Atual: ${formatCurrency(g.current)}</div>
        <div>Prazo: ${formatDateBR(g.date)}</div>
        <div class="goal-actions">
          <button onclick="editGoal('${g.id}')">Editar</button>
          <button onclick="deleteGoal('${g.id}')">Excluir</button>
        </div>
      `;
      goalList.appendChild(card);
    });
  }

  function renderPayables() {
    if (!payableList) return;
    payableList.innerHTML = '';
    if (!state.payables.length) { payableList.innerHTML = '<p>Nenhuma conta.</p>'; return; }
    state.payables.forEach(p => {
      const card = document.createElement('div');
      card.className = 'goal-card';
      card.innerHTML = `
        <div><strong>${p.description}</strong></div>
        <div>${formatCurrency(p.amount)} - ${formatDateBR(p.date)}</div>
        <div>Status: ${p.paid ? '<span style="color:green">Pago</span>' : '<span style="color:red">A pagar</span>'}</div>
        <div class="goal-actions">
          <button onclick="markPayablePaid('${p.id}')">${p.paid ? 'Desfazer' : 'Marcar Pago'}</button>
          <button onclick="editPayable('${p.id}')">Editar</button>
          <button onclick="deletePayable('${p.id}')">Excluir</button>
        </div>
      `;
      payableList.appendChild(card);
    });
  }

  function atualizarGraficoMensal() {
    // uses external chart-setup.js exports if present
    try {
      const updateExpenseChart = window.updateExpenseChart || (window.imports && window.imports.updateExpenseChart);
      const createExpenseChart = window.createExpenseChart || null;
      // we'll call create only once
      if (createExpenseChart && !window.__expenseChartCreated) {
        try { createExpenseChart(); window.__expenseChartCreated = true; } catch (e) { /* ignore */ }
      }
      if (updateExpenseChart) {
        const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
        const cats = state.expenseCategories;
        updateExpenseChart(monthFiltered, cats);
      }
    } catch (err) { console.warn('grafico update error', err); }
  }

  // -------------------------
  // Helpers: filters and date related
  // -------------------------
  function filterTransactionsByMonth(transactions, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return (transactions || []).filter(t => {
      const d = new Date(t.date + 'T03:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  function setCurrentDate() {
    const today = new Date();
    state.currentDate = today;
    elOrNull('date') && (elOrNull('date').value = today.toISOString().slice(0, 10));
  }

  // -------------------------
  // Summary / updateAll
  // -------------------------
  function renderSummary(transactions) {
    const income = (transactions || []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = (transactions || []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const bal = income - expense;
    elOrNull('month-income') && (elOrNull('month-income').textContent = formatCurrency(income));
    elOrNull('month-expense') && (elOrNull('month-expense').textContent = formatCurrency(expense));
    elOrNull('month-balance') && (elOrNull('month-balance').textContent = formatCurrency(bal));
  }

  function updateAll() {
    // refresh UI
    const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
    renderSummary(monthFiltered);
    // apply chart filters if any
    renderTransactionList(monthFiltered.filter(t => {
      if (state.chartType === 'expense') return t.type === 'expense';
      if (state.chartType === 'income') return t.type === 'income';
      return true;
    }));
    atualizarGraficoMensal();
    renderGoals();
    renderPayables();
    updateMonthDisplay();
    updateUserUI();
    verificarContasAVencer();
  }

  function updateMonthDisplay() {
    const el = elOrNull('current-month-year');
    if (!el) return;
    el.textContent = state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function updateUserUI() {
    if (currentUserNameEl) currentUserNameEl.textContent = state.currentUser;
  }

  // -------------------------
  // Alerts / due payables
  // -------------------------
  function diasRestantes(dateStr) {
    const hoje = new Date();
    const v = new Date(dateStr + 'T03:00:00');
    const diff = v - hoje;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function verificarContasAVencer() {
    const proximas = state.payables.filter(p => {
      const d = diasRestantes(p.date);
      return d >= 0 && d <= 5 && !p.paid;
    });
    elOrNull('alert-count') && (elOrNull('alert-count').textContent = String(proximas.length));
    const alertList = elOrNull('alert-list');
    if (!alertList) return;
    alertList.innerHTML = proximas.length ? proximas.map(p => `<li>${p.description} vence em ${formatDateBR(p.date)}</li>`).join('') : '<li>Nenhuma conta próxima do vencimento</li>';
  }

  // -------------------------
  // Export / theme / reset
  // -------------------------
  if (exportDataBtn) exportDataBtn.addEventListener('click', () => {
    const payload = { transactions: state.transactions, goals: state.goals, payables: state.payables };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dados_financeiros.json'; a.click();
    URL.revokeObjectURL(url);
  });

  window.trocarTema = function () {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('tema', isDark ? 'dark' : 'light');
  };

  window.resetarApp = function () {
    if (!confirm('Deseja apagar todos os dados locais?')) return;
    localStorage.removeItem('transactions');
    localStorage.removeItem('goals');
    localStorage.removeItem('payables');
    state.transactions = []; state.goals = []; state.payables = [];
    saveAndRerender();
    updateAll();
  };

  // -------------------------
  // Misc UI wiring (nav, prev/next month, chart buttons)
  // -------------------------
  elOrNull('resumo-prev-month') && elOrNull('resumo-prev-month').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    updateAll();
  });
  elOrNull('resumo-next-month') && elOrNull('resumo-next-month').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    updateAll();
  });

  chartBtns.forEach(btn => btn.addEventListener('click', () => {
    chartBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.chartType = btn.getAttribute('data-type') || 'all';
    updateAll();
  }));

  // -------------------------
  // Service Worker registration
  // -------------------------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registrado:', reg.scope);
    }).catch(err => console.warn('SW erro', err));
  }

  // -------------------------
  // Initialize UI and date
  // -------------------------
  try { setCurrentDate(); } catch (e) { /* ignore */ }
  updateAll();

  // Expose some functions for HTML onclick usage
  window.abrirResumoMensal = function () { navigateToPage('resumo-mensal-page'); };
  window.abrirResumoAnual = function () { navigateToPage('resumo-anual-page'); };
  window.abrirPagina = function (id) { navigateToPage(id); };
  window.abrirConfig = function () { navigateToPage('config-page'); };
  window.exportarDados = function () { exportDataBtn && exportDataBtn.click(); };
  window.connectBank = function (bankName) { alert(`Integração com ${bankName} não implementada.`); };

  // Make sure some globals exist for other modules (chart-setup)
  window.saveAndRerender = saveAndRerender;
  window.updateAll = updateAll;

  // Final log
  console.log('app.js inicializado');
}); // end DOMContentLoaded
