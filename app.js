// app.js - VERSÃO REVISADA E COMPLETA
// - Requisitos: index.html já expõe window.firebase com Auth & Firestore funções
// - Funções principais: Autenticação obrigatória, backup local+cloud, realtime sync, CRUD, PWA support

document.addEventListener('DOMContentLoaded', () => {
  /**************************************************************************
   * 1) Dependências (injetadas pelo index.html em window.firebase)
   **************************************************************************/
  const {
    auth, db, onAuthStateChanged, GoogleAuthProvider,
    signInWithPopup, signInWithRedirect, signOut,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
    sendPasswordResetEmail, collection, doc, setDoc, getDocs,
    onSnapshot, writeBatch
  } = window.firebase || {};

  if (!window.firebase) {
    console.error('window.firebase não encontrado. Verifique index.html.');
  }

  /**************************************************************************
   * 2) DOM references (IDs e elementos assumidos do index.html)
   **************************************************************************/
  const appContainer = document.querySelector('.app-container');
  const authModal = document.getElementById('auth-modal');
  const loginEmailBtn = document.getElementById('btn-login-email');
  const signupEmailBtn = document.getElementById('btn-signup-email');
  const loginGoogleBtn = document.getElementById('btn-login-google');
  const resetBtn = document.getElementById('btn-reset');

  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const addTransactionBtn = document.getElementById('add-transaction-btn');
  const transactionModal = document.getElementById('transaction-modal');
  const transactionForm = document.getElementById('transaction-form');
  const transactionIdInput = document.getElementById('transaction-id');
  const transactionTypeInput = document.getElementById('transaction-type');
  const typeExpenseBtn = document.getElementById('type-expense-btn');
  const typeIncomeBtn = document.getElementById('type-income-btn');
  const categorySelect = document.getElementById('category');
  const deleteTransactionBtn = document.getElementById('delete-transaction-btn');

  const addGoalBtn = document.getElementById('add-goal-btn');
  const goalModal = document.getElementById('goal-modal');
  const goalForm = document.getElementById('goal-form');
  const goalList = document.getElementById('goal-list');

  const addPayableBtn = document.getElementById('add-payable-btn');
  const payableModal = document.getElementById('payable-modal');
  const payableForm = document.getElementById('payable-form');
  const payableList = document.getElementById('payable-list');

  const exportDataBtn = document.getElementById('export-data-btn');
  const currentUserNameEl = document.getElementById('current-user-name');
  const perfilUsuarioEl = document.getElementById('perfil-usuario');
  const perfilEmailEl = document.getElementById('perfil-email');
  const perfilBancoEl = document.getElementById('perfil-banco');

  const chartBtns = document.querySelectorAll('.chart-btn');
  const chartTitle = document.getElementById('chart-title');
  const transactionListEl = document.getElementById('transaction-list');

  // safe getter
  const $ = id => document.getElementById(id) || null;

  /**************************************************************************
   * 3) App state (persistido em localStorage)
   **************************************************************************/
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
    goals: JSON.parse(localStorage.getItem('goals') || '[]'),
    payables: JSON.parse(localStorage.getItem('payables') || '[]'),
    currentUser: localStorage.getItem('currentUser') || 'Usuário',
    users: JSON.parse(localStorage.getItem('users') || '["Pessoal"]'),
    currentDate: new Date(),
    expenseCategories: ['Alimentação','Transporte','Moradia','Lazer','Saúde','Empréstimo','Cartão de Crédito','Energia','Água','Gás','Internet','Investimento','Outros'],
    incomeCategories: ['Salário','Combustível','Aluguel','Outros'],
    chartType: 'all'
  };

  // firebase runtime
  let currentUid = null;
  let unsubscribers = [];

  /**************************************************************************
   * 4) Utilitários
   **************************************************************************/
  function formatCurrency(v) {
    if (v == null || isNaN(v)) return 'R$ 0,00';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    try { return new Date(dateStr + 'T03:00:00').toLocaleDateString('pt-BR'); } catch { return dateStr; }
  }
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + '-' + Math.floor(Math.random()*10000);
  }
  function openModal(el){ if(!el) return; el.classList.add('active'); el.style.display='block'; }
  function closeModal(el){ if(!el) return; el.classList.remove('active'); el.style.display='none'; }

  function hideApp() {
    if (appContainer) appContainer.style.visibility = 'hidden';
    if (authModal) authModal.style.display = 'block';
  }
  function showApp() {
    if (appContainer) appContainer.style.visibility = 'visible';
    if (authModal) authModal.style.display = 'none';
  }

  /**************************************************************************
   * 5) FIRESTORE SYNC: saveAllToCloud(), firstCloudSync(), realtime listeners
   **************************************************************************/
  async function saveAllToCloud() {
    if (!currentUid || !db || !writeBatch) return;
    try {
      const batch = writeBatch(db);
      const putAll = (name, arr) => {
        const colRef = collection(db, 'users', currentUid, name);
        (arr || []).forEach(item => {
          const id = item.id || generateId();
          const ref = doc(colRef, String(id));
          batch.set(ref, item, { merge: true });
        });
      };
      putAll('transactions', state.transactions);
      putAll('goals', state.goals);
      putAll('payables', state.payables);
      await batch.commit();
      console.log('Backup para Firestore concluído.');
    } catch (err) {
      console.error('Erro em saveAllToCloud:', err);
      // Não propaga — continua com localStorage
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

      // Se a nuvem tem dados, adotamos (nuvem vence). Se preferir merge, substituir por merge logic.
      if ((remoteTx && remoteTx.length) || (remoteGoals && remoteGoals.length) || (remotePay && remotePay.length)) {
        state.transactions = remoteTx.length ? remoteTx : state.transactions;
        state.goals = remoteGoals.length ? remoteGoals : state.goals;
        state.payables = remotePay.length ? remotePay : state.payables;
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('goals', JSON.stringify(state.goals));
        localStorage.setItem('payables', JSON.stringify(state.payables));
        console.info('Dados da nuvem sincronizados para local.');
      } else {
        // Se nuvem vazia e local tem dados, subimos local para nuvem
        if ((state.transactions.length + state.goals.length + state.payables.length) > 0) {
          await saveAllToCloud();
        }
      }
    } catch (err) {
      console.error('Erro em firstCloudSync:', err);
    } finally {
      updateAll();
    }
  }

  function startRealtimeSync() {
    if (!currentUid || !db || !onSnapshot) return;
    stopRealtimeSync();
    const listen = (name, apply) => onSnapshot(collection(db, 'users', currentUid, name),
      snap => {
        const arr = snap.docs.map(d => d.data());
        apply(arr);
        // manter localStorage para offline
        localStorage.setItem(name, JSON.stringify(arr));
        updateAll();
      },
      err => console.error('onSnapshot error', name, err)
    );

    unsubscribers = [
      listen('transactions', arr => state.transactions = arr || []),
      listen('goals', arr => state.goals = arr || []),
      listen('payables', arr => state.payables = arr || [])
    ];
    console.log('Realtime listeners iniciados.');
  }

  function stopRealtimeSync() {
    unsubscribers.forEach(fn => { try { fn && fn(); } catch (e) { /* swallow */ } });
    unsubscribers = [];
    console.log('Realtime listeners removidos.');
  }

  /**************************************************************************
   * 6) saveAndRerender() centralizado - salva local e na nuvem (se logado)
   **************************************************************************/
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
      console.error('Erro em saveAndRerender:', err);
    } finally {
      updateAll();
    }
  }

  /**************************************************************************
   * 7) AUTH FLOW: observer + UI handlers (login / signup / google / reset / logout)
   **************************************************************************/
  // hide app until auth resolved
  if (auth && onAuthStateChanged) hideApp();

  if (onAuthStateChanged && auth) {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUid = user.uid;
        state.currentUser = user.displayName || user.email || state.currentUser;
        localStorage.setItem('currentUser', state.currentUser);
        if (currentUserNameEl) currentUserNameEl.textContent = state.currentUser;
        if (perfilUsuarioEl) perfilUsuarioEl.textContent = state.currentUser;
        if (perfilEmailEl) perfilEmailEl.textContent = user.email || '';
        showApp();
        // After login: sync
        try { await firstCloudSync(); } catch(e) { console.warn('firstCloudSync error', e); }
        startRealtimeSync();
        ensureLogoutButton();
      } else {
        // no user -> show auth modal and hide app
        currentUid = null;
        stopRealtimeSync();
        hideApp();
      }
    });
  } else {
    // if no firebase present, show app (dev mode)
    console.warn('Firebase auth not present, running in offline mode.');
    showApp();
  }

  // Auth UI handlers
  if (loginEmailBtn) loginEmailBtn.addEventListener('click', async () => {
    const email = ($('auth-email') && $('auth-email').value.trim()) || '';
    const pass = ($('auth-password') && $('auth-password').value) || '';
    if (!email || !pass) return alert('Informe e-mail e senha.');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error('Erro login email:', err);
      alert(err.message || 'Erro ao entrar.');
    }
  });

  if (signupEmailBtn) signupEmailBtn.addEventListener('click', async () => {
    const email = ($('auth-email') && $('auth-email').value.trim()) || '';
    const pass = ($('auth-password') && $('auth-password').value) || '';
    if (!email || !pass) return alert('Informe e-mail e senha para criar conta.');
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error('Erro criar conta:', err);
      alert(err.message || 'Erro ao criar conta.');
    }
  });

  if (resetBtn) resetBtn.addEventListener('click', async () => {
    const email = ($('auth-email') && $('auth-email').value.trim()) || '';
    if (!email) return alert('Informe o e-mail para recuperação.');
    try {
      await sendPasswordResetEmail(auth, email);
      alert('E-mail de redefinição enviado.');
    } catch (err) {
      console.error('Erro reset senha:', err);
      alert(err.message || 'Erro ao enviar e-mail.');
    }
  });

  if (loginGoogleBtn) loginGoogleBtn.addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle hiding modal
    } catch (err) {
      console.error('Erro login Google:', err);
      alert(err.message || 'Erro ao entrar com Google.');
    }
  });

  function ensureLogoutButton() {
    if ($('btn-logout')) return;
    const anchor = exportDataBtn || perfilUsuarioEl || document.body;
    if (!anchor) return;
    const btn = document.createElement('button');
    btn.id = 'btn-logout';
    btn.className = 'btn-secondary';
    btn.textContent = 'Sair';
    anchor.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', async () => {
      try { await signOut(auth); } catch (err) { console.error('Erro ao sair:', err); }
    });
  }

  /**************************************************************************
   * 8) CRUD UI bindings (Transactions, Goals, Payables)
   **************************************************************************/
  // Transactions: open modal
  function setTransactionType(type) {
    if (transactionTypeInput) transactionTypeInput.value = type;
    if (typeExpenseBtn) typeExpenseBtn.classList.toggle('active', type === 'expense');
    if (typeIncomeBtn) typeIncomeBtn.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }
  function updateCategoryOptions(type) {
    if (!categorySelect) return;
    categorySelect.innerHTML = '';
    const cats = type === 'expense' ? state.expenseCategories : state.incomeCategories;
    cats.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      categorySelect.appendChild(option);
    });
  }

  function openTransactionModal(transaction = null) {
    if (!transactionForm || !transactionModal) return;
    transactionForm.reset();
    setTransactionType(transaction ? transaction.type : 'expense');
    if (transaction) {
      transactionIdInput.value = transaction.id;
      transactionTypeInput.value = transaction.type;
      $('amount') && ($('amount').value = transaction.amount);
      $('description') && ($('description').value = transaction.description);
      categorySelect && (categorySelect.value = transaction.category);
      $('date') && ($('date').value = transaction.date);
      deleteTransactionBtn && (deleteTransactionBtn.style.display = 'inline-block');
    } else {
      transactionIdInput.value = '';
      deleteTransactionBtn && (deleteTransactionBtn.style.display = 'none');
      // set date to today
      const today = new Date().toISOString().slice(0,10);
      $('date') && ($('date').value = today);
    }
    openModal(transactionModal);
  }

  if (addTransactionBtn) addTransactionBtn.addEventListener('click', () => openTransactionModal());
  if (typeExpenseBtn) typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
  if (typeIncomeBtn) typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));

  if (transactionForm) transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = transactionIdInput && transactionIdInput.value;
    const type = transactionTypeInput && transactionTypeInput.value;
    const amount = parseFloat(($('amount') && $('amount').value) || 0);
    const description = ($('description') && $('description').value) || '';
    const category = (categorySelect && categorySelect.value) || '';
    const date = ($('date') && $('date').value) || '';
    const user = state.currentUser;

    if (!amount || !description || !category || !date) return alert('Preencha todos os campos.');
    if (id) {
      const idx = state.transactions.findIndex(t => t.id === id);
      if (idx > -1) state.transactions[idx] = { id, type, amount, description, category, date, user };
    } else {
      state.transactions.push({ id: generateId(), type, amount, description, category, date, user });
    }

    await saveAndRerender();
    closeModal(transactionModal);
  });

  if (deleteTransactionBtn) deleteTransactionBtn.addEventListener('click', async () => {
    const id = transactionIdInput && transactionIdInput.value;
    if (!id) return;
    if (!confirm('Deseja excluir esta transação?')) return;
    state.transactions = state.transactions.filter(t => t.id !== id);
    await saveAndRerender();
    closeModal(transactionModal);
  });

  // Goals
  if (addGoalBtn) addGoalBtn.addEventListener('click', () => {
    goalForm && goalForm.reset();
    openModal(goalModal);
  });
  if (goalForm) goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gid = $('goal-id') && $('goal-id').value;
    const gd = {
      id: gid || generateId(),
      name: $('goal-name') && $('goal-name').value,
      target: parseFloat($('goal-target') && $('goal-target').value) || 0,
      current: parseFloat($('goal-current') && $('goal-current').value) || 0,
      date: $('goal-date') && $('goal-date').value
    };
    if (!gd.name || !gd.target) return alert('Preencha os campos da meta.');
    const idx = state.goals.findIndex(g => g.id === gd.id);
    if (idx > -1) state.goals[idx] = gd; else state.goals.push(gd);
    await saveAndRerender();
    closeModal(goalModal);
  });

  window.editGoal = function(gid) {
    const goal = state.goals.find(g => g.id === gid);
    if (!goal) return;
    $('goal-id') && ($('goal-id').value = goal.id);
    $('goal-name') && ($('goal-name').value = goal.name);
    $('goal-target') && ($('goal-target').value = goal.target);
    $('goal-current') && ($('goal-current').value = goal.current);
    $('goal-date') && ($('goal-date').value = goal.date);
    openModal(goalModal);
  };

  window.deleteGoal = async function(gid) {
    if (!confirm('Excluir meta?')) return;
    state.goals = state.goals.filter(g => g.id !== gid);
    await saveAndRerender();
  };

  // Payables
  if (addPayableBtn) addPayableBtn.addEventListener('click', () => {
    payableForm && payableForm.reset();
    openModal(payableModal);
  });
  if (payableForm) payableForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('payable-id') && $('payable-id').value || generateId();
    const p = {
      id,
      description: $('payable-description') && $('payable-description').value,
      category: $('payable-category') && $('payable-category').value,
      amount: parseFloat($('payable-amount') && $('payable-amount').value) || 0,
      date: $('payable-date') && $('payable-date').value,
      paid: false
    };
    const idx = state.payables.findIndex(x => x.id === id);
    if (idx > -1) state.payables[idx] = p; else state.payables.push(p);
    await saveAndRerender();
    closeModal(payableModal);
  });

  window.editPayable = function(id) {
    const p = state.payables.find(pp => pp.id === id);
    if (!p) return;
    $('payable-id') && ($('payable-id').value = p.id);
    $('payable-description') && ($('payable-description').value = p.description);
    $('payable-category') && ($('payable-category').value = p.category);
    $('payable-amount') && ($('payable-amount').value = p.amount);
    $('payable-date') && ($('payable-date').value = p.date);
    openModal(payableModal);
  };

  window.deletePayable = async function(id) {
    if (!confirm('Excluir conta?')) return;
    state.payables = state.payables.filter(p => p.id !== id);
    await saveAndRerender();
  };

  window.markPayablePaid = async function(id) {
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) {
      state.payables[idx].paid = !state.payables[idx].paid;
      await saveAndRerender();
    }
  };

  /**************************************************************************
   * 9) Rendering (transactions, goals, payables, charts, summaries)
   **************************************************************************/
  function renderTransactionList(transactions) {
    if (!transactionListEl) return;
    transactionListEl.innerHTML = '';
    if (!transactions || transactions.length === 0) {
      transactionListEl.innerHTML = '<li>Nenhuma transação neste filtro.</li>';
      return;
    }
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(t => {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.dataset.id = t.id;
      const isIncome = t.type === 'income';
      li.innerHTML = `
        <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
          <span class="material-icons-sharp">${isIncome ? 'arrow_upward' : 'arrow_downward'}</span>
        </div>
        <div class="transaction-details">
          <p>${t.description}</p>
          <span>${t.category} • ${formatDateBR(t.date)}</span>
        </div>
        <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
        </div>
      `;
      li.addEventListener('click', () => openTransactionModal(t));
      transactionListEl.appendChild(li);
    });
  }

  function renderGoals() {
    if (!goalList) return;
    goalList.innerHTML = '';
    if (state.goals.length === 0) { goalList.innerHTML = '<p>Nenhuma meta financeira cadastrada.</p>'; return; }
    state.goals.forEach(goal => {
      const div = document.createElement('div');
      div.className = 'goal-card';
      div.innerHTML = `
        <span class="meta-title">${goal.name}</span>
        <span class="meta-info">Alvo: <strong>${formatCurrency(goal.target)}</strong></span>
        <span class="meta-info">Atual: <strong>${formatCurrency(goal.current)}</strong></span>
        <span class="meta-info">Limite: <strong>${formatDateBR(goal.date)}</strong></span>
        <div class="goal-actions">
          <button class="btn-secondary" onclick="editGoal('${goal.id}')">Editar</button>
          <button class="btn-danger" onclick="deleteGoal('${goal.id}')">Excluir</button>
        </div>
      `;
      goalList.appendChild(div);
    });
  }

  function renderPayables() {
    if (!payableList) return;
    payableList.innerHTML = '';
    if (state.payables.length === 0) { payableList.innerHTML = '<p>Nenhuma conta lançada.</p>'; return; }
    state.payables.forEach(p => {
      const div = document.createElement('div');
      div.className = 'goal-card';
      div.innerHTML = `
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
      payableList.appendChild(div);
    });
  }

  // Chart update - calls to your existing chart module if present
  function atualizarGraficoMensal() {
    try {
      const updateExpenseChart = window.updateExpenseChart || null;
      if (!updateExpenseChart) return;
      const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
      const cats = state.expenseCategories;
      updateExpenseChart(monthFiltered, cats);
    } catch (err) { console.warn('Erro atualizarGraficoMensal:', err); }
  }

  function renderCategorySummary(transactions) {
    const container = $('category-summary');
    if (!container) return;
    container.innerHTML = '';
    const summary = {};
    (transactions || []).forEach(t => {
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
        </div>
      `;
      container.appendChild(card);
    });
  }

  function getCategoryIcon(cat) {
    const icons = {
      'Alimentação':'restaurant','Transporte':'directions_bus','Moradia':'home','Lazer':'sports_esports','Saúde':'local_hospital',
      'Empréstimo':'account_balance','Cartão de Crédito':'credit_card','Energia':'bolt','Água':'water_drop','Gás':'local_fire_department',
      'Internet':'wifi','Investimento':'trending_up','Outros':'category','Salário':'attach_money','Combustível':'local_gas_station','Aluguel':'business'
    };
    return icons[cat] || 'category';
  }

  function renderSummary(transactions) {
    const inc = (transactions || []).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp = (transactions || []).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const bal = inc - exp;
    $('month-income') && ($('month-income').textContent = formatCurrency(inc));
    $('month-expense') && ($('month-expense').textContent = formatCurrency(exp));
    $('month-balance') && ($('month-balance').textContent = formatCurrency(bal));
    $('month-balance') && ($('month-balance').style.color = bal >= 0 ? 'var(--text-light)' : '#ff8a80');
  }

  /**************************************************************************
   * 10) Filters, updateAll and UI wiring
   **************************************************************************/
  function filterTransactionsByMonth(transactions, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return (transactions || []).filter(t => {
      const d = new Date(t.date + 'T03:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  function updateAll() {
    // refresh data-driven UI
    const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
    renderSummary(monthFiltered);
    // chart filtering
    let display = monthFiltered;
    if (state.chartType === 'expense') display = monthFiltered.filter(t => t.type === 'expense');
    if (state.chartType === 'income') display = monthFiltered.filter(t => t.type === 'income');
    renderTransactionList(display);
    atualizarGraficoMensal();
    renderGoals();
    renderPayables();
    renderCategorySummary(display);
    updateMonthDisplay();
    updateUserUI();
    verificarContasAVencer();
  }

  function updateMonthDisplay() {
    const el = $('current-month-year');
    if (!el) return;
    el.textContent = state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }
  function updateUserUI() {
    if (currentUserNameEl) currentUserNameEl.textContent = state.currentUser;
    if (perfilUsuarioEl) perfilUsuarioEl.textContent = state.currentUser;
  }

  // nav buttons
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      if (page) {
        pages.forEach(p => p.classList.remove('active'));
        const sel = document.getElementById(page);
        if (sel) sel.classList.add('active');
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        // small actions
        if (page === 'goals-page') renderGoals();
        if (page === 'payables-page') renderPayables();
      }
    });
  });

  // prev/next month
  const prevMonth = $('prev-month'), nextMonth = $('next-month'), resumoPrev = $('resumo-prev-month'), resumoNext = $('resumo-next-month');
  prevMonth && prevMonth.addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth()-1); updateAll(); });
  nextMonth && nextMonth.addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth()+1); updateAll(); });
  resumoPrev && resumoPrev.addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth()-1); updateAll(); });
  resumoNext && resumoNext.addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth()+1); updateAll(); });

  chartBtns.forEach(btn => btn.addEventListener('click', () => {
    chartBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.chartType = btn.getAttribute('data-type') || 'all';
    updateAll();
  }));

  /**************************************************************************
   * 11) Alerts for payables due, export, theme, reset
   **************************************************************************/
  function diasRestantes(dateStr) {
    const hoje = new Date();
    const v = new Date(dateStr + 'T03:00:00');
    const diff = v - hoje;
    return Math.ceil(diff / (1000*60*60*24));
  }

  function verificarContasAVencer() {
    const proximas = state.payables.filter(p => !p.paid && diasRestantes(p.date) >= 0 && diasRestantes(p.date) <= 5);
    $('alert-count') && ($('alert-count').textContent = String(proximas.length));
    const list = $('alert-list');
    if (!list) return;
    list.innerHTML = proximas.length ? proximas.map(p => `<li>${p.description} vence em ${formatDateBR(p.date)}</li>`).join('') : '<li>Nenhuma conta próxima do vencimento</li>';
  }

  if (exportDataBtn) exportDataBtn.addEventListener('click', () => {
    const payload = { transactions: state.transactions, goals: state.goals, payables: state.payables };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dados_financeiros.json'; a.click(); URL.revokeObjectURL(url);
  });

  window.trocarTema = function() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('tema', isDark ? 'dark' : 'light');
  };

  window.resetarApp = function() {
    if (!confirm('Deseja apagar todos os dados locais?')) return;
    localStorage.removeItem('transactions');
    localStorage.removeItem('goals');
    localStorage.removeItem('payables');
    state.transactions = []; state.goals = []; state.payables = [];
    saveAndRerender();
    updateAll();
  };

  window.abrirAlerta = function(){ const m = $('alert-modal'); if (m) openModal(m); };
  window.fecharAlerta = function(){ const m = $('alert-modal'); if (m) closeModal(m); };

  window.abrirResumoMensal = function(){ pages.forEach(p=>p.classList.remove('active')); $('resumo-mensal-page') && $('resumo-mensal-page').classList.add('active'); updateAll(); };
  window.abrirResumoAnual = function(){ pages.forEach(p=>p.classList.remove('active')); $('resumo-anual-page') && $('resumo-anual-page').classList.add('active'); updateAll(); };
  window.abrirPagina = function(id){ pages.forEach(p=>p.classList.remove('active')); $(id) && $(id).classList.add('active'); };
  window.abrirConfig = function(){ pages.forEach(p=>p.classList.remove('active')); $('config-page') && $('config-page').classList.add('active'); };

  window.connectBank = function(bankName) { alert(`Integração com ${bankName} não implementada.`); };

  /**************************************************************************
   * 12) Service Worker
   **************************************************************************/
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('ServiceWorker registrado com scope:', reg.scope))
        .catch(err => console.warn('Erro ao registrar SW:', err));
    });
  }

  /**************************************************************************
   * 13) Final initialization
   **************************************************************************/
  // ensure initial UI state
  try {
    // set today's date in transaction modal date field if present
    const dateInput = $('date');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0,10);
  } catch (e) {}

  // initial render from local state (if auth not configured, app will still show)
  updateAll();

  // expose useful functions (in case HTML uses onclick)
  window.saveAndRerender = saveAndRerender;
  window.updateAll = updateAll;

  console.log('app.js inicializado (revisado).');
}); // DOMContentLoaded end
