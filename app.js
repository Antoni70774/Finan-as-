
// --- app.js (UNIFICADO E REVISADO) ---
// Versão modular Firebase, sincronização local/cloud, UI de transações, metas, contas a pagar,
// menu perfil, navegação por data (mês/ano), gráficos mensal/anual, e export/import.
// Gerado para substituir a versão com duplicações mantendo os dados locais existentes.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signOut,
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
  GoogleAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, doc, setDoc,
  getDocs, onSnapshot, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
// Assumimos que existe chart-setup.js que exporta createExpenseChart e updateExpenseChart
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

// ------------------------ CONFIG FIREBASE ------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBQeYc0Y-eYONv3ZfvZoJEzOjoKR371P-Y",
  authDomain: "controle-financeiro-65744.firebaseapp.com",
  projectId: "controle-financeiro-65744",
  storageBucket: "controle-financeiro-65744.appspot.com",
  messagingSenderId: "587527394934",
  appId: "1:587527394934:web:c142740ef0139a5cf63157",
  measurementId: "G-RT2T1HNV4G"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ------------------------ ESTADO GLOBAL ------------------------
let currentUid = null;
let unsubscribers = [];
const state = {
  transactions: JSON.parse(localStorage.getItem('transactions')) || [],
  goals: JSON.parse(localStorage.getItem('goals')) || [],
  payables: JSON.parse(localStorage.getItem('payables')) || [],
  currentUser: localStorage.getItem('currentUser') || 'Bem Vindo',
  users: JSON.parse(localStorage.getItem('users')) || ['Esposo', 'Esposa'],
  currentDate: new Date(JSON.parse(localStorage.getItem('currentDate')) || Date.now()),
  expenseCategories: ['Alimentação','Transporte','Moradia','Lazer','Saúde','Empréstimo','Cartão de Crédito','Energia','Água','Gás','Internet','Investimento','Outros'],
  incomeCategories: ['Salário','Combustível','Aluguel','Outros'],
  chartType: localStorage.getItem('chartType') || 'all'
};

// Pequenas ajudas
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ------------------------ INICIALIZAÇÃO ------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Aplica tema salvo
  if (localStorage.getItem('tema') === 'dark') document.body.classList.add('dark-theme');

  // Inicializa gráficos (arquivo chart-setup.js deve existir)
  try { createExpenseChart(); } catch(e){ console.warn('createExpenseChart não disponível:', e); }

  bindUI();
  updateAll(); // render inicial

  // Service worker se disponível
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }
});

