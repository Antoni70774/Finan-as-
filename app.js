import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore, enableIndexedDbPersistence, collection, doc,
    setDoc, onSnapshot, updateDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 🔗 Configuração do Firebase
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

// Ativa cache offline
(async () => {
    try { await enableIndexedDbPersistence(db); }
    catch (e) { console.warn("IndexedDB não disponível:", e); }
})();

let currentUser = null;
let currentMonth = new Date();
let transactionsData = [];
let goalsData = [];
let payablesData = [];
let myChart;

const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

// ----------------------
// 🌍 Funções de Utilidade
// ----------------------

const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.main-nav .nav-item[data-page="${pageId}"]`)?.classList.add('active');
    closeSidebar();
};

const openModal = (modalId) => {
    document.getElementById(modalId).classList.add('active');
};

const closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
};

const formatCurrency = (value) => formatter.format(value);
const formatDate = (date) => new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');

const getMonthYearString = (date) => {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
};

const setupChart = () => {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const chartType = 'all';
    const chartTitle = getChartTitle(chartType);
    document.getElementById('chart-title').textContent = chartTitle;
    if (myChart) {
      myChart.destroy();
    }
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${tooltipItem.label}: ${formatCurrency(tooltipItem.raw)}`;
                        }
                    }
                }
            }
        }
    });
};

const getChartTitle = (type) => {
    const monthYear = getMonthYearString(currentMonth);
    switch (type) {
        case 'expense':
            return `Despesas por Categoria (${monthYear})`;
        case 'income':
            return `Receitas por Categoria (${monthYear})`;
        default:
            return `Movimentação por Categoria (${monthYear})`;
    }
};

const updateChart = (type = 'all') => {
    const chartTitle = getChartTitle(type);
    document.getElementById('chart-title').textContent = chartTitle;
    let filteredTransactions = transactionsData.filter(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        return transactionDate.getFullYear() === currentMonth.getFullYear() &&
               transactionDate.getMonth() === currentMonth.getMonth();
    });
    if (type !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === type);
    }
    const categories = {};
    filteredTransactions.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + parseFloat(t.amount);
    });
    const labels = Object.keys(categories);
    const data = Object.values(categories);

    const pastelColors = [
        '#A3D5FF', '#FFC1CC', '#C1FFD7', '#FFF5BA',
        '#D5C1FF', '#FFDAC1', '#C1E1FF', '#E2F0CB'
    ];
    const backgroundColors = labels.map((_, i) => pastelColors[i % pastelColors.length]);

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = data;
    myChart.data.datasets[0].backgroundColor = backgroundColors;
    myChart.update();
    renderCategorySummary(categories);
};

const iconMap = {
    // Despesas
    'Alimentação': '🍽️',
    'Transporte': '🚌',
    'Moradia': '🏠',
    'Lazer': '🎉',
    'Saúde': '🩺',
    'Empréstimo': '💳',
    'Cartão de Crédito': '💸',
    'Energia': '🔌',
    'Água': '🚿',
    'Gás': '🔥',
    'Internet': '🌐',
    'Investimento': '📉',
    'Outros': '📦',

    // Receitas
    'Salário': '💼',
    'Combustível': '⛽',
    'Aluguel': '🏢',
    'Outras Entradas': '📦'
};

const renderCategorySummary = (categories) => {
    const summaryDiv = document.getElementById('category-summary');
    summaryDiv.innerHTML = '';
    summaryDiv.style.display = 'grid';
    summaryDiv.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
    summaryDiv.style.gap = '15px';
    for (const category in categories) {
        const item = document.createElement('div');
        item.className = 'summary-item';
        item.style.textAlign = 'center';
        item.innerHTML = `
            <div style="font-size: 1.5rem;">${iconMap[category] || '📦'}</div>
            <span>${category}</span>
            <h4>${formatCurrency(categories[category])}</h4>
        `;
        summaryDiv.appendChild(item);
    }
};

