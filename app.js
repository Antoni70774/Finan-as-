// 🔥 Firebase Setup
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🌐 Estado global
const state = {
  transactions: [],
  goals: [],
  payables: [],
  currentUser: null,
  currentDate: new Date(),
  expenseCategories: [
    'Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde',
    'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás',
    'Internet', 'Investimento', 'Outros'
  ],
  incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
  chartType: 'all'
};

// 🔐 Autenticação
onAuthStateChanged(auth, user => {
  if (user) {
    state.currentUser = user;
    carregarDadosDoUsuario(user.uid);
  } else {
    state.currentUser = null;
    // redirecionar para login se necessário
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Tema salvo
  const temaSalvo = localStorage.getItem('tema');
  if (temaSalvo === 'dark') document.body.classList.add('dark-theme');

  // Elementos da interface
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const menuBotao = document.getElementById('menu-botao');
  const menuFlutuante = document.getElementById('menu-perfil');

  // Navegação entre páginas
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageId = item.getAttribute('data-page');
      navigateTo(pageId);
    });
  });

  function navigateTo(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) selectedPage.classList.add('active');

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-page') === pageId) item.classList.add('active');
    });

    if (pageId === 'dashboard-page') carregarResumoMensal();
    if (pageId === 'resumo-anual-page') carregarResumoAnual();
    if (pageId === 'goals-page') renderGoals();
    if (pageId === 'payables-page') renderPayables();
  }

  // Menu flutuante
  menuBotao.addEventListener('click', () => {
    menuFlutuante.classList.toggle('active');
  });

  document.getElementById('menu-resumo-mensal').addEventListener('click', () => {
    navigateTo('dashboard-page');
    menuFlutuante.classList.remove('active');
  });

  document.getElementById('menu-resumo-anual').addEventListener('click', () => {
    navigateTo('resumo-anual-page');
    menuFlutuante.classList.remove('active');
  });

  document.getElementById('menu-perfil-btn').addEventListener('click', () => {
    navigateTo('profile-page');
    menuFlutuante.classList.remove('active');
  });

  document.getElementById('menu-config-btn').addEventListener('click', () => {
    navigateTo('config-page');
    menuFlutuante.classList.remove('active');
  });

  // Modais
  const transactionModal = document.getElementById('transaction-modal');
  const transactionForm = document.getElementById('transaction-form');
  const addButton = document.getElementById('add-transaction-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const transactionTypeInput = document.getElementById('transaction-type');
  const categorySelect = document.getElementById('category');
  const transactionIdInput = document.getElementById('transaction-id');
  const transactionModalTitle = document.getElementById('transaction-modal-title');
  const deleteTransactionBtn = document.getElementById('delete-transaction-btn');

  addButton.addEventListener('click', () => {
    transactionModal.style.display = 'block';
    transactionModalTitle.textContent = 'Nova Transação';
    transactionForm.reset();
    transactionIdInput.value = '';
    deleteTransactionBtn.style.display = 'none';
    setCurrentDate();
  });

  cancelBtn.addEventListener('click', () => {
    transactionModal.style.display = 'none';
  });

  document.getElementById('type-expense-btn').addEventListener('click', () => {
    transactionTypeInput.value = 'expense';
    categorySelect.innerHTML = '';
    state.expenseCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  });

  document.getElementById('type-income-btn').addEventListener('click', () => {
    transactionTypeInput.value = 'income';
    categorySelect.innerHTML = '';
    state.incomeCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  });

  function setCurrentDate() {
    const today = new Date();
    const input = document.getElementById('date');
    if (input) input.value = today.toISOString().split('T')[0];
  }
});

function carregarResumoMensal() {
  const mesAtual = state.currentDate.getMonth();
  const anoAtual = state.currentDate.getFullYear();

  const transacoesDoMes = state.transactions.filter(t => {
    const data = new Date(t.date);
    return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
  });

  const receita = transacoesDoMes
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const despesa = transacoesDoMes
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = receita - despesa;

  document.getElementById("monthly-revenue").textContent = formatCurrency(receita);
  document.getElementById("monthly-expense").textContent = formatCurrency(despesa);
  document.getElementById("monthly-balance").textContent = formatCurrency(saldo);

  atualizarGraficoPorCategoria(transacoesDoMes);
  atualizarGraficoMensal();
  renderTransacoesRecentes(transacoesDoMes);
}

