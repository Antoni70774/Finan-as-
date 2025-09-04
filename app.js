// --- app.js (VERSÃO COMPLETA E CORRIGIDA) ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { createExpenseChart, updateExpenseChart } from './chart-setup.js';
import { updateMonthlyChart, createMonthlyChart } from './monthly-chart-setup.js';

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "sua-apiKey-aqui",
  authDomain: "seu-authDomain-aqui",
  projectId: "seu-projectId-aqui",
  storageBucket: "seu-storageBucket-aqui",
  messagingSenderId: "seu-messagingSenderId-aqui",
  appId: "seu-appId-aqui",
  measurementId: "seu-measurementId-aqui"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUid = null;
let unsubscribers = [];
let monthlyBarChart = null;
let annualChart = null;

const state = {
  transactions: JSON.parse(localStorage.getItem('transactions')) || [],
  goals: JSON.parse(localStorage.getItem('goals')) || [],
  payables: JSON.parse(localStorage.getItem('payables')) || [],
  currentUser: localStorage.getItem('currentUser') || 'Bem Vindo',
  users: ['Esposo', 'Esposa'],
  currentDate: new Date(),
  expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
  incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
  chartType: 'all',
  lastChartUpdate: null
};

document.addEventListener('DOMContentLoaded', () => {
  const temaSalvo = localStorage.getItem('tema');
  if (temaSalvo === 'dark') document.body.classList.add('dark-theme');

  // Selecionar todos os elementos uma única vez
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const monthPrevBtn = document.getElementById('month-prev');
  const monthNextBtn = document.getElementById('month-next');
  const menuBotao = document.getElementById('menu-botao');
  const menuFlutuante = document.getElementById('menu-perfil');
  const authModal = document.getElementById('auth-modal');
  const addTransactionBtn = document.getElementById('add-transaction-btn');
  const addGoalBtn = document.getElementById('add-goal-btn');
  const addPayableBtn = document.getElementById('add-payable-btn');
  const logoutBtn = document.getElementById('btn-logout');

  // --- Ouvintes de Eventos ---

  // Navegação do Menu e Páginas
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.getAttribute('data-page');
      if (pageId) {
        navigateToPage(pageId);
      }
    });
  });

  menuBotao.addEventListener('click', () => {
    menuFlutuante.classList.toggle('active');
  });

  document.addEventListener('click', (event) => {
    if (!menuFlutuante.contains(event.target) && !menuBotao.contains(event.target)) {
      menuFlutuante.classList.remove('active');
    }
  });

  // Botões de navegação de mês na página inicial (Dashboard)
  if (monthPrevBtn) {
    monthPrevBtn.addEventListener('click', () => {
      state.currentDate.setMonth(state.currentDate.getMonth() - 1);
      updateAll();
    });
  }
  if (monthNextBtn) {
    monthNextBtn.addEventListener('click', () => {
      state.currentDate.setMonth(state.currentDate.getMonth() + 1);
      updateAll();
    });
  }

  // Botões para abrir modais
  if (addTransactionBtn) addTransactionBtn.addEventListener('click', () => openTransactionModal());
  if (addGoalBtn) addGoalBtn.addEventListener('click', () => openGoalModal());
  if (addPayableBtn) addPayableBtn.addEventListener('click', () => openPayableModal());

  // Lógica de autenticação
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUid = user.uid;
      if (authModal) authModal.style.display = 'none';
      await firstCloudSync();
      startRealtimeSync();
      navigateToPage('dashboard-page');
    } else {
      currentUid = null;
      stopRealtimeSync();
      if (authModal) authModal.style.display = 'block';
      navigateToPage('dashboard-page');
    }
    updateUserUI();
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        localStorage.clear();
        location.reload();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout.');
      }
    });
  }

  // --- Funções de Sincronização e Estado ---
  async function firstCloudSync() {
    if (!currentUid) return;
    const pull = async (name) => {
      const snap = await getDocs(collection(db, 'users', currentUid, name));
      return snap.docs.map(d => d.data());
    };
    const [remoteTx, remoteGoals, remotePay] = await Promise.all([
      pull('transactions'), pull('goals'), pull('payables')
    ]);
    if (remoteTx.length + remoteGoals.length + remotePay.length > 0) {
      state.transactions = remoteTx;
      state.goals = remoteGoals;
      state.payables = remotePay;
      localStorage.setItem('transactions', JSON.stringify(state.transactions));
      localStorage.setItem('goals', JSON.stringify(state.goals));
      localStorage.setItem('payables', JSON.stringify(state.payables));
    }
    updateAll();
  }

  function startRealtimeSync() {
    stopRealtimeSync();
    if (!currentUid) return;
    const listen = (name, apply) => onSnapshot(
      collection(db, 'users', currentUid, name),
      (snap) => {
        const arr = snap.docs.map(d => d.data());
        apply(arr);
        localStorage.setItem(name, JSON.stringify(arr));
        updateAll();
      }
    );
    unsubscribers = [
      listen('transactions', arr => state.transactions = arr),
      listen('goals', arr => state.goals = arr),
      listen('payables', arr => state.payables = arr)
    ];
  }

  function stopRealtimeSync() {
    unsubscribers.forEach(fn => fn && fn());
    unsubscribers = [];
  }

  async function saveAndRerender() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    localStorage.setItem('payables', JSON.stringify(state.payables));
    if (currentUid) await saveAllToCloud();
    updateAll();
  }

  async function saveAllToCloud() {
    if (!currentUid) return;
    const batch = writeBatch(db);
    const putAll = (name, arr) => {
      const colRef = collection(db, 'users', currentUid, name);
      arr.forEach(item => {
        const ref = doc(colRef, String(item.id));
        batch.set(ref, item, {
          merge: true
        });
      });
    };
    putAll('transactions', state.transactions);
    putAll('goals', state.goals);
    putAll('payables', state.payables);
    await batch.commit();
  }

  // --- Funções de Navegação e Renderização ---

  function updateAll() {
    const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
    updateExpenseChart(monthFiltered, state.chartType);
    renderTransactions();
    renderGoals();
    renderPayables();
    updateMonthlySummary();
    updateAnnualSummary();
    checkPayablesForAlerts();
    updateUserUI();
  }

  function navigateToPage(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) selectedPage.classList.add('active');

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-page') === pageId) item.classList.add('active');
    });

    const titles = {
      'dashboard-page': 'Visão Geral',
      'goals-page': 'Metas Pessoais',
      'payables-page': 'Despesas a Pagar',
      'profile-page': 'Perfil',
      'resumo-mensal-page': 'Resumo Mensal',
      'resumo-anual-page': 'Resumo Anual',
      'config-page': 'Configurações',
      'ajuda-page': 'Ajuda'
    };
    const appHeaderTitle = document.querySelector('.app-header h1');
    if (appHeaderTitle) appHeaderTitle.textContent = titles[pageId] || 'Controle Financeiro';

    if (pageId === 'goals-page') renderGoals();
    if (pageId === 'payables-page') renderPayables();
    if (pageId === 'profile-page') updateProfilePage();
    if (pageId === 'resumo-mensal-page') updateMonthlySummary();
    if (pageId === 'resumo-anual-page') updateAnnualSummary();
  }

  // --- Funções de Lógica da Aplicação ---

  function updateMonthlySummary() {
    const mesAtual = state.currentDate.getMonth();
    const anoAtual = state.currentDate.getFullYear();
    const transacoesDoMes = state.transactions.filter(t => {
      const data = new Date(t.date);
      return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });

    const receita = transacoesDoMes.filter(t => t.type === "income").reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const despesa = transacoesDoMes.filter(t => t.type === "expense").reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const saldo = receita - despesa;

    const currentMonthYearEl = document.getElementById('current-month-year');
    if (currentMonthYearEl) {
      currentMonthYearEl.textContent = state.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    const monthIncomeEl = document.getElementById('month-income');
    const monthExpenseEl = document.getElementById('month-expense');
    const monthBalanceEl = document.getElementById('month-balance');

    if (monthIncomeEl) monthIncomeEl.textContent = formatCurrency(receita);
    if (monthExpenseEl) monthExpenseEl.textContent = formatCurrency(despesa);
    if (monthBalanceEl) {
      monthBalanceEl.textContent = formatCurrency(saldo);
      monthBalanceEl.style.color = saldo >= 0 ? 'var(--text-light)' : 'var(--danger-color)';
    }

    // Atualiza o resumo mensal na página de resumo
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const resumoMesEl = document.getElementById('resumo-current-month-year');
    if (resumoMesEl) resumoMesEl.textContent = `${meses[mesAtual]} de ${anoAtual}`;
    document.getElementById('monthly-revenue').textContent = formatCurrency(receita);
    document.getElementById('monthly-expense').textContent = formatCurrency(despesa);
    document.getElementById('monthly-balance').textContent = formatCurrency(saldo);

    updateMonthlyChart(transacoesDoMes, monthlyBarChart);
  }

  function updateAnnualSummary() {
    const anoAtual = new Date().getFullYear();
    const transacoesDoAno = state.transactions.filter(t => new Date(t.date).getFullYear() === anoAtual);
    const receita = transacoesDoAno.filter(t => t.type === "income").reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const despesa = transacoesDoAno.filter(t => t.type === "expense").reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const saldo = receita - despesa;

    document.getElementById("annual-revenue").textContent = formatCurrency(receita);
    document.getElementById("annual-expense").textContent = formatCurrency(despesa);
    document.getElementById("annual-balance").textContent = formatCurrency(saldo);

    atualizarGraficoAnual(transacoesDoAno);
  }

  function atualizarGraficoAnual(transacoesDoAno) {
    const canvas = document.getElementById('annual-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const receitas = Array(12).fill(0);
    const despesas = Array(12).fill(0);

    transacoesDoAno.forEach(t => {
      const data = new Date(t.date);
      const mes = data.getMonth();
      if (t.type === "income") receitas[mes] += parseFloat(t.amount);
      if (t.type === "expense") despesas[mes] += parseFloat(t.amount);
    });

    if (annualChart) annualChart.destroy();
    annualChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [{
          label: 'Receita',
          data: receitas,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }, {
          label: 'Despesa',
          data: despesas,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  }

  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  function openTransactionModal(transaction = null) {
    const transactionModal = document.getElementById('transaction-modal');
    const transactionForm = document.getElementById('transaction-form');
    const transactionModalTitle = document.getElementById('transaction-modal-title');
    const transactionIdInput = document.getElementById('transaction-id');
    const deleteTransactionBtn = document.getElementById('delete-transaction-btn');
    const typeExpenseBtn = document.getElementById('type-expense-btn');
    const typeIncomeBtn = document.getElementById('type-income-btn');
    const transactionTypeInput = document.getElementById('transaction-type');

    transactionForm.reset();
    transactionIdInput.value = '';
    deleteTransactionBtn.style.display = 'none';

    if (transaction) {
      transactionModalTitle.textContent = 'Editar Transação';
      transactionIdInput.value = transaction.id;
      document.getElementById('amount').value = transaction.amount;
      document.getElementById('description').value = transaction.description;
      document.getElementById('date').value = transaction.date;
      transactionTypeInput.value = transaction.type;
      deleteTransactionBtn.style.display = 'block';

      if (transaction.type === 'expense') {
        typeExpenseBtn.classList.add('active');
        typeIncomeBtn.classList.remove('active');
      } else {
        typeExpenseBtn.classList.remove('active');
        typeIncomeBtn.classList.add('active');
      }
    } else {
      transactionModalTitle.textContent = 'Nova Transação';
      transactionTypeInput.value = 'expense';
      typeExpenseBtn.classList.add('active');
      typeIncomeBtn.classList.remove('active');
    }
    updateCategoryOptions();
    openModal(transactionModal);
  }

  function openGoalModal(goal = null) {
    const goalModal = document.getElementById('goal-modal');
    const goalForm = document.getElementById('goal-form');
    const goalIdInput = document.getElementById('goal-id');
    const deleteGoalBtn = document.getElementById('delete-goal-btn');

    goalForm.reset();
    goalIdInput.value = '';
    deleteGoalBtn.style.display = 'none';

    if (goal) {
      document.getElementById('goal-modal-title').textContent = 'Editar Meta';
      goalIdInput.value = goal.id;
      document.getElementById('goal-name').value = goal.name;
      document.getElementById('goal-target').value = goal.target;
      document.getElementById('goal-current').value = goal.current;
      document.getElementById('goal-date').value = goal.date;
      deleteGoalBtn.style.display = 'block';
    } else {
      document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
    }
    openModal(goalModal);
  }

  function openPayableModal(payable = null) {
    const payableModal = document.getElementById('payable-modal');
    const payableForm = document.getElementById('payable-form');
    const payableIdInput = document.getElementById('payable-id');

    payableForm.reset();
    payableIdInput.value = '';

    if (payable) {
      document.getElementById('payable-modal-title').textContent = 'Editar Conta a Pagar';
      payableIdInput.value = payable.id;
      document.getElementById('payable-description').value = payable.description;
      document.getElementById('payable-category').value = payable.category;
      document.getElementById('payable-amount').value = payable.amount;
      document.getElementById('payable-date').value = payable.date;
    } else {
      document.getElementById('payable-modal-title').textContent = 'Nova Conta a Pagar';
    }
    openModal(payableModal);
  }

  function updateCategoryOptions() {
    const categorySelect = document.getElementById('category');
    const transactionType = document.getElementById('transaction-type').value;
    categorySelect.innerHTML = '';
    const categories = transactionType === 'expense' ? state.expenseCategories : state.incomeCategories;
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }

  function renderTransactions() {
    const list = document.getElementById('transaction-list');
    if (!list) return;
    list.innerHTML = '';
    const transacoesDoMes = state.transactions
      .filter(t => new Date(t.date).getMonth() === state.currentDate.getMonth() && new Date(t.date).getFullYear() === state.currentDate.getFullYear())
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    transacoesDoMes.forEach(t => {
      const item = document.createElement('li');
      item.className = 'transaction-item';
      item.dataset.id = t.id;
      item.innerHTML = `
        <div class="transaction-icon ${t.type}">
          <span class="material-icons-sharp">${t.type === 'income' ? 'arrow_upward' : 'arrow_downward'}</span>
        </div>
        <div class="transaction-details">
          <p>${t.description}</p>
          <span>${t.category} • ${formatDateBR(t.date)}</span>
        </div>
        <div class="transaction-amount ${t.type}">
          ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
        </div>
      `;
      item.addEventListener('click', () => openTransactionModal(t));
      list.appendChild(item);
    });
  }

  function renderGoals() {
    const list = document.getElementById('goal-list');
    if (!list) return;
    list.innerHTML = '';
    state.goals.forEach(goal => {
      const progress = (parseFloat(goal.current) / parseFloat(goal.target)) * 100;
      const item = document.createElement('div');
      item.className = 'goal-card';
      item.innerHTML = `
        <h3>${goal.name}</h3>
        <p>Meta: ${formatCurrency(goal.target)} | Atual: ${formatCurrency(goal.current)}</p>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${Math.min(100, progress)}%;"></div>
        </div>
        <span>${Math.min(100, progress).toFixed(0)}%</span>
        <button class="icon-btn edit-goal" data-id="${goal.id}"><span class="material-icons-sharp">edit</span></button>
      `;
      list.appendChild(item);
    });
    document.querySelectorAll('.edit-goal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const goalId = e.currentTarget.getAttribute('data-id');
        const goal = state.goals.find(g => g.id === goalId);
        if (goal) openGoalModal(goal);
      });
    });
  }

  function renderPayables() {
    const list = document.getElementById('payable-list');
    if (!list) return;
    list.innerHTML = '';
    const sorted = [...state.payables].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(p => {
      const isPaid = p.paid;
      const daysLeft = diasRestantes(p.date);
      const isLate = daysLeft < 0 && !isPaid;
      const statusClass = isPaid ? 'paid' : (isLate ? 'late' : 'pending');
      const statusText = isPaid ? 'Paga' : (isLate ? 'Atrasada' : 'A pagar');
      const item = document.createElement('li');
      item.className = `payable-item ${statusClass}`;
      item.innerHTML = `
        <div class="payable-info">
          <h3>${p.description}</h3>
          <p>Valor: ${formatCurrency(p.amount)} | Vence em: ${formatDateBR(p.date)}</p>
        </div>
        <div class="payable-actions">
          <span class="payable-status">${statusText}</span>
          <button class="icon-btn" onclick="window.editPayable('${p.id}')">
              <span class="material-icons-sharp">edit</span>
          </button>
          <button class="icon-btn" onclick="window.deletePayable('${p.id}')">
              <span class="material-icons-sharp">delete</span>
          </button>
          ${!isPaid ? `<button class="icon-btn" onclick="window.markPayablePaid('${p.id}')">
              <span class="material-icons-sharp">done</span>
          </button>` : ''}
        </div>
      `;
      list.appendChild(item);
    });
  }

  function updateUserUI() {
    const user = auth.currentUser;
    const loginNameEl = document.getElementById('login-name');
    const logoutBtn = document.getElementById('btn-logout');

    if (user) {
      if (loginNameEl) loginNameEl.textContent = user.displayName || user.email;
      if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
      if (loginNameEl) loginNameEl.textContent = 'Não Autenticado';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  function updateProfilePage() {
    const user = auth.currentUser;
    const profileContainer = document.getElementById('profile-container');
    if (!profileContainer) return;

    if (user) {
      const creationDate = new Date(parseInt(user.metadata.createdAt)).toLocaleDateString('pt-BR');
      const lastSignInDate = new Date(parseInt(user.metadata.lastLoginAt)).toLocaleDateString('pt-BR');
      const photoURL = user.photoURL || 'https://via.placeholder.com/150';

      profileContainer.innerHTML = `
        <div class="profile-card">
          <img src="${photoURL}" alt="Foto de Perfil" class="profile-photo">
          <div class="profile-details">
            <h2>${user.displayName || 'Usuário Sem Nome'}</h2>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Criado em:</strong> ${creationDate}</p>
            <p><strong>Último Acesso:</strong> ${lastSignInDate}</p>
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn-secondary" id="btn-logout-profile">Sair da Conta</button>
        </div>
      `;
      document.getElementById('btn-logout-profile').addEventListener('click', async () => {
        try {
          await signOut(auth);
          localStorage.clear();
          location.reload();
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
          alert('Erro ao fazer logout.');
        }
      });
    } else {
      profileContainer.innerHTML = '<p>Nenhum usuário logado. Por favor, faça login.</p>';
    }
  }

  // Funções Utilitárias
  function formatCurrency(value) {
    return parseFloat(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function formatDateBR(dateStr) {
    return new Date(dateStr + "T03:00:00").toLocaleDateString('pt-BR');
  }

  function diasRestantes(dataVencimento) {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diff = vencimento - hoje;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function checkPayablesForAlerts() {
    const proximas = state.payables.filter(c => {
      const dias = diasRestantes(c.date);
      return dias >= 0 && dias <= 5 && !c.paid;
    });
    const alertCount = document.getElementById('alert-count');
    const alertIcon = document.getElementById('alert-icon');
    if (alertCount) alertCount.textContent = proximas.length;
    if (alertIcon) alertIcon.classList.toggle('ativo', proximas.length > 0);
  }

  function filterTransactionsByMonth(transactions, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  }

  // Inicialização
  updateAll();
});