const calculateDashboardData = () => {
    let income = 0;
    let expense = 0;
    const filteredTransactions = transactionsData.filter(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        return transactionDate.getFullYear() === currentMonth.getFullYear() && transactionDate.getMonth() === currentMonth.getMonth();
    });
    filteredTransactions.forEach(t => {
        const amount = parseFloat(t.amount);
        if (t.type === 'income') {
            income += amount;
        } else {
            expense += amount;
        }
    });
    document.getElementById('month-income').textContent = formatCurrency(income);
    document.getElementById('month-expense').textContent = formatCurrency(expense);
    document.getElementById('month-balance').textContent = formatCurrency(income - expense);
};

const renderTransactions = () => {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    const filteredTransactions = transactionsData.filter(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        return transactionDate.getFullYear() === currentMonth.getFullYear() && transactionDate.getMonth() === currentMonth.getMonth();
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    filteredTransactions.forEach(t => {
        const li = document.createElement('li');
        li.className = 'transaction-item';
        li.setAttribute('data-id', t.id);
        li.innerHTML = `
            <span class="transaction-type ${t.type === 'income' ? 'income' : 'expense'}">${t.type === 'income' ? '+' : '-'}</span>
            <div class="transaction-details">
                <div class="transaction-info">
                    <span class="description">${t.description}</span>
                    <span class="date">${formatDate(t.date)}</span>
                </div>
                <div class="transaction-amount">${formatCurrency(parseFloat(t.amount))}</div>
            </div>
        `;
        li.addEventListener('click', () => openTransactionModal(t));
        list.appendChild(li);
    });
};

const renderGoals = () => {
    const list = document.getElementById('goal-list');
    list.innerHTML = '';
    goalsData.forEach(goal => {
        const progress = (parseFloat(goal.current) / parseFloat(goal.target)) * 100;
        const progressClamped = Math.min(Math.max(progress, 0), 100);
        const item = document.createElement('div');
        item.className = 'goal-item';
        item.setAttribute('data-id', goal.id);
        item.innerHTML = `
            <h4>${goal.name}</h4>
            <div class="goal-amounts">
                <span>Meta: ${formatCurrency(parseFloat(goal.target))}</span>
                <span>Atual: ${formatCurrency(parseFloat(goal.current))}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressClamped}%;"></div>
            </div>
            <span class="goal-progress-text">${progressClamped.toFixed(0)}% (${formatDate(goal.date)})</span>
        `;
        item.addEventListener('click', () => openGoalModal(goal));
        list.appendChild(item);
    });
};

const renderPayables = () => {
    const list = document.getElementById('payable-list');
    list.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    payablesData.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const categoryIcons = {
        'Alimentação': '🍽️', 'Transporte': '🚌', 'Moradia': '🏠', 'Lazer': '🎉',
        'Saúde': '🩺', 'Empréstimo': '💳', 'Cartão de Crédito': '💸', 'Energia': '🔌',
        'Água': '🚿', 'Gás': '🔥', 'Internet': '🌐', 'Investimento': '📉', 'Outros': '📦'
    };
    payablesData.forEach(payable => {
        const dueDate = new Date(payable.dueDate + 'T00:00:00');
        const isOverdue = dueDate < today && !payable.paid;
        const isToday = dueDate.getTime() === today.getTime();
        const item = document.createElement('div');
        item.className = 'payable-item';
        if (isOverdue) item.classList.add('overdue');
        if (isToday) item.classList.add('due-today');
        item.setAttribute('data-id', payable.id);
        const icon = categoryIcons[payable.category] || '📌';
        item.innerHTML = `
            <div class="payable-details">
                <h4>${icon} ${payable.description}</h4>
                <p><strong>Categoria:</strong> ${payable.category}</p>
                <p><strong>Valor:</strong> ${formatCurrency(parseFloat(payable.amount))}</p>
                <p><strong>Vencimento:</strong> ${formatDate(payable.dueDate)}</p>
            </div>
            <div class="payable-actions">
                <button class="btn-check" data-id="${payable.id}">${payable.paid ? '✅ Pago' : 'Pagar'}</button>
                <button class="btn-edit-payable" data-id="${payable.id}">✏️</button>
                <button class="btn-delete-payable" data-id="${payable.id}">🗑️</button>
            </div>
        `;
        list.appendChild(item);
        
        item.querySelector('.btn-check').addEventListener('click', async () => {
            await updatePayable(payable.id, { paid: !payable.paid });
        });
        item.querySelector('.btn-edit-payable').addEventListener('click', () => openPayableModal(payable));
        item.querySelector('.btn-delete-payable').addEventListener('click', async () => {
            if(confirm('Tem certeza que deseja excluir esta conta?')){
                await deletePayable(payable.id);
            }
        });
    });
};

const updateAlertBadge = () => {
    const today = new Date();
    const futurePayables = payablesData.filter(p => !p.paid && new Date(p.dueDate + 'T00:00:00') >= today);
    document.getElementById('alert-count').textContent = futurePayables.length;
};

const showPayablesAlert = () => {
    const today = new Date();
    const upcomingPayables = payablesData.filter(p => !p.paid && new Date(p.dueDate + 'T00:00:00') >= today);

    const alertList = document.getElementById('alert-list');
    alertList.innerHTML = '';
    
    if(upcomingPayables.length === 0) {
      alertList.innerHTML = '<li>Nenhuma conta a vencer nos próximos dias.</li>';
    } else {
      upcomingPayables.forEach(p => {
        const item = document.createElement('li');
        const dueDate = new Date(p.dueDate + 'T00:00:00');
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        item.innerHTML = `
          <strong>${p.description}</strong> (${formatCurrency(p.amount)}) - Vence em ${daysUntilDue} dias.
        `;
        alertList.appendChild(item);
      });
    }
    openModal('alert-modal');
};

// ----------------------
// 📦 Ações do Firestore
// ----------------------

const listenForData = () => {
    if (!currentUser) return;
    const user = currentUser;

    const transactionsRef = collection(db, `users/${user.uid}/transactions`);
    onSnapshot(transactionsRef, (snapshot) => {
        transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        refreshDashboard();
    });
    const goalsRef = collection(db, `users/${user.uid}/goals`);
    onSnapshot(goalsRef, (snapshot) => {
        goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGoals();
    });
    const payablesRef = collection(db, `users/${user.uid}/payables`);
    onSnapshot(payablesRef, (snapshot) => {
        payablesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPayables();
        updateAlertBadge();
    });
};

const addTransaction = async (data) => {
    if (!currentUser) return alert('Você precisa estar logado para adicionar transações.');
    const newDocRef = doc(collection(db, `users/${currentUser.uid}/transactions`));
    await setDoc(newDocRef, data);
};

const updateTransaction = async (id, data) => {
    if (!currentUser) return alert('Você precisa estar logado para atualizar transações.');
    const docRef = doc(db, `users/${currentUser.uid}/transactions`, id);
    await updateDoc(docRef, data);
};

const deleteTransaction = async (id) => {
    if (!currentUser) return alert('Você precisa estar logado para excluir transações.');
    const docRef = doc(db, `users/${currentUser.uid}/transactions`, id);
    await deleteDoc(docRef);
};

const addGoal = async (data) => {
    if (!currentUser) return alert('Você precisa estar logado para adicionar metas.');
    const newDocRef = doc(collection(db, `users/${currentUser.uid}/goals`));
    await setDoc(newDocRef, data);
};

const updateGoal = async (id, data) => {
    if (!currentUser) return alert('Você precisa estar logado para atualizar metas.');
    const docRef = doc(db, `users/${currentUser.uid}/goals`, id);
    await updateDoc(docRef, data);
};

const deleteGoal = async (id) => {
    if (!currentUser) return alert('Você precisa estar logado para excluir metas.');
    const docRef = doc(db, `users/${currentUser.uid}/goals`, id);
    await deleteDoc(docRef);
};

const addPayable = async (data) => {
    if (!currentUser) return alert('Você precisa estar logado para adicionar contas.');
    const newDocRef = doc(collection(db, `users/${currentUser.uid}/payables`));
    await setDoc(newDocRef, data);
};

const updatePayable = async (id, data) => {
    if (!currentUser) return alert('Você precisa estar logado para atualizar contas.');
    const docRef = doc(db, `users/${currentUser.uid}/payables`, id);
    await updateDoc(docRef, data);
};

const deletePayable = async (id) => {
    if (!currentUser) return alert('Você precisa estar logado para excluir contas.');
    const docRef = doc(db, `users/${currentUser.uid}/payables`, id);
    await deleteDoc(docRef);
};

// ----------------------
// 🖥️ Lógica da UI
// ----------------------

const populateCategories = () => {
    const select = document.getElementById('category');
    if (select) {
        select.innerHTML = '';
        const categories = [
            "Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Educação",
            "Salário", "Freelance", "Rendimentos", "Presentes", "Outros"
        ];
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    }
    const payableSelect = document.getElementById('payable-category');
    if (payableSelect) {
      payableSelect.innerHTML = '';
      const payableCategories = [
            "Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Empréstimo", "Cartão de Crédito", "Energia", "Água", "Gás", "Internet", "Outros"
        ];
        payableCategories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat;
          option.textContent = cat;
          payableSelect.appendChild(option);
        });
    }
};

