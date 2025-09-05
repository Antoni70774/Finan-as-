// 🔗 app.js - Gerenciador de Finanças Pessoal

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore, enableIndexedDbPersistence, collection, doc,
    setDoc, getDocs, onSnapshot, writeBatch, deleteDoc, updateDoc,
    query, where, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===========================================
// 🔗 Configuração e Inicialização do Firebase
// ===========================================

// Variáveis globais para Firebase, fornecidas pelo ambiente Canvas
// São usadas para conectar o aplicativo à sua conta Firebase
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Instâncias do Firebase
let app, auth, db, userId;
let authReady = false;

const initializeFirebase = async () => {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Habilita o cache offline do Firestore
        await enableIndexedDbPersistence(db)
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Persistência offline desabilitada. Múltiplas abas abertas.');
                } else if (err.code == 'unimplemented') {
                    console.warn('O navegador não suporta persistência offline.');
                }
            });

        // Autentica o usuário com o token fornecido pelo ambiente
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // Em caso de ausência de token, faz o login anônimo
            console.log("Token de autenticação não encontrado. Autenticando anonimamente.");
            // await signInAnonymously(auth); // Descomente para login anônimo
        }

        // Listener para o estado de autenticação do usuário
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                document.getElementById('profile-uid').textContent = userId;
                console.log(`Usuário autenticado com ID: ${userId}`);
                authReady = true;
                setupRealtimeListeners();
            } else {
                console.log("Nenhum usuário logado.");
                authReady = true;
            }
        });

    } catch (error) {
        console.error("Erro ao inicializar Firebase ou autenticar:", error);
    }
};

// ===========================================
// 🔗 Funções de Utilitário
// ===========================================

const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatMonthYear = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// ===========================================
// 🔗 Gerenciamento de Dados no Firestore
// ===========================================