function atualizarGraficoPorCategoria(transacoes) {
  const categorias = {};
  transacoes.forEach(t => {
    if (t.type === "expense") {
      categorias[t.category] = (categorias[t.category] || 0) + t.amount;
    }
  });

  const labels = Object.keys(categorias);
  const valores = Object.values(categorias);

  const ctx = document.getElementById('category-pie-chart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: valores,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
          '#9966FF', '#FF9F40', '#C9CBCF', '#2BC47D',
          '#FF3D3D', '#FFD700'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function atualizarGraficoMensal() {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const receitas = Array(12).fill(0);
  const despesas = Array(12).fill(0);

  state.transactions.forEach(t => {
    const data = new Date(t.date);
    const mes = data.getMonth();
    const ano = data.getFullYear();
    if (ano === state.currentDate.getFullYear()) {
      if (t.type === "income") receitas[mes] += t.amount;
      if (t.type === "expense") despesas[mes] += t.amount;
    }
  });

  const ctx = document.getElementById('monthly-bar-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        {
          label: 'Receita',
          data: receitas,
          backgroundColor: '#2bc47d'
        },
        {
          label: 'Despesa',
          data: despesas,
          backgroundColor: '#ff3d3d'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function renderTransacoesRecentes(transacoes) {
  const lista = document.getElementById('recent-transactions');
  lista.innerHTML = '';

  const recentes = transacoes
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  recentes.forEach(t => {
    const item = document.createElement('li');
    item.className = 'transaction-item';
    item.innerHTML = `
      <span>${t.description}</span>
      <span>${formatCurrency(t.amount)}</span>
      <span>${formatDateBR(t.date)}</span>
    `;
    lista.appendChild(item);
  });
}

function renderGoals() {
  const goalList = document.getElementById('goal-list');
  goalList.innerHTML = '';

  if (state.goals.length === 0) {
    goalList.innerHTML = '<p>Nenhuma meta cadastrada.</p>';
    return;
  }

  state.goals.forEach(goal => {
    const restante = goal.target - goal.current;
    const mesesRestantes = Math.max(
      Math.ceil((new Date(goal.date) - new Date()) / (1000 * 60 * 60 * 24 * 30)),
      1
    );
    const sugestao = restante / mesesRestantes;

    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <span class="meta-title">${goal.name}</span>
      <span class="meta-info">Alvo: ${formatCurrency(goal.target)}</span>
      <span class="meta-info">Atual: ${formatCurrency(goal.current)}</span>
      <span class="meta-info">Limite: ${formatDateBR(goal.date)}</span>
      <p class="monthly-suggestion">Sugestão: ${formatCurrency(sugestao)} por mês</p>
    `;
    goalList.appendChild(card);
  });
}

function renderPayables() {
  const payableList = document.getElementById('payable-list');
  payableList.innerHTML = '';

  if (state.payables.length === 0) {
    payableList.innerHTML = '<p>Nenhuma conta lançada.</p>';
    return;
  }

  state.payables.forEach(p => {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <span class="meta-title">${p.description}</span>
      <span class="meta-info">Categoria: ${p.category}</span>
      <span class="meta-info">Valor: ${formatCurrency(p.amount)}</span>
      <span class="meta-info">Vencimento: ${formatDateBR(p.date)}</span>
      <span class="meta-info">Status: ${p.paid ? '<span style="color:green">Pago</span>' : '<span style="color:red">A pagar</span>'}</span>
    `;
    payableList.appendChild(card);
  });
}

function diasRestantes(dataVencimento) {
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  const diff = vencimento - hoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function verificarContasAVencer() {
  const proximas = state.payables.filter(c => {
    const dias = diasRestantes(c.date);
    return dias >= 0 && dias <= 5 && !c.paid;
  });

  const alertCount = document.getElementById('alert-count');
  const alertList = document.getElementById('alert-list');
  const alertIcon = document.getElementById('alert-icon');

  alertCount.textContent = proximas.length;
  alertIcon.classList.toggle('ativo', proximas.length > 0);

  alertList.innerHTML = proximas.length
    ? proximas.map(c => {
        const dataFormatada = formatDateBR(c.date);
        return `<li>${c.description} - vence em ${dataFormatada}</li>`;
      }).join('')
    : "<li>Nenhuma conta próxima do vencimento</li>";
}

function exportarDados() {
  const dados = {
    transacoes: state.transactions,
    metas: state.goals,
    contas: state.payables
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dados-financeiros.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ✅ Helpers de formatação
function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr) {
  return new Date(dateStr + "T03:00:00").toLocaleDateString('pt-BR');
}

// ✅ Ícones por categoria
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

// ✅ Registro do Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registrado:', reg.scope))
        .catch(err => console.warn('Falha ao registrar Service Worker:', err));
    });
  }
}

// ✅ Funções globais
window.exportarDados = exportarDados;
window.verificarContasAVencer = verificarContasAVencer;
window.registerServiceWorker = registerServiceWorker;
window.navigateTo = navigateTo;

function updateAll() {
  carregarResumoMensal();
  verificarContasAVencer();
  renderGoals();
  renderPayables();
}

function updateUserUI() {
  const nomeEl = document.getElementById('current-user-name');
  if (state.currentUser && nomeEl) {
    nomeEl.textContent = state.currentUser.email || 'Usuário';
  }
}

// Inicialização final
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  registerServiceWorker();
});
