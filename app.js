import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore, enableIndexedDbPersistence, collection, doc,
    setDoc, getDocs, onSnapshot, writeBatch, deleteDoc, updateDoc, addDoc, query, where, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Importa as funções do arquivo chart-setup.js
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

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
    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');
    closeSidebar();
};

const formatCurrency = (value) => formatter.format(value);

const getMonthYearString = (date) => {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
};

const updateMonthlySummary = (date) => {
    const monthYear = getMonthYearString(date);
    document.getElementById('monthly-summary-title').textContent = monthYear;
    refreshDashboard();
};

// ----------------------
// 📊 Funções do Dashboard
// ----------------------

const refreshDashboard = () => {
    // Atualiza o resumo financeiro (receitas, despesas, saldo)
    const income = transactionsData
        .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth.getMonth())
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expense = transactionsData
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth.getMonth())
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const balance = income - expense;

    document.getElementById('monthly-income').textContent = formatCurrency(income);
    document.getElementById('monthly-expense').textContent = formatCurrency(expense);
    document.getElementById('monthly-balance').textContent = formatCurrency(balance);

    // Atualiza o gráfico de despesas com os dados filtrados
    const expensesForChart = transactionsData.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth.getMonth());
    const expenseCategories = [...new Set(expensesForChart.map(t => t.category))];
    updateExpenseChart(expensesForChart, expenseCategories);

    updateGoalsList();
    updatePayablesList();
};

// ----------------------
// 💾 Funções de Dados (Firebase)
// ----------------------

// 🔗 Escuta por dados em tempo real
const listenForData = () => {
    if (!currentUser) return;

    // Transações
    const transactionsQuery = query(collection(db, "users", currentUser.uid, "transactions"), orderBy("date", "desc"));
    onSnapshot(transactionsQuery, (querySnapshot) => {
        transactionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        refreshDashboard();
        updateTransactionsList();
    });

    // Metas
    onSnapshot(collection(db, "users", currentUser.uid, "goals"), (querySnapshot) => {
        goalsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateGoalsList();
    });

    // Contas a Pagar
    onSnapshot(collection(db, "users", currentUser.uid, "payables"), (querySnapshot) => {
        payablesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updatePayablesList();
        updateAlerts();
    });
};

// 📝 Funções para Salvar dados
const saveTransaction = async (data) => {
    if (!currentUser) return;
    const { id, ...transactionData } = data;
    try {
        if (id) {
            await updateDoc(doc(db, "users", currentUser.uid, "transactions", id), transactionData);
        } else {
            await addDoc(collection(db, "users", currentUser.uid, "transactions"), transactionData);
        }
        alert("Transação salva com sucesso!");
    } catch (e) {
        console.error("Erro ao salvar transação: ", e);
        alert("Erro ao salvar transação. Tente novamente.");
    }
};

const saveGoal = async (data) => {
    if (!currentUser) return;
    const { id, ...goalData } = data;
    try {
        if (id) {
            await updateDoc(doc(db, "users", currentUser.uid, "goals", id), goalData);
        } else {
            await addDoc(collection(db, "users", currentUser.uid, "goals"), goalData);
        }
        alert("Meta salva com sucesso!");
    } catch (e) {
        console.error("Erro ao salvar meta: ", e);
        alert("Erro ao salvar meta. Tente novamente.");
    }
};

const savePayable = async (data) => {
    if (!currentUser) return;
    const { id, ...payableData } = data;
    try {
        if (id) {
            await updateDoc(doc(db, "users", currentUser.uid, "payables", id), payableData);
        } else {
            await addDoc(collection(db, "users", currentUser.uid, "payables"), payableData);
        }
        alert("Conta a pagar salva com sucesso!");
    } catch (e) {
        console.error("Erro ao salvar conta: ", e);
        alert("Erro ao salvar conta. Tente novamente.");
    }
};

// ❌ Funções para Deletar dados
const deleteTransaction = async (id) => {
    if (!currentUser || !id) return;
    if (confirm("Tem certeza que deseja deletar esta transação?")) {
        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "transactions", id));
            alert("Transação deletada com sucesso!");
            closeModal('transaction-modal');
        } catch (e) {
            console.error("Erro ao deletar transação: ", e);
            alert("Erro ao deletar transação. Tente novamente.");
        }
    }
};

const deleteGoal = async (id) => {
    if (!currentUser || !id) return;
    if (confirm("Tem certeza que deseja deletar esta meta?")) {
        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "goals", id));
            alert("Meta deletada com sucesso!");
            closeModal('goal-modal');
        } catch (e) {
            console.error("Erro ao deletar meta: ", e);
            alert("Erro ao deletar meta. Tente novamente.");
        }
    }
};

const deletePayable = async (id) => {
    if (!currentUser || !id) return;
    if (confirm("Tem certeza que deseja deletar esta conta?")) {
        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "payables", id));
            alert("Conta deletada com sucesso!");
            closeModal('payable-modal');
        } catch (e) {
            console.error("Erro ao deletar conta: ", e);
            alert("Erro ao deletar conta. Tente novamente.");
        }
    }
};