// ------------------------ BIND UI ------------------------
function bindUI() {
  // Autenticação
  $('#btn-login-email')?.addEventListener('click', async () => {
    try {
      const email = $('#auth-email').value.trim();
      const pass = $('#auth-password').value;
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro login.');
    }
  });
  $('#btn-signup-email')?.addEventListener('click', async () => {
    try {
      const email = $('#auth-email').value.trim();
      const pass = $('#auth-password').value;
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro criar conta.');
    }
  });
  $('#btn-reset')?.addEventListener('click', async () => {
    try {
      const email = $('#auth-email').value.trim();
      if (!email) return alert('Informe o e-mail.');
      await sendPasswordResetEmail(auth, email);
      alert('Email de redefinição enviado.');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro enviar reset.');
    }
  });
  $('#btn-login-google')?.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro login Google.');
    }
  });
  $('#btn-logout')?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      // não remove localStorage inteiro para preservar dados opcionais;
      // apenas remove uid e user-specific keys se desejar
      localStorage.removeItem('currentUser');
      currentUid = null;
      stopRealtimeSync();
      updateUserUI();
      location.reload();
    } catch (err) {
      console.error(err);
      alert('Erro ao efetuar logout.');
    }
  });

  // Menu perfil (abrir/fechar + clique fora)
  const menuBotao = $('#menu-botao');
  const menuFlutuante = $('#menu-perfil');
  menuBotao?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!menuFlutuante) return;
    menuFlutuante.style.display = (menuFlutuante.style.display === 'block') ? 'none' : 'block';
  });
  document.addEventListener('click', (e) => {
    const menu = $('#menu-perfil');
    const botao = $('#menu-botao');
    if (!menu || !botao) return;
    if (menu.style.display === 'block' && !menu.contains(e.target) && !botao.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  // Navegação entre páginas (nav items)
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.dataset.page;
      if (!pageId) return;
      $$('.page').forEach(p => p.classList.remove('active'));
      const page = document.getElementById(pageId);
      page?.classList.add('active');
      $$('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      // ações de página
      if (pageId === 'dashboard-page') {
        carregarResumoMensal();
        atualizarNomeDoMes();
        atualizarGraficoMensal();
      }
      if (pageId === 'payables-page') renderPayables();
      if (pageId === 'resumo-anual-page') atualizarGraficoAnual();
    });
  });

  // Controle mês (início/resumo)
  $('#prev-month')?.addEventListener('click', () => { changeMonth(-1); });
  $('#next-month')?.addEventListener('click', () => { changeMonth(1); });
  $('#resumo-prev-month')?.addEventListener('click', () => { changeMonth(-1); });
  $('#resumo-next-month')?.addEventListener('click', () => { changeMonth(1); });

  // Form transação
  $('#transaction-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleTransactionForm();
  });
  $('#cancel-btn')?.addEventListener('click', () => closeModal($('#transaction-modal')));
  $('#add-transaction-btn')?.addEventListener('click', () => openTransactionModal());

  // Tipo transação
  $('#type-expense-btn')?.addEventListener('click', () => setTransactionType('expense'));
  $('#type-income-btn')?.addEventListener('click', () => setTransactionType('income'));

  // Payable form
  $('#payable-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handlePayableForm();
  });
  $('#add-payable-btn')?.addEventListener('click', () => {
    $('#payable-id').value = '';
    $('#payable-form').reset();
    openModal($('#payable-modal'));
  });

  // Goal form
  $('#goal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleGoalForm();
  });
  $('#add-goal-btn')?.addEventListener('click', () => openGoalModal());

  // Export data
  $('#export-data-btn')?.addEventListener('click', exportData);

  // Chart buttons
  $$('.chart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.chart-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.chartType = btn.dataset.type || 'all';
      localStorage.setItem('chartType', state.chartType);
      updateAll();
    });
  });

  // User quick-switch buttons
  $$('.user-buttons button').forEach(b => {
    b.addEventListener('click', () => {
      state.currentUser = b.dataset.user;
      localStorage.setItem('currentUser', state.currentUser);
      updateAll();
    });
  });

  // Delete goal, delete payable handlers (delegation via window.* used in templates)
  window.editGoal = (id) => {
    const g = state.goals.find(x => x.id === id);
    if (!g) return;
    $('#goal-id').value = g.id;
    $('#goal-name').value = g.name;
    $('#goal-target').value = g.target;
    $('#goal-current').value = g.current;
    $('#goal-date').value = g.date;
    $('#goal-modal-title').textContent = 'Editar Meta';
    $('#delete-goal-btn').style.display = 'block';
    openModal($('#goal-modal'));
  };
  window.deleteGoal = (id) => {
    if (!confirm('Excluir meta?')) return;
    state.goals = state.goals.filter(g => g.id !== id);
    saveAndRerender();
  };
  window.editPayable = (id) => {
    const p = state.payables.find(x => x.id === id);
    if (!p) return;
    $('#payable-id').value = p.id;
    $('#payable-description').value = p.description;
    $('#payable-category').value = p.category;
    $('#payable-amount').value = p.amount;
    $('#payable-date').value = p.date;
    openModal($('#payable-modal'));
  };
  window.deletePayable = (id) => {
    if (!confirm('Excluir conta?')) return;
    state.payables = state.payables.filter(p => p.id !== id);
    saveAndRerender();
  };
  window.markPayablePaid = (id) => {
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) {
      state.payables[idx].paid = true;
      saveAndRerender();
    }
  };
  window.openTransaction = (id) => {
    const t = state.transactions.find(x => x.id === id);
    if (!t) return;
    openTransactionModal(t);
  };
}

// ------------------------ AUTOSYNC FIRESTORE ------------------------
onAuthStateChanged(auth, async (user) => {
  // Esta assinatura garante que, se o usuário fizer login por outro meio, UI será atualizada.
  if (user) {
    currentUid = user.uid;
    await pullCloudToLocal();
    startRealtimeSync();
  } else {
    currentUid = null;
    stopRealtimeSync();
  }
  updateUserUI();
});