const openTransactionModal = (transaction = null) => {
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    const title = document.getElementById('transaction-modal-title');
    const deleteButton = document.getElementById('delete-transaction-btn');
    const typeIncomeBtn = document.getElementById('type-income-btn');
    const typeExpenseBtn = document.getElementById('type-expense-btn');

    form.reset();
    document.getElementById('transaction-id').value = '';
    deleteButton.style.display = 'none';

    if (transaction) {
        title.textContent = 'Editar Transação';
        document.getElementById('transaction-id').value = transaction.id;
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = transaction.amount;
        document.getElementById('date').value = transaction.date;
        document.getElementById('category').value = transaction.category;

        if (transaction.type === 'income') {
            typeIncomeBtn.classList.add('active');
            typeExpenseBtn.classList.remove('active');
        } else {
            typeExpenseBtn.classList.add('active');
            typeIncomeBtn.classList.remove('active');
        }

        deleteButton.style.display = 'block';
    } else {
        title.textContent = 'Nova Transação';
        typeExpenseBtn.classList.add('active');
        typeIncomeBtn.classList.remove('active');
    }
    openModal('transaction-modal');
};

const closeTransactionModal = () => {
    closeModal('transaction-modal');
};

const openGoalModal = (goal = null) => {
    const modal = document.getElementById('goal-modal');
    const form = document.getElementById('goal-form');
    const title = document.getElementById('goal-modal-title');
    const deleteButton = document.getElementById('delete-goal-btn');

    form.reset();
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-current').value = '';
    deleteButton.style.display = 'none';

    if (goal) {
        title.textContent = 'Editar Meta';
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        document.getElementById('goal-date').value = goal.date;
        deleteButton.style.display = 'block';
    } else {
        title.textContent = 'Nova Meta';
    }
    openModal('goal-modal');
};