// ----------------------
// 🔄 Funções de Renderização da UI
// ----------------------

const updateTransactionsList = () => {
    const list = document.getElementById('transaction-list');
    if (!list) return;
    list.innerHTML = '';
    transactionsData.forEach(t => {
        const item = document.createElement('li');
        item.className = 'transaction-item';
        item.innerHTML = `
            <div class="transaction-icon">
                <i class="material-icons-sharp">${t.type === 'income' ? 'south_east' : 'north_east'}</i>
            </div>
            <div class="transaction-details">
                <h4>${t.description}</h4>
                <p>${t.category} - ${new Date(t.date).toLocaleDateString()}</p>
            </div>
            <div class="transaction-amount ${t.type}">
                ${formatCurrency(parseFloat(t.amount))}
            </div>
        `;
        item.addEventListener('click', () => editTransaction(t));
        list.appendChild(item);
    });
};

const updateGoalsList = () => {
    const list = document.getElementById('goals-list');
    if (!list) return;
    list.innerHTML = '';
    goalsData.forEach(g => {
        const item = document.createElement('div');
        item.className = 'goal-item';
        const progress = (g.current / g.target) * 100;
        item.innerHTML = `
            <h3>${g.name}</h3>
            <p>${formatCurrency(g.current)} de ${formatCurrency(g.target)}</p>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress > 100 ? 100 : progress}%"></div>
            </div>
        `;
        item.addEventListener('click', () => editGoal(g));
        list.appendChild(item);
    });
};

const updatePayablesList = () => {
    const list = document.getElementById('payables-list');
    if (!list) return;
    list.innerHTML = '';
    payablesData.forEach(p => {
        const item = document.createElement('div');
        item.className = 'payable-item';
        const isPaid = p.paid || false;
        item.innerHTML = `
            <div class="payable-info">
                <h4>${p.description}</h4>
                <p>${p.category} - ${new Date(p.date).toLocaleDateString()}</p>
                <div class="payable-actions">
                    <button class="mark-paid-btn" data-id="${p.id}" ${isPaid ? 'disabled' : ''}>${isPaid ? 'Pago' : 'Marcar como Pago'}</button>
                    <button class="edit-payable-btn" data-id="${p.id}">Editar</button>
                    <button class="delete-payable-btn" data-id="${p.id}">Excluir</button>
                </div>
            </div>
            <div class="payable-amount">
                ${formatCurrency(parseFloat(p.amount))}
            </div>
        `;
        list.appendChild(item);

        item.querySelector('.mark-paid-btn').addEventListener('click', () => markPayableAsPaid(p.id));
        item.querySelector('.edit-payable-btn').addEventListener('click', () => editPayable(p));
        item.querySelector('.delete-payable-btn').addEventListener('click', () => deletePayable(p.id));
    });
};

const updateAlerts = () => {
    const today = new Date();
    const imminentPayables = payablesData.filter(p => {
        const payableDate = new Date(p.date);
        const daysLeft = Math.ceil((payableDate - today) / (1000 * 60 * 60 * 24));
        return !p.paid && daysLeft >= 0 && daysLeft <= 7;
    });

    const alertCount = document.getElementById('alert-count');
    const alertList = document.getElementById('alert-list');
    alertCount.textContent = imminentPayables.length;

    alertList.innerHTML = '';
    imminentPayables.forEach(p => {
        const item = document.createElement('li');
        item.textContent = `${p.description} - ${formatCurrency(parseFloat(p.amount))} vence em ${new Date(p.date).toLocaleDateString()}.`;
        alertList.appendChild(item);
    });
};

const markPayableAsPaid = async (id) => {
    if (!currentUser || !id) return;
    try {
        await updateDoc(doc(db, "users", currentUser.uid, "payables", id), { paid: true });
        alert("Conta marcada como paga!");
    } catch (e) {
        console.error("Erro ao marcar como pago: ", e);
        alert("Erro ao marcar conta como paga. Tente novamente.");
    }
};

// ----------------------
// 💡 Lógica dos Modais
// ----------------------

const openModal = (modalId) => document.getElementById(modalId).classList.add('active');
const closeModal = (modalId) => document.getElementById(modalId).classList.remove('active');

const openTransactionModal = () => {
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-modal-title').textContent = 'Nova Transação';
    document.getElementById('delete-transaction-btn').style.display = 'none';
    openModal('transaction-modal');
};

const editTransaction = (transaction) => {
    const form = document.getElementById('transaction-form');
    form.querySelector('#transaction-id').value = transaction.id;
    form.querySelector('#transaction-description').value = transaction.description;
    form.querySelector('#transaction-amount').value = transaction.amount;
    form.querySelector('#transaction-date').value = transaction.date;
    form.querySelector('#category').value = transaction.category;
    form.querySelector('#transaction-type').value = transaction.type;

    document.getElementById('transaction-modal-title').textContent = 'Editar Transação';
    document.getElementById('delete-transaction-btn').style.display = 'inline-block';
    document.getElementById('delete-transaction-btn').onclick = () => deleteTransaction(transaction.id);
    openModal('transaction-modal');
};