async function pullCloudToLocal() {
  if (!currentUid) return;
  try {
    const pull = async (name) => {
      const snap = await getDocs(collection(db, 'users', currentUid, name));
      return snap.docs.map(d => d.data());
    };
    const [tx, gl, py] = await Promise.all([pull('transactions'), pull('goals'), pull('payables')]);
    if (tx.length || gl.length || py.length) {
      state.transactions = tx.length ? tx : state.transactions;
      state.goals = gl.length ? gl : state.goals;
      state.payables = py.length ? py : state.payables;
      localStorage.setItem('transactions', JSON.stringify(state.transactions));
      localStorage.setItem('goals', JSON.stringify(state.goals));
      localStorage.setItem('payables', JSON.stringify(state.payables));
    }
    updateAll();
  } catch (err) {
    console.error('pullCloudToLocal erro', err);
  }
}

function startRealtimeSync() {
  stopRealtimeSync();
  if (!currentUid) return;
  const listen = (name, apply) => onSnapshot(collection(db, 'users', currentUid, name), (snap) => {
    const arr = snap.docs.map(d => d.data());
    apply(arr);
    localStorage.setItem(name, JSON.stringify(arr));
    updateAll();
  });
  unsubscribers = [
    listen('transactions', arr => state.transactions = arr),
    listen('goals', arr => state.goals = arr),
    listen('payables', arr => state.payables = arr)
  ];
}

function stopRealtimeSync() {
  unsubscribers.forEach(f => { try { f(); } catch(e){} });
  unsubscribers = [];
}

async function saveAllToCloud() {
  if (!currentUid) return;
  try {
    const batch = writeBatch(db);
    const putAll = (name, arr) => {
      const colRef = collection(db, 'users', currentUid, name);
      arr.forEach(item => {
        const ref = doc(colRef, String(item.id));
        batch.set(ref, item, { merge: true });
      });
    };
    putAll('transactions', state.transactions);
    putAll('goals', state.goals);
    putAll('payables', state.payables);
    await batch.commit();
  } catch (err) {
    console.error('saveAllToCloud', err);
  }
}

// ------------------------ TRANSAÇÕES ------------------------
function openTransactionModal(transaction = null) {
  const m = $('#transaction-modal');
  if (!m) return;
  $('#transaction-form').reset?.();
  $('#transaction-id').value = transaction?.id || '';
  $('#transaction-modal-title').textContent = transaction ? 'Editar Transação' : 'Nova Transação';
  $('#delete-transaction-btn').style.display = transaction ? 'inline-block' : 'none';
  if (transaction) {
    setTransactionType(transaction.type);
    $('#amount').value = transaction.amount;
    $('#description').value = transaction.description;
    $('#category').value = transaction.category;
    $('#date').value = transaction.date;
  } else {
    setTransactionType('expense');
    // padrão data atual
    $('#date').value = new Date(state.currentDate).toISOString().split('T')[0];
  }
  openModal(m);
}
function handleTransactionForm() {
  const id = $('#transaction-id').value || null;
  const type = $('#transaction-type').value;
  const amount = parseFloat($('#amount').value) || 0;
  const description = $('#description').value.trim();
  const category = $('#category').value;
  const date = $('#date').value;
  const user = state.currentUser;

  if (!amount || !description || !category || !date) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  if (id) {
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx > -1) {
      state.transactions[idx] = { id, type, amount, description, category, date, user };
    }
  } else {
    const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    state.transactions.push({ id: newId, type, amount, description, category, date, user });
  }
  saveAndRerender();
  closeModal($('#transaction-modal'));
}

function deleteTransaction(id) {
  if (!confirm('Deseja excluir a transação?')) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveAndRerender();
}

// ------------------------ GOALS ------------------------
function openGoalModal(goal = null) {
  const m = $('#goal-modal');
  if (!m) return;
  $('#goal-form').reset?.();
  $('#goal-id').value = goal?.id || '';
  $('#goal-modal-title').textContent = goal ? 'Editar Meta' : 'Nova Meta Financeira';
  $('#delete-goal-btn').style.display = goal ? 'block' : 'none';
  if (goal) {
    $('#goal-name').value = goal.name;
    $('#goal-target').value = goal.target;
    $('#goal-current').value = goal.current;
    $('#goal-date').value = goal.date;
  }
  openModal(m);
}
function handleGoalForm() {
  const id = $('#goal-id').value || null;
  const name = $('#goal-name').value.trim();
  const target = parseFloat($('#goal-target').value) || 0;
  const current = parseFloat($('#goal-current').value) || 0;
  const date = $('#goal-date').value;

  if (!name || !target) {
    alert('Preencha nome e meta.');
    return;
  }
  if (id) {
    const idx = state.goals.findIndex(g => g.id === id);
    if (idx > -1) state.goals[idx] = { ...state.goals[idx], name, target, current, date };
  } else {
    const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    state.goals.push({ id: newId, name, target, current, date });
  }
  saveAndRerender();
  closeGoalModal();
}
function closeGoalModal() {
  closeModal($('#goal-modal'));
  $('#goal-form').reset?.();
  $('#goal-id').value = '';
  $('#goal-modal-title').textContent = 'Nova Meta Financeira';
  $('#delete-goal-btn').style.display = 'none';
}