const getCollectionRef = (collectionName) => {
    if (!userId || !db) {
        console.error("ID do usuário ou instância do Firestore não disponível.");
        return null;
    }
    return collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`);
};

const setupRealtimeListeners = () => {
    if (!db || !userId) {
        return;
    }

    // Listener para Transações
    const transactionsRef = getCollectionRef('transactions');
    if (transactionsRef) {
        onSnapshot(query(transactionsRef), (snapshot) => {
            const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateDashboard(transactions);
            updateTransactionList(transactions);
            updateMonthlySummaryPage(transactions);
            updateAnnualSummaryPage(transactions);
        }, (error) => {
            console.error("Erro ao obter transações em tempo real:", error);
        });
    }

    // Listener para Metas
    const goalsRef = getCollectionRef('goals');
    if (goalsRef) {
        onSnapshot(query(goalsRef), (snapshot) => {
            const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateGoalsList(goals);
        }, (error) => {
            console.error("Erro ao obter metas em tempo real:", error);
        });
    }

    // Listener para Contas a Pagar
    const payablesRef = getCollectionRef('payables');
    if (payablesRef) {
        onSnapshot(query(payablesRef), (snapshot) => {
            const payables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updatePayablesList(payables);
            checkPayablesAlerts(payables);
        }, (error) => {
            console.error("Erro ao obter contas a pagar em tempo real:", error);
        });
    }
};

const saveTransaction = async (data) => {
    try {
        const transactionsRef = getCollectionRef('transactions');
        if (transactionsRef) {
            if (data.id) {
                // Atualizar Transação existente
                const transactionDocRef = doc(transactionsRef, data.id);
                await updateDoc(transactionDocRef, data);
                console.log("Transação atualizada com sucesso!");
            } else {
                // Adicionar nova Transação
                await addDoc(transactionsRef, {
                    ...data,
                    createdAt: new Date()
                });
                console.log("Transação salva com sucesso!");
            }
        }
    } catch (e) {
        console.error("Erro ao salvar a transação:", e);
    }
};

const deleteTransaction = async (id) => {
    try {
        const transactionsRef = getCollectionRef('transactions');
        if (transactionsRef) {
            await deleteDoc(doc(transactionsRef, id));
            console.log("Transação deletada com sucesso!");
        }
    } catch (e) {
        console.error("Erro ao deletar a transação:", e);
    }
};

const saveGoal = async (data) => {
    try {
        const goalsRef = getCollectionRef('goals');
        if (goalsRef) {
            if (data.id) {
                const goalDocRef = doc(goalsRef, data.id);
                await updateDoc(goalDocRef, data);
                console.log("Meta atualizada com sucesso!");
            } else {
                await addDoc(goalsRef, {
                    ...data,
                    createdAt: new Date()
                });
                console.log("Meta salva com sucesso!");
            }
        }
    } catch (e) {
        console.error("Erro ao salvar a meta:", e);
    }
};

const deleteGoal = async (id) => {
    try {
        const goalsRef = getCollectionRef('goals');
        if (goalsRef) {
            await deleteDoc(doc(goalsRef, id));
            console.log("Meta deletada com sucesso!");
        }
    } catch (e) {
        console.error("Erro ao deletar a meta:", e);
    }
};

const savePayable = async (data) => {
    try {
        const payablesRef = getCollectionRef('payables');
        if (payablesRef) {
            if (data.id) {
                const payableDocRef = doc(payablesRef, data.id);
                await updateDoc(payableDocRef, data);
                console.log("Conta a pagar atualizada com sucesso!");
            } else {
                await addDoc(payablesRef, {
                    ...data,
                    createdAt: new Date()
                });
                console.log("Conta a pagar salva com sucesso!");
            }
        }
    } catch (e) {
        console.error("Erro ao salvar a conta a pagar:", e);
    }
};

const deletePayable = async (id) => {
    try {
        const payablesRef = getCollectionRef('payables');
        if (payablesRef) {
            await deleteDoc(doc(payablesRef, id));
            console.log("Conta a pagar deletada com sucesso!");
        }
    } catch (e) {
        console.error("Erro ao deletar a conta a pagar:", e);
    }
};

// ===========================================
// 🔗 Funções de Atualização da UI
// ===========================================

let mainChart, monthlyChart, annualChart;

// --- Dashboard ---
const updateDashboard = (transactions) => {
    const totalRevenue = transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalBalance = totalRevenue - totalExpense;

    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('total-expense').textContent = formatCurrency(totalExpense);
    document.getElementById('total-balance').textContent = formatCurrency(totalBalance);

    const categories = [...new Set(transactions.map(t => t.category))].filter(c => c);
    const expenseData = categories.map(c => transactions.filter(t => t.type === 'despesa' && t.category === c).reduce((sum, t) => sum + parseFloat(t.amount), 0));

    if (mainChart) {
        mainChart.destroy();
    }
    
    const ctx = document.getElementById('main-chart').getContext('2d');
    mainChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: expenseData,
                backgroundColor: [
                    '#4a90e2', '#a0b3c8', '#ff6b6b', '#4caf50', '#f1c40f',
                    '#9b59b6', '#3498db', '#e67e22', '#2ecc71', '#d35400'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null) { label += formatCurrency(context.parsed); }
                            return label;
                        }
                    }
                }
            }
        }
    });
};

const updateTransactionList = (transactions) => {
    const transactionListEl = document.getElementById('transaction-list');
    transactionListEl.innerHTML = '';
    const recentTransactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    recentTransactions.forEach(t => {
        const item = document.createElement('li');
        item.className = 'transaction-item';
        item.dataset.id = t.id;
        item.dataset.type = t.type;
        item.dataset.description = t.description;
        item.dataset.amount = t.amount;
        item.dataset.category = t.category;
        item.dataset.date = t.date;

        const iconClass = t.type === 'receita' ? 'trending_up' : 'trending_down';
        const iconColorClass = t.type === 'receita' ? 'income' : 'expense';

        item.innerHTML = `
            <span class="material-symbols-sharp transaction-icon ${iconColorClass}">${iconClass}</span>
            <div class="transaction-details">
                <div class="transaction-info">
                    <span class="description">${t.description}</span>
                    <span class="date">${formatDate(t.date)}</span>
                </div>
                <span class="transaction-amount">${formatCurrency(parseFloat(t.amount))}</span>
            </div>
        `;
        transactionListEl.appendChild(item);
    });
};

const updateGoalsList = (goals) => {
    const goalsListEl = document.getElementById('goals-list');
    goalsListEl.innerHTML = '';
    goals.forEach(goal => {
        const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
        const item = document.createElement('div');
        item.className = 'goal-item';
        item.dataset.id = goal.id;
        item.dataset.name = goal.name;
        item.dataset.targetAmount = goal.targetAmount;
        item.dataset.currentAmount = goal.currentAmount;
        item.innerHTML = `
            <h4>${goal.name}</h4>
            <p class="goal-amounts">
                <span>Meta: ${formatCurrency(parseFloat(goal.targetAmount))}</span>
                <span>Economizado: ${formatCurrency(parseFloat(goal.currentAmount))}</span>
            </p>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress > 100 ? 100 : progress}%;"></div>
            </div>
            <span class="goal-progress-text">${Math.round(progress)}% Completo</span>
        `;
        goalsListEl.appendChild(item);
    });
};

const updatePayablesList = (payables) => {
    const payablesListEl = document.getElementById('payables-list');
    payablesListEl.innerHTML = '';

    const sortedPayables = payables.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    sortedPayables.forEach(payable => {
        const item = document.createElement('div');
        const isPaid = payable.isPaid;
        const isOverdue = !isPaid && new Date(payable.dueDate) < new Date();
        const isDueToday = !isPaid && new Date(payable.dueDate).toDateString() === new Date().toDateString();

        item.className = `payable-item ${isOverdue ? 'overdue' : ''} ${isDueToday ? 'due-today' : ''}`;
        item.dataset.id = payable.id;
        item.dataset.name = payable.name;
        item.dataset.amount = payable.amount;
        item.dataset.dueDate = payable.dueDate;
        item.dataset.isPaid = isPaid;
        
        item.innerHTML = `
            <div>
                <h4>${payable.name}</h4>
                <p>Vencimento: ${formatDate(payable.dueDate)}</p>
                <p>Status: ${isPaid ? 'Pago' : 'Aberto'}</p>
            </div>
            <span class="transaction-amount" style="color: ${isPaid ? 'var(--success-color)' : 'var(--danger-color)'}">${formatCurrency(parseFloat(payable.amount))}</span>
        `;
        payablesListEl.appendChild(item);
    });
};

const checkPayablesAlerts = (payables) => {
    const overdueCount = payables.filter(p => new Date(p.dueDate) < new Date() && !p.isPaid).length;
    const badge = document.getElementById('alert-badge');
    badge.textContent = overdueCount;
    badge.style.display = overdueCount > 0 ? 'block' : 'none';
};

// --- Resumo Mensal ---
const updateMonthlySummaryPage = (transactions) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });

    const monthlyRevenue = monthlyTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const monthlyExpense = monthlyTransactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const monthlyBalance = monthlyRevenue - monthlyExpense;

    document.getElementById('monthly-page-title').textContent = `Resumo Mensal - ${new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
    document.getElementById('monthly-revenue-summary').textContent = formatCurrency(monthlyRevenue);
    document.getElementById('monthly-expense-summary').textContent = formatCurrency(monthlyExpense);
    document.getElementById('monthly-balance-summary').textContent = formatCurrency(monthlyBalance);

    // Gráfico de Pizza no Resumo Mensal
    const categories = [...new Set(monthlyTransactions.map(t => t.category))].filter(c => c);
    const expenseData = categories.map(c => monthlyTransactions.filter(t => t.type === 'despesa' && t.category === c).reduce((sum, t) => sum + parseFloat(t.amount), 0));

    const monthlyPieChartCtx = document.getElementById('monthly-pie-chart').getContext('2d');
    if (monthlyChart) { monthlyChart.destroy(); }
    monthlyChart = new Chart(monthlyPieChartCtx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: expenseData,
                backgroundColor: [
                    '#4a90e2', '#a0b3c8', '#ff6b6b', '#4caf50', '#f1c40f',
                    '#9b59b6', '#3498db', '#e67e22', '#2ecc71', '#d35400'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null) { label += formatCurrency(context.parsed); }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // Transações Realizadas (lista)
    const monthlyTransactionsListEl = document.getElementById('monthly-transactions-list');
    monthlyTransactionsListEl.innerHTML = '';
    const sortedTransactions = monthlyTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedTransactions.forEach(t => {
        const item = document.createElement('li');
        item.className = 'transaction-item';
        const iconClass = t.type === 'receita' ? 'trending_up' : 'trending_down';
        const iconColorClass = t.type === 'receita' ? 'income' : 'expense';
        item.innerHTML = `
            <span class="material-symbols-sharp transaction-icon ${iconColorClass}">${iconClass}</span>
            <div class="transaction-details">
                <div class="transaction-info">
                    <span class="description">${t.description}</span>
                    <span class="date">${formatDate(t.date)}</span>
                </div>
                <span class="transaction-amount">${formatCurrency(parseFloat(t.amount))}</span>
            </div>
        `;
        monthlyTransactionsListEl.appendChild(item);
    });

    // Resumo por Categoria
    const monthlyCategorySummaryEl = document.getElementById('monthly-category-summary');
    monthlyCategorySummaryEl.innerHTML = '';
    const categoriesSummary = monthlyTransactions.filter(t => t.type === 'despesa').reduce((acc, t) => {
        const category = t.category || 'Outros';
        acc[category] = (acc[category] || 0) + parseFloat(t.amount);
        return acc;
    }, {});
    for (const [category, amount] of Object.entries(categoriesSummary)) {
        const item = document.createElement('div');
        item.className = 'summary-item';
        item.innerHTML = `
            <h4>${capitalizeFirstLetter(category)}</h4>
            <p>${formatCurrency(amount)}</p>
        `;
        monthlyCategorySummaryEl.appendChild(item);
    }
};

// --- Resumo Anual ---
const updateAnnualSummaryPage = (transactions) => {
    const annualTransactions = transactions.filter(t => new Date(t.date).getFullYear() === new Date().getFullYear());
    const annualRevenue = annualTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const annualExpense = annualTransactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const annualBalance = annualRevenue - annualExpense;

    document.getElementById('annual-page-title').textContent = `Resumo Anual - ${new Date().getFullYear()}`;
    document.getElementById('annual-revenue-summary').textContent = formatCurrency(annualRevenue);
    document.getElementById('annual-expense-summary').textContent = formatCurrency(annualExpense);
    document.getElementById('annual-balance-summary').textContent = formatCurrency(annualBalance);
    
    // Gráfico de Linha no Resumo Anual
    const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('pt-BR', { month: 'short' }));
    const monthlyData = months.map((month, index) => {
        const monthTransactions = annualTransactions.filter(t => new Date(t.date).getMonth() === index);
        const revenue = monthTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = monthTransactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        return { revenue, expense };
    });

    const revenueData = monthlyData.map(d => d.revenue);
    const expenseData = monthlyData.map(d => d.expense);

    const annualChartCtx = document.getElementById('annual-chart').getContext('2d');
    if (annualChart) { annualChart.destroy(); }
    annualChart = new Chart(annualChartCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Receita',
                    data: revenueData,
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(74, 144, 226, 0.2)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Despesa',
                    data: expenseData,
                    borderColor: 'var(--danger-color)',
                    backgroundColor: 'rgba(229, 62, 62, 0.2)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
};

// ===========================================
// 🔗 Gerenciamento de Eventos da UI
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();

    const appMain = document.getElementById('app-main');
    const bottomNav = document.querySelector('.bottom-nav');
    const headerTitle = document.getElementById('header-title');
    const navItems = document.querySelectorAll('.nav-item');
    const transactionModalOverlay = document.getElementById('transaction-modal-overlay');
    const goalModalOverlay = document.getElementById('goal-modal-overlay');
    const payableModalOverlay = document.getElementById('payable-modal-overlay');
    const transactionForm = document.getElementById('transaction-form');
    const goalForm = document.getElementById('goal-form');
    const payableForm = document.getElementById('payable-form');
    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');
    const toggleThemeBtn = document.getElementById('toggle-theme-btn');
    const body = document.body;

    // --- Navegação entre páginas ---
    const navigateTo = (page) => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNavButton = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (activeNavButton) {
            activeNavButton.classList.add('active');
        }
        headerTitle.textContent = capitalizeFirstLetter(page.replace('-', ' '));
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    // --- Abertura de Modais ---
    document.getElementById('add-transaction-fab').addEventListener('click', () => {
        document.getElementById('transaction-modal-title').textContent = 'Adicionar Transação';
        transactionForm.reset();
        document.getElementById('transaction-id').value = '';
        transactionModalOverlay.style.display = 'flex';
    });

    document.getElementById('add-goal-btn').addEventListener('click', () => {
        document.getElementById('goal-modal-title').textContent = 'Adicionar Nova Meta';
        goalForm.reset();
        document.getElementById('goal-id').value = '';
        goalModalOverlay.style.display = 'flex';
    });

    document.getElementById('add-payable-btn').addEventListener('click', () => {
        document.getElementById('payable-modal-title').textContent = 'Adicionar Conta a Pagar';
        payableForm.reset();
        document.getElementById('payable-id').value = '';
        payableModalOverlay.style.display = 'flex';
    });
    
    // --- Fechamento de Modais ---
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });

    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.target.closest('.modal-overlay').style.display = 'none';
        });
    });

    // --- Submissão de Formulários ---
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            id: document.getElementById('transaction-id').value,
            type: document.getElementById('transaction-type').value,
            description: document.getElementById('transaction-description').value,
            amount: parseFloat(document.getElementById('transaction-amount').value),
            category: document.getElementById('transaction-category').value,
            date: document.getElementById('transaction-date').value
        };
        await saveTransaction(data);
        transactionModalOverlay.style.display = 'none'; // CORREÇÃO: Fecha o modal após a ação
    });

    goalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            id: document.getElementById('goal-id').value,
            name: document.getElementById('goal-name').value,
            targetAmount: parseFloat(document.getElementById('goal-target-amount').value),
            currentAmount: parseFloat(document.getElementById('goal-current-amount').value)
        };
        await saveGoal(data);
        goalModalOverlay.style.display = 'none'; // CORREÇÃO: Fecha o modal após a ação
    });

    payableForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            id: document.getElementById('payable-id').value,
            name: document.getElementById('payable-name').value,
            amount: parseFloat(document.getElementById('payable-amount').value),
            dueDate: document.getElementById('payable-due-date').value,
            isPaid: document.getElementById('payable-is-paid').checked
        };
        await savePayable(data);
        payableModalOverlay.style.display = 'none'; // CORREÇÃO: Fecha o modal após a ação
    });

    // --- Edição e Deleção de Itens ---
    appMain.addEventListener('click', async (e) => {
        const item = e.target.closest('.transaction-item') || e.target.closest('.goal-item') || e.target.closest('.payable-item');
        if (item) {
            const itemId = item.dataset.id;

            // Lógica para ABRIR o modal de edição
            if (item.classList.contains('transaction-item')) {
                const transaction = {
                    id: itemId,
                    type: item.dataset.type,
                    description: item.dataset.description,
                    amount: parseFloat(item.dataset.amount),
                    category: item.dataset.category,
                    date: item.dataset.date
                };
                document.getElementById('transaction-id').value = transaction.id;
                document.getElementById('transaction-type').value = transaction.type;
                document.getElementById('transaction-description').value = transaction.description;
                document.getElementById('transaction-amount').value = transaction.amount;
                document.getElementById('transaction-category').value = transaction.category;
                document.getElementById('transaction-date').value = transaction.date;
                document.getElementById('transaction-modal-title').textContent = 'Editar Transação';
                transactionModalOverlay.style.display = 'flex';
            } else if (item.classList.contains('goal-item')) {
                const goal = {
                    id: itemId,
                    name: item.dataset.name,
                    targetAmount: parseFloat(item.dataset.targetAmount),
                    currentAmount: parseFloat(item.dataset.currentAmount)
                };
                document.getElementById('goal-id').value = goal.id;
                document.getElementById('goal-name').value = goal.name;
                document.getElementById('goal-target-amount').value = goal.targetAmount;
                document.getElementById('goal-current-amount').value = goal.currentAmount;
                document.getElementById('goal-modal-title').textContent = 'Editar Meta';
                goalModalOverlay.style.display = 'flex';
            } else if (item.classList.contains('payable-item')) {
                const payable = {
                    id: itemId,
                    name: item.dataset.name,
                    amount: parseFloat(item.dataset.amount),
                    dueDate: item.dataset.dueDate,
                    isPaid: item.dataset.isPaid === 'true'
                };
                document.getElementById('payable-id').value = payable.id;
                document.getElementById('payable-name').value = payable.name;
                document.getElementById('payable-amount').value = payable.amount;
                document.getElementById('payable-due-date').value = payable.dueDate;
                document.getElementById('payable-is-paid').checked = payable.isPaid;
                document.getElementById('payable-modal-title').textContent = 'Editar Conta a Pagar';
                payableModalOverlay.style.display = 'flex';
            }
        }
    });

    // --- Alternar tema ---
    toggleThemeBtn.addEventListener('click', () => {
        body.classList.toggle('dark-theme');
    });

    // --- Botão de perfil e menu lateral ---
    profileBtn.addEventListener('click', (e) => {
        profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
    });

    // --- Navegação do menu lateral ---
    profileMenu.addEventListener('click', (e) => {
        const page = e.target.dataset.page;
        if (page) {
            navigateTo(page);
            profileMenu.style.display = 'none';
        }
    });

    // --- Botão de logout ---
    document.getElementById('btn-logout').addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Usuário deslogado com sucesso.");
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    });
});