const editGoal = (goal) => {
    const form = document.getElementById('goal-form');
    form.querySelector('#goal-id').value = goal.id;
    form.querySelector('#goal-name').value = goal.name;
    form.querySelector('#goal-target').value = goal.target;
    form.querySelector('#goal-current').value = goal.current;
    form.querySelector('#goal-date').value = goal.date;

    document.getElementById('goal-modal-title').textContent = 'Editar Meta';
    document.getElementById('delete-goal-btn').style.display = 'inline-block';
    document.getElementById('delete-goal-btn').onclick = () => deleteGoal(goal.id);
    openModal('goal-modal');
};

const editPayable = (payable) => {
    const form = document.getElementById('payable-form');
    form.querySelector('#payable-id').value = payable.id;
    form.querySelector('#payable-description').value = payable.description;
    form.querySelector('#payable-amount').value = payable.amount;
    form.querySelector('#payable-date').value = payable.date;
    form.querySelector('#payable-category').value = payable.category;

    document.getElementById('payable-modal-title').textContent = 'Editar Conta a Pagar';
    document.getElementById('delete-payable-btn').style.display = 'inline-block';
    document.getElementById('delete-payable-btn').onclick = () => deletePayable(payable.id);
    openModal('payable-modal');
};


// ----------------------
// 🧠 Lógica da UI
// ----------------------

const toggleSidebar = () => document.getElementById('menu-perfil').classList.toggle('active');
const closeSidebar = () => document.getElementById('menu-perfil').classList.remove('active');

const handleTransactionSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: formData.get('transaction-id'),
        description: formData.get('transaction-description'),
        amount: parseFloat(formData.get('transaction-amount')),
        date: formData.get('transaction-date'),
        category: formData.get('category'),
        type: formData.get('transaction-type'),
    };
    saveTransaction(data);
    closeModal('transaction-modal');
};

const handleGoalSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: formData.get('goal-id'),
        name: formData.get('goal-name'),
        target: parseFloat(formData.get('goal-target')),
        current: parseFloat(formData.get('goal-current')),
        date: formData.get('goal-date'),
    };
    saveGoal(data);
    closeModal('goal-modal');
};

const handlePayableSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: formData.get('payable-id'),
        description: formData.get('payable-description'),
        amount: parseFloat(formData.get('payable-amount')),
        date: formData.get('payable-date'),
        category: formData.get('payable-category'),
        paid: false,
    };
    savePayable(data);
    closeModal('payable-modal');
};

// ----------------------
// ⚙️ Listeners de Evento
// ----------------------

document.getElementById('resumo-prev-month').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    updateMonthlySummary(currentMonth);
});

document.getElementById('resumo-next-month').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    updateMonthlySummary(currentMonth);
});

// Menu lateral
document.getElementById('menu-botao').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
});

document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('menu-perfil');
    const menuBtn = document.getElementById('menu-botao');
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        closeSidebar();
    }
});

// Listeners para os botões e formulários
document.getElementById('add-transaction-btn').addEventListener('click', openTransactionModal);
document.getElementById('add-goal-btn').addEventListener('click', () => {
    document.getElementById('goal-form').reset();
    document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
    document.getElementById('delete-goal-btn').style.display = 'none';
    openModal('goal-modal');
});
document.getElementById('add-payable-btn').addEventListener('click', () => {
    document.getElementById('payable-form').reset();
    document.getElementById('payable-modal-title').textContent = 'Nova Conta a Pagar';
    document.getElementById('delete-payable-btn').style.display = 'none';
    openModal('payable-modal');
});

document.getElementById('cancel-btn').addEventListener('click', () => closeModal('transaction-modal'));
document.getElementById('cancel-goal-btn').addEventListener('click', () => closeModal('goal-modal'));
document.getElementById('cancel-payable-btn').addEventListener('click', () => closeModal('payable-modal'));
document.getElementById('fechar-alerta-btn').addEventListener('click', () => closeModal('alert-modal'));

document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
document.getElementById('goal-form').addEventListener('submit', handleGoalSubmit);
document.getElementById('payable-form').addEventListener('submit', handlePayableSubmit);

// ----------------------
// 🚀 Inicialização
// ----------------------
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        console.log("Usuário logado:", user.email);
        document.getElementById('current-user-name').textContent = user.email;
        document.getElementById('perfil-usuario').textContent = user.displayName || 'Nome não definido';
        document.getElementById('perfil-email').textContent = user.email;
        
        createExpenseChart();
        listenForData();
        
        window.connectBank = (bank) => {
            document.getElementById('perfil-banco').textContent = bank.charAt(0).toUpperCase() + bank.slice(1);
            alert(`Conectado ao ${bank.charAt(0).toUpperCase() + bank.slice(1)}! (Simulado)`);
        };
    } else {
        window.location.href = 'login.html';
    }
});