// ------------------------ PAYABLES ------------------------
function handlePayableForm() {
  const id = $('#payable-id').value || null;
  const description = $('#payable-description').value.trim();
  const category = $('#payable-category').value;
  const amount = parseFloat($('#payable-amount').value) || 0;
  const date = $('#payable-date').value;
  if (!description || !amount || !date) {
    alert('Preencha todos os campos.');
    return;
  }
  if (id) {
    const idx = state.payables.findIndex(p => p.id === id);
    if (idx > -1) state.payables[idx] = { ...state.payables[idx], description, category, amount, date };
  } else {
    const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    state.payables.push({ id: newId, description, category, amount, date, paid: false });
  }
  saveAndRerender();
  closeModal($('#payable-modal'));
}

// ------------------------ RENDER / UI HELPERS ------------------------
function renderTransactionList(transactions) {
  const listEl = $('#transaction-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!transactions || transactions.length === 0) {
    listEl.innerHTML = '<li>Nenhuma transação neste filtro.</li>';
    return;
  }
  const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(t => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = t.id;
    const isIncome = t.type === 'income';
    const date = formatDateBR(t.date);
    li.innerHTML = `<div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
      <span class="material-icons-sharp">${isIncome?'arrow_upward':'arrow_downward'}</span>
    </div>
    <div class="transaction-details">
      <p>${t.description}</p>
      <span>${t.category} • ${date}</span>
    </div>
    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">${isIncome?'+':'-'} ${formatCurrency(t.amount)}</div>`;
    li.addEventListener('click', () => openTransactionModal(t));
    listEl.appendChild(li);
  });
}

function renderGoals() {
  const container = $('#goal-list');
  if (!container) return;
  container.innerHTML = '';
  state.goals.forEach(g => {
    const progress = g.target ? Math.min(100, (g.current/g.target)*100) : 0;
    const li = document.createElement('li');
    li.className = 'goal-item';
    li.innerHTML = `<h3>${g.name}</h3>
      <p>Meta: ${formatCurrency(g.target)} | Atual: ${formatCurrency(g.current)}</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%;"></div></div>
      <span>${progress.toFixed(0)}%</span>
      <button class="icon-btn" onclick="editGoal('${g.id}')"><span class="material-icons-sharp">edit</span></button>`;
    container.appendChild(li);
  });
}

function renderPayables() {
  const list = $('#payable-list');
  if (!list) return;
  list.innerHTML = '';
  const sorted = [...state.payables].sort((a,b) => new Date(a.date) - new Date(b.date));
  if (sorted.length === 0) list.innerHTML = '<li>Nenhuma conta a pagar</li>';
  sorted.forEach(p => {
    const days = diasRestantes(p.date);
    const isLate = days < 0 && !p.paid;
    const status = p.paid ? 'Paga' : (isLate ? 'Atrasada' : 'A pagar');
    const item = document.createElement('li');
    item.className = `payable-item ${p.paid?'paid': (isLate?'late':'pending')}`;
    item.innerHTML = `<div class="payable-info">
      <h3>${p.description}</h3>
      <p>Valor: ${formatCurrency(p.amount)} | Vence em: ${formatDateBR(p.date)}</p>
    </div>
    <div class="payable-actions">
      <span class="payable-status">${status}</span>
      <button class="icon-btn" onclick="editPayable('${p.id}')"><span class="material-icons-sharp">edit</span></button>
      <button class="icon-btn" onclick="deletePayable('${p.id}')"><span class="material-icons-sharp">delete</span></button>
      ${!p.paid?`<button class="icon-btn" onclick="markPayablePaid('${p.id}')"><span class="material-icons-sharp">done</span></button>`:''}
    </div>`;
    list.appendChild(item);
  });
}