const closeGoalModal = () => {
    closeModal('goal-modal');
};

const openPayableModal = (payable = null) => {
    const modal = document.getElementById('payable-modal');
    const form = document.getElementById('payable-form');
    const title = document.getElementById('payable-modal-title');
    const deleteButton = document.getElementById('delete-payable-btn');

    form.reset();
    document.getElementById('payable-id').value = '';
    deleteButton.style.display = 'none';

    if (payable) {
        title.textContent = 'Editar Conta';
        document.getElementById('payable-id').value = payable.id;
        document.getElementById('payable-description').value = payable.description;
        document.getElementById('payable-amount').value = payable.amount;
        document.getElementById('payable-category').value = payable.category;
        document.getElementById('payable-dueDate').value = payable.dueDate;
        deleteButton.style.display = 'block';
    } else {
        title.textContent = 'Nova Conta';
    }
    openModal('payable-modal');
};

const closePayableModal = () => {
    closeModal('payable-modal');
};

// ----------------------
// 🔄 Eventos e Inicialização
// ----------------------

const refreshDashboard = () => {
    document.getElementById('current-month-year').textContent = getMonthYearString(currentMonth);
    calculateDashboardData();
    updateChart();
    renderTransactions();
    updateMonthlySummary(currentMonth);
};

const updateMonthlySummary = (date) => {
    const monthYear = getMonthYearString(date);
    document.getElementById('resumo-monthly-title').textContent = monthYear;

    let income = 0;
    let expense = 0;
    const filteredTransactions = transactionsData.filter(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        return transactionDate.getFullYear() === date.getFullYear() && transactionDate.getMonth() === date.getMonth();
    });

    filteredTransactions.forEach(t => {
        const amount = parseFloat(t.amount);
        if (t.type === 'income') {
            income += amount;
        } else {
            expense += amount;
        }
    });

    document.getElementById('resumo-monthly-income').textContent = formatCurrency(income);
    document.getElementById('resumo-monthly-expense').textContent = formatCurrency(expense);
    document.getElementById('resumo-monthly-balance').textContent = formatCurrency(income - expense);

    const list = document.getElementById('resumo-monthly-list');
    list.innerHTML = '';
    filteredTransactions.forEach(t => {
        const li = document.createElement('li');
        li.className = 'transaction-item';
        li.innerHTML = `
            <span class="transaction-type ${t.type === 'income' ? 'income' : 'expense'}">${t.type === 'income' ? '+' : '-'}</span>
            <div class="transaction-details">
                <div class="transaction-info">
                    <span class="description">${t.description}</span>
                    <span class="date">${formatDate(t.date)}</span>
                </div>
                <div class="transaction-amount">${formatCurrency(parseFloat(t.amount))}</div>
            </div>
        `;
        list.appendChild(li);
    });
};

