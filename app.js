// --- app.js ---
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Cole aqui a configuração do seu projeto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQeYc0Y-eYONv3ZfvZoJEzOjoKR371P-Y",
    authDomain: "controle-financeiro-65744.firebaseapp.com",
    projectId: "controle-financeiro-65744",
    storageBucket: "controle-financeiro-65744.appspot.com",
    messagingSenderId: "587527394934",
    appId: "1:587527394934:web:c142740ef0139a5cf63157",
    measurementId: "G-RT2T1HNV4G"
};

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        transactions: [],
        goals: [],
        payables: [],
        currentUser: null,
        currentDate: new Date(),
        expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
        incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
        chartType: 'all' // all, expense, income
    };

    // Elementos da UI
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
    const chartBtns = document.querySelectorAll('.chart-btn');
    const chartTitle = document.getElementById('chart-title');
    const currentUserNameEl = document.getElementById('current-user-name');
    
    // VERIFICA AUTENTICAÇÃO
    onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            state.currentUser = user;
            if (currentUserNameEl) {
                currentUserNameEl.textContent = user.displayName || user.email;
            }
            await loadAllData();
            setupUI();
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    } else {
        window.location.href = 'login.html';
    }
});

    
    // CARREGA DADOS DO FIRESTORE
    async function loadAllData() {
        if (!state.currentUser) return;
        const uid = state.currentUser.uid;
        
        // Carregar Transações
        const transQuery = query(collection(db, "transactions"), where("userId", "==", uid), orderBy("date", "desc"));
        const transSnapshot = await getDocs(transQuery);
        state.transactions = transSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Carregar Metas
        const goalsQuery = query(collection(db, "goals"), where("userId", "==", uid));
        const goalsSnapshot = await getDocs(goalsQuery);
        state.goals = goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Carregar Contas a Pagar
        const payablesQuery = query(collection(db, "payables"), where("userId", "==", uid));
        const payablesSnapshot = await getDocs(payablesQuery);
        state.payables = payablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        updateAll();
    }
    
    function setupUI() {
        createExpenseChart();
        setCurrentDate();
        registerServiceWorker();
        
        menuBotao.addEventListener('click', () => {
            menuFlutuante.style.display = menuFlutuante.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener("click", (event) => {
            if (menuFlutuante.style.display === "block" && !menuFlutuante.contains(event.target) && !menuBotao.contains(event.target)) {
                menuFlutuante.style.display = "none";
            }
        });
        
        document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.getAttribute('data-page');
                if (pageId) navigateToPage(pageId);
            });
        });

        addButton.addEventListener('click', () => openTransactionModal());
        cancelBtn.addEventListener('click', () => closeModal(transactionModal));
        
        typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
        typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));
        
        transactionForm.addEventListener('submit', handleTransactionSubmit);
        deleteTransactionBtn.addEventListener('click', deleteTransaction);
        
        chartBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                chartBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.chartType = btn.getAttribute('data-type');
                updateAll();
            });
        });

        // Configurações de Modais (Metas, Contas a Pagar)
        setupModal('add-goal-btn', 'goal-modal', 'goal-form', handleGoalSubmit, 'cancel-goal-btn');
        setupModal('add-payable-btn', 'payable-modal', 'payable-form', handlePayableSubmit, 'cancel-payable-btn');
    }

    // LÓGICA DE DADOS (CRUD no Firestore)
    async function handleTransactionSubmit(e) {
        e.preventDefault();
        const id = transactionIdInput.value;
        const transactionData = {
            type: transactionTypeInput.value,
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value,
            category: categorySelect.value,
            date: document.getElementById('date').value,
            userId: state.currentUser.uid
        };

        if (!transactionData.amount || !transactionData.description || !transactionData.category || !transactionData.date) {
            alert('Preencha todos os campos');
            return;
        }

        if (id) { // Edição
            const docRef = doc(db, "transactions", id);
            await updateDoc(docRef, transactionData);
        } else { // Novo
            await addDoc(collection(db, "transactions"), transactionData);
        }
        
        await loadAllData();
        closeModal(transactionModal);
    }

    async function deleteTransaction() {
        const id = transactionIdInput.value;
        if (!id) return;
        if (confirm("Deseja excluir esta transação?")) {
            await deleteDoc(doc(db, "transactions", id));
            await loadAllData();
            closeModal(transactionModal);
        }
    }
    
    // Funções para Metas
    async function handleGoalSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('goal-id').value;
        const goalData = {
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value),
            date: document.getElementById('goal-date').value,
            userId: state.currentUser.uid
        };
        
        if (id) {
            await updateDoc(doc(db, "goals", id), goalData);
        } else {
            await addDoc(collection(db, "goals"), goalData);
        }
        
        await loadAllData();
        closeModal(document.getElementById('goal-modal'));
    }
    
    // Funções para Contas a Pagar
    async function handlePayableSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('payable-id').value;
        const payableData = {
            description: document.getElementById('payable-description').value,
            category: document.getElementById('payable-category').value,
            amount: parseFloat(document.getElementById('payable-amount').value),
            date: document.getElementById('payable-date').value,
            paid: false,
            userId: state.currentUser.uid
        };

        if (id) {
             await updateDoc(doc(db, "payables", id), payableData);
        } else {
             await addDoc(collection(db, "payables"), payableData);
        }
        
        await loadAllData();
        verificarContasAVencer();
        closeModal(document.getElementById('payable-modal'));
    }

    // ATUALIZAÇÃO E RENDERIZAÇÃO DA UI
        function updateAll() {
        const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
    
        let transactionsForDisplay = monthFiltered;
        if (state.chartType === 'expense') {
            transactionsForDisplay = monthFiltered.filter(t => t.type === 'expense');
        } else if (state.chartType === 'income') {
            transactionsForDisplay = monthFiltered.filter(t => t.type === 'income');
        }
    
        renderSummary(transactionsForDisplay);
        renderChart(transactionsForDisplay);
        renderTransactions(transactionsForDisplay);
        renderCategorySummary(transactionsForDisplay);
    }

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'login.html';
    });

    function filterTransactionsByMonth(transactions, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return transactions.filter(t => {
            const tDate = new Date(t.date + "T03:00:00");
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });
    }

    function renderTransactionList(transactions) {
        const listEl = document.getElementById('transaction-list');
        listEl.innerHTML = '';
        if (transactions.length === 0) {
            listEl.innerHTML = '<li>Nenhuma transação neste filtro.</li>';
            return;
        }
        transactions.forEach(t => {
            const item = document.createElement('li');
            item.className = 'transaction-item';
            item.dataset.id = t.id;
            const isIncome = t.type === 'income';
            const date = formatDateBR(t.date);
            item.innerHTML = `
                <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                    <span class="material-icons-sharp">${isIncome ? 'arrow_upward' : 'arrow_downward'}</span>
                </div>
                <div class="transaction-details">
                    <p>${t.description}</p>
                    <span>${t.category} • ${date}</span>
                </div>
                <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
                </div>
            `;
            item.addEventListener('click', () => openTransactionModal(t));
            listEl.appendChild(item);
        });
    }
    
    function renderGoals() {
        const goalList = document.getElementById('goal-list');
        goalList.innerHTML = '';
        if (state.goals.length === 0) {
            goalList.innerHTML = '<p>Nenhuma meta financeira cadastrada.</p>';
            return;
        }
        state.goals.forEach(goal => {
             const card = document.createElement('div');
             card.className = 'goal-card';
             card.innerHTML = `
                 <span class="meta-title">${goal.name}</span>
                 <span class="meta-info">Alvo: <strong>${formatCurrency(goal.target)}</strong></span>
                 <span class="meta-info">Atual: <strong>${formatCurrency(goal.current)}</strong></span>
                 <div class="goal-actions">
                     <button class="btn-secondary" onclick="window.editGoal('${goal.id}')">Editar</button>
                     <button class="btn-danger" onclick="window.deleteGoal('${goal.id}')">Excluir</button>
                 </div>
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
                <span class="meta-info">Valor: ${formatCurrency(p.amount)}</span>
                <span class="meta-info">Vencimento: ${formatDateBR(p.date)}</span>
                <span class="meta-info">Status: ${p.paid ? '<span style="color:green">Pago</span>' : '<span style="color:red">A pagar</span>'}</span>
                <div class="goal-actions">
                    <button class="btn-secondary" onclick="window.markPayablePaid('${p.id}', ${p.paid})">${p.paid ? 'Desfazer' : 'Marcar Pago'}</button>
                    <button class="btn-danger" onclick="window.deletePayable('${p.id}')">Excluir</button>
                </div>
            `;
            payableList.appendChild(card);
        });
    }

    // FUNÇÕES AUXILIARES E DE UI
    function changeMonth(direction) {
        state.currentDate.setMonth(state.currentDate.getMonth() + direction);
        updateAll();
    }

    function setCurrentDate() {
        const today = new Date();
        document.getElementById('date').valueAsDate = today;
    }
    
    function navigateToPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId)?.classList.add('active');
        navItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-page') === pageId);
        });
    }

    function openModal(modal) { modal.classList.add('active'); }
    function closeModal(modal) { modal.classList.remove('active'); }

    function openTransactionModal(transaction = null) {
        transactionForm.reset();
        setCurrentDate();
        transactionIdInput.value = '';
        deleteTransactionBtn.style.display = 'none';
        transactionModalTitle.textContent = transaction ? 'Editar Transação' : 'Nova Transação';
        if (transaction) {
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
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    }
    
    function setupModal(btnId, modalId, formId, submitHandler, cancelBtnId) {
        const modal = document.getElementById(modalId);
        document.getElementById(btnId).addEventListener('click', () => {
            document.getElementById(formId).reset();
            openModal(modal);
        });
        document.getElementById(cancelBtnId).addEventListener('click', () => closeModal(modal));
        document.getElementById(formId).addEventListener('submit', submitHandler);
    }

    function formatCurrency(value) {
        return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDateBR(dateStr) {
        return new Date(dateStr + "T03:00:00").toLocaleDateString('pt-BR');
    }

    function updateMonthDisplay() {
        document.getElementById('current-month-year').textContent =
            state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    }
    
    function renderSummary(transactions) {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;

        document.getElementById('month-income').textContent = formatCurrency(income);
        document.getElementById('month-expense').textContent = formatCurrency(expense);
        document.getElementById('month-balance').textContent = formatCurrency(balance);
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
        container.innerHTML = '';
        const summary = {};
        transactions.forEach(t => {
            summary[t.category] = (summary[t.category] || 0) + t.amount;
        });
        Object.entries(summary).forEach(([category, total]) => {
            container.innerHTML += `<div class="category-card"><span>${category}</span> <span>${formatCurrency(total)}</span></div>`;
        });
    }
    
    function verificarContasAVencer() {
        const hoje = new Date();
        const proximas = state.payables.filter(c => {
            const vencimento = new Date(c.date + "T03:00:00");
            const diffTime = vencimento - hoje;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return !c.paid && diffDays >= 0 && diffDays <= 5;
        });

        const alertCount = document.getElementById('alert-count');
        const alertList = document.getElementById('alert-list');
        alertCount.textContent = proximas.length;
        alertList.innerHTML = proximas.length ? proximas.map(c => `<li>${c.description} - vence em ${formatDateBR(c.date)}</li>`).join('') : "<li>Nenhuma conta próxima do vencimento.</li>";
    }

    // Funções globais para botões inline
    window.editGoal = (id) => {
        const goal = state.goals.find(g => g.id === id);
        if (!goal) return;
        const modal = document.getElementById('goal-modal');
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        document.getElementById('goal-date').value = goal.date;
        openModal(modal);
    };
    
    window.deleteGoal = async (id) => {
        if (confirm('Excluir esta meta?')) {
            await deleteDoc(doc(db, "goals", id));
            await loadAllData();
        }
    };
    
    window.markPayablePaid = async (id, currentStatus) => {
        await updateDoc(doc(db, "payables", id), { paid: !currentStatus });
        await loadAllData();
    };

    window.deletePayable = async (id) => {
        if (confirm('Excluir esta conta?')) {
            await deleteDoc(doc(db, "payables", id));
            await loadAllData();
        }
    };
    
    // Service Worker
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.error('ServiceWorker registration failed: ', err);
            });
        }
    }
});