// ------------------------ GRAFICOS MENSAL/ANUAL ------------------------
let annualChartInstance = null;
function atualizarGraficoAnual() {
  const canvas = $('#annual-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const receitas = Array(12).fill(0);
  const despesas = Array(12).fill(0);
  state.transactions.forEach(t => {
    const d = new Date(t.date);
    if (d.getFullYear() === state.currentDate.getFullYear()) {
      if (t.type === 'income') receitas[d.getMonth()] += t.amount;
      if (t.type === 'expense') despesas[d.getMonth()] += t.amount;
    }
  });
  if (annualChartInstance) try { annualChartInstance.destroy(); } catch(e) {}
  annualChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: meses, datasets: [{ label:'Receita', data:receitas }, { label:'Despesa', data:despesas }] },
    options: { responsive:true, plugins:{legend:{position:'top'}} }
  });
}

function atualizarGraficoMensal() {
  const canvas = $('#monthly-bar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const receitas = Array(12).fill(0);
  const despesas = Array(12).fill(0);
  state.transactions.forEach(t => {
    const d = new Date(t.date);
    if (d.getFullYear() === state.currentDate.getFullYear()) {
      if (t.type === 'income') receitas[d.getMonth()] += t.amount;
      if (t.type === 'expense') despesas[d.getMonth()] += t.amount;
    }
  });
  new Chart(ctx, { type:'bar', data:{ labels:meses, datasets:[{label:'Receita', data:receitas},{label:'Despesa', data:despesas}] }, options:{ responsive:true, plugins:{legend:{position:'top'}} } });
}

// ------------------------ UTILITÁRIOS ------------------------
function formatCurrency(v){ return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function formatDateBR(d){ try{ return new Date(d).toLocaleDateString('pt-BR'); }catch(e){ return d; } }
function diasRestantes(dateStr){ const hoje = new Date(); const v = new Date(dateStr); const diff = v - hoje; return Math.ceil(diff / (1000*60*60*24)); }
function openModal(m){ if (!m) return; m.classList.add('active'); }
function closeModal(m){ if (!m) return; m.classList.remove('active'); }
function setTransactionType(type){
  $('#transaction-type').value = type;
  $('#type-expense-btn')?.classList.toggle('active', type === 'expense');
  $('#type-income-btn')?.classList.toggle('active', type === 'income');
  const sel = $('#category');
  if (!sel) return;
  sel.innerHTML = '';
  const cats = (type === 'expense') ? state.expenseCategories : state.incomeCategories;
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
}

// ------------------------ SALVAR / SINCRONIZAR ------------------------
async function saveAndRerender() {
  try {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    localStorage.setItem('payables', JSON.stringify(state.payables));
    localStorage.setItem('currentUser', state.currentUser);
    localStorage.setItem('currentDate', JSON.stringify(state.currentDate));
    verificarContasAVencer();
    if (currentUid) await saveAllToCloud();
  } catch (err) { console.error('saveAndRerender', err); }
  updateAll();
}

function verificarContasAVencer() {
  const proximas = state.payables.filter(c => { const dias = diasRestantes(c.date); return dias >= 0 && dias <= 5 && !c.paid; });
  const alertCount = $('#alert-count'); const alertList = $('#alert-list'); const alertIcon = $('#alert-icon');
  if (alertCount) alertCount.textContent = proximas.length;
  if (alertIcon) alertIcon.classList.toggle('ativo', proximas.length > 0);
  if (alertList) {
    alertList.innerHTML = proximas.length ? proximas.map(c=>`<li>${c.description} - vence ${formatDateBR(c.date)}</li>`).join('') : '<li>Nenhuma conta próxima do vencimento</li>';
  }
}

// ------------------------ RESUMOS / FILTROS ------------------------
function filterTransactionsByMonth(transactions, date){
  const year = date.getFullYear(); const month = date.getMonth();
  return transactions.filter(t => { const d = new Date(t.date); return d.getFullYear()===year && d.getMonth()===month; });
}

function carregarResumoMensal(){
  const mes = state.currentDate.getMonth(); const ano = state.currentDate.getFullYear();
  const trans = filterTransactionsByMonth(state.transactions, state.currentDate);
  const receita = trans.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const despesa = trans.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  $('#monthly-revenue') && ($('#monthly-revenue').textContent = formatCurrency(receita));
  $('#monthly-expense') && ($('#monthly-expense').textContent = formatCurrency(despesa));
  $('#monthly-balance') && ($('#monthly-balance').textContent = formatCurrency(receita - despesa));
  renderTransactionList(trans);
  renderCategorySummary(trans);
}

function renderCategorySummary(transactions){
  const container = $('#category-summary'); if (!container) return;
  container.innerHTML = '';
  const summary = {};
  transactions.forEach(t => { if(!summary[t.category]) summary[t.category] = {total:0, type: t.type}; summary[t.category].total += t.amount; });
  Object.entries(summary).forEach(([cat,data]) => {
    const card = document.createElement('div'); card.className = `category-card ${data.type}`;
    card.innerHTML = `<div class="category-icon"><span class="material-icons-sharp">${getCategoryIcon(cat)}</span></div>
      <div class="category-info"><span class="category-name">${cat}</span><span class="category-amount">${formatCurrency(data.total)}</span></div>`;
    container.appendChild(card);
  });
}

function getCategoryIcon(category){
  const icons = {'Alimentação':'restaurant','Transporte':'directions_bus','Moradia':'home','Lazer':'sports_esports','Saúde':'local_hospital','Empréstimo':'account_balance','Cartão de Crédito':'credit_card','Energia':'bolt','Água':'water_drop','Gás':'local_fire_department','Internet':'wifi','Investimento':'trending_up','Outros':'category','Salário':'attach_money','Combustível':'local_gas_station','Aluguel':'business'};
  return icons[category] || 'category';
}

// ------------------------ MUDANÇA DE MÊS ------------------------
function changeMonth(direction){
  state.currentDate.setMonth(state.currentDate.getMonth() + direction);
  localStorage.setItem('currentDate', JSON.stringify(state.currentDate));
  carregarResumoMensal();
  atualizarNomeDoMes();
  atualizarGraficoMensal();
  updateExpenseChart(state.transactions, state.expenseCategories);
}

// ------------------------ UPDATE / RENDER GERAL ------------------------
function updateAll(){
  carregarResumoMensal();
  atualizarNomeDoMes();
  atualizarGraficoMensal();
  renderGoals();
  renderPayables();
  verificarContasAVencer();
  renderTransactionList(filterTransactionsByMonth(state.transactions, state.currentDate));
  // atualiza chart principal se existir função importada
  try { updateExpenseChart(filterTransactionsByMonth(state.transactions, state.currentDate), state.expenseCategories); } catch(e) {}
  updateUserUI();
}

// ------------------------ NOME DO MES A EXIBIR ------------------------
function atualizarNomeDoMes(){
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  $('#mes-atual') && ($('#mes-atual').textContent = `${meses[state.currentDate.getMonth()]} de ${state.currentDate.getFullYear()}`);
  $('#current-month-year') && ($('#current-month-year').textContent = state.currentDate.toLocaleDateString('pt-BR',{month:'long', year:'numeric'}));
}

// ------------------------ USER UI ------------------------
function updateUserUI(){
  const el = $('#login-name') || $('#current-user-name');
  if (auth.currentUser) {
    const name = auth.currentUser.displayName || auth.currentUser.email || auth.currentUser.uid;
    if (el) el.textContent = name;
    $('#btn-logout') && ($('#btn-logout').style.display = 'inline-block');
  } else {
    // tenta usar state.currentUser (switch local)
    if (el) el.textContent = state.currentUser || 'Não Autenticado';
    $('#btn-logout') && ($('#btn-logout').style.display = 'none');
  }
}

// ------------------------ EXPORT / IMPORT ------------------------
function exportData(){
  const dados = { transactions: state.transactions, goals: state.goals, payables: state.payables };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'dados-financeiros.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// ------------------------ UTILIDADES FINAIS ------------------------
function formatShortDate(d) { return new Date(d).toLocaleDateString('pt-BR'); }

// ------------------------ GRAVAR ARQUIVO LOCAL ------------------------
(function saveInitialIfMissing(){
  // Garante que chaves existam após primeira carga
  if (!localStorage.getItem('transactions')) localStorage.setItem('transactions', JSON.stringify(state.transactions));
  if (!localStorage.getItem('goals')) localStorage.setItem('goals', JSON.stringify(state.goals));
  if (!localStorage.getItem('payables')) localStorage.setItem('payables', JSON.stringify(state.payables));
})();

// ------------------------ FIM DO ARQUIVO ------------------------