// 🚀 Inicialização e Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners para abrir modais
    document.getElementById('add-transaction-btn')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('close-transaction-modal')?.addEventListener('click', closeTransactionModal);
    
    document.getElementById('add-goal-btn')?.addEventListener('click', () => openGoalModal());
    document.getElementById('close-goal-modal')?.addEventListener('click', closeGoalModal);
    
    document.getElementById('add-payable-btn')?.addEventListener('click', () => openPayableModal());
    document.getElementById('close-payable-modal')?.addEventListener('click', closePayableModal);
    
    // Event listeners para o toggle de Despesa/Receita
    document.querySelectorAll('.transaction-type-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.transaction-type-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Event listeners para envio de formulários
    document.getElementById('transaction-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('transaction-id').value;
        const data = {
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value),
            date: document.getElementById('date').value,
            category: document.getElementById('category').value,
            type: document.querySelector('.toggle-btn.active').getAttribute('data-type')
        };

        if (id) {
            await updateTransaction(id, data);
        } else {
            await addTransaction(data);
        }
        // Fechar o modal após o sucesso da operação
        closeTransactionModal();
    });

    document.getElementById('delete-transaction-btn')?.addEventListener('click', async () => {
        const id = document.getElementById('transaction-id').value;
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            await deleteTransaction(id);
            closeTransactionModal();
        }
    });

    document.getElementById('goal-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('goal-id').value;
        const data = {
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value) || 0,
            date: document.getElementById('goal-date').value
        };
        if (id) {
            await updateGoal(id, data);
        } else {
            await addGoal(data);
        }
        closeGoalModal();
    });

    document.getElementById('delete-goal-btn')?.addEventListener('click', async () => {
        const id = document.getElementById('goal-id').value;
        if (confirm('Tem certeza que deseja excluir esta meta?')) {
            await deleteGoal(id);
            closeGoalModal();
        }
    });

    document.getElementById('payable-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('payable-id').value;
        const data = {
            description: document.getElementById('payable-description').value,
            amount: parseFloat(document.getElementById('payable-amount').value),
            category: document.getElementById('payable-category').value,
            dueDate: document.getElementById('payable-dueDate').value,
            paid: false
        };
        if (id) {
            await updatePayable(id, data);
        } else {
            await addPayable(data);
        }
        closePayableModal();
    });

    document.getElementById('delete-payable-btn')?.addEventListener('click', async () => {
        const id = document.getElementById('payable-id').value;
        if (confirm('Tem certeza que deseja excluir esta conta a pagar?')) {
            await deletePayable(id);
            closePayableModal();
        }
    });

    // Event listeners para navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const pageId = e.currentTarget.getAttribute('data-page');
            if (pageId) {
                showPage(pageId);
            }
        });
    });

    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        refreshDashboard();
    });

    document.getElementById('next-month')?.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        refreshDashboard();
    });

    // Event listeners para botões do gráfico
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateChart(btn.getAttribute('data-type'));
        });
    });

    document.getElementById('resumo-anual-page')?.addEventListener('transitionend', () => {
        if (document.getElementById('resumo-anual-page').classList.contains('active')) {
            renderAnnualSummary();
        }
    });

    document.getElementById('resumo-anual-page')?.addEventListener('click', () => {
        renderAnnualSummary();
    });

    document.getElementById('resumo-prev-month')?.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        updateMonthlySummary(currentMonth);
    });

    document.getElementById('resumo-next-month')?.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        updateMonthlySummary(currentMonth);
    });

    // Menu lateral
    const sidebar = document.getElementById('menu-perfil');
    const toggleSidebar = () => sidebar?.classList.toggle('active');
    const closeSidebar = () => sidebar?.classList.remove('active');

    document.getElementById('menu-botao')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('menu-perfil');
        const menuBtn = document.getElementById('menu-botao');
        if (sidebar && menuBtn && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            closeSidebar();
        }
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    });

    document.getElementById('alert-btn')?.addEventListener('click', showPayablesAlert);
    document.getElementById('close-alert-modal')?.addEventListener('click', () => closeModal('alert-modal'));
});

// Resumo Anual
const renderAnnualSummary = () => {
    const annualData = {};
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    transactionsData.forEach(t => {
        const date = new Date(t.date);
        const year = date.getFullYear();
        const month = date.getMonth();
        if (!annualData[year]) {
            annualData[year] = { income: Array(12).fill(0), expense: Array(12).fill(0) };
        }
        const amount = parseFloat(t.amount);
        if (t.type === 'income') {
            annualData[year].income[month] += amount;
        } else {
            annualData[year].expense[month] += amount;
        }
    });

    const ctx = document.getElementById('annual-chart').getContext('2d');
    if (window.annualChart) {
        window.annualChart.destroy();
    }

    const currentYear = new Date().getFullYear();
    const data = annualData[currentYear] || { income: Array(12).fill(0), expense: Array(12).fill(0) };
    const incomes = data.income;
    const expenses = data.expense;

    window.annualChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Receitas',
                    data: incomes,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Despesas',
                    data: expenses,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
};

// ----------------------
// 🔑 Autenticação e Sincronização
// ----------------------
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        console.log("Usuário logado:", user.email);
        
        // Atualiza as informações do usuário
        document.getElementById('perfil-usuario').textContent = user.displayName || user.email;
        document.getElementById('perfil-email').textContent = user.email;
        document.getElementById('perfil-usuario-content').textContent = user.displayName || user.email;
        document.getElementById('perfil-email-content').textContent = user.email;

        listenForData();
        setupChart();
        refreshDashboard();
        populateCategories();
        
        window.connectBank = (bank) => {
            const perfilBanco = document.getElementById('perfil-banco');
            if (perfilBanco) {
                perfilBanco.textContent = bank.charAt(0).toUpperCase() + bank.slice(1);
            }
            alert(`Conectado ao ${bank.charAt(0).toUpperCase() + bank.slice(1)}! (Simulado)`);
        };
    } else {
        window.location.href = "login.html";
    }
});
