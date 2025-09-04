// app.js - Arquivo principal da aplicação
// Este código foi reescrito do zero para garantir que todas as funções do index.html funcionem corretamente.

// Importações necessárias do Firebase SDK Modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, onSnapshot, writeBatch, deleteDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Importações dos arquivos de gráfico
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';
import { createMonthlyChart, updateMonthlyChart } from './monthly-chart-setup.js';

// Configuração do Firebase (use a configuração do seu projeto)
const firebaseConfig = {
    apiKey: "AIzaSyBQeYc0Y-eYONv3ZfvZoJEzOjoKR371P-Y",
    authDomain: "controle-financeiro-65744.firebaseapp.com",
    projectId: "controle-financeiro-65744",
    storageBucket: "controle-financeiro-65744.appspot.com",
    messagingSenderId: "587527394934",
    appId: "1:587527394934:web:c142740ef0139a5cf63157",
    measurementId: "G-RT2T18NQLB"
};

// Inicialização dos serviços do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Variáveis de estado e controle da aplicação
let currentUid = null;
let unsubscribers = []; // Armazena listeners para desativar no logout
let monthlyBarChart = null;
let annualChart = null;

// Dados iniciais e estado da aplicação
const state = {
    transactions: [],
    goals: [],
    payables: [],
    currentDate: new Date(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
};

// Espera o DOM carregar completamente antes de iniciar
document.addEventListener('DOMContentLoaded', () => {
    // Carrega tema salvo
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo === 'dark') {
        document.body.classList.add('dark-theme');
    }

    // Seleção de todos os elementos necessários
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const authModal = document.getElementById('auth-modal');
    const menuBotao = document.getElementById('menu-botao');
    const menuFlutuante = document.getElementById('menu-perfil');
    const monthPrevBtn = document.getElementById('month-prev');
    const monthNextBtn = document.getElementById('month-next');
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const addPayableBtn = document.getElementById('add-payable-btn');
    const logoutBtn = document.getElementById('btn-logout');

    const transactionModal = document.getElementById('transaction-modal');
    const transactionForm = document.getElementById('transaction-form');
    const goalModal = document.getElementById('goal-modal');
    const goalForm = document.getElementById('goal-form');
    const payableModal = document.getElementById('payable-modal');
    const payableForm = document.getElementById('payable-form');
    const alertModal = document.getElementById('alert-modal');

    // --- Listeners de Eventos Globais ---

    // Lida com a navegação entre as páginas
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            if (pageId) {
                navigateToPage(pageId);
            }
        });
    });

    // Abre/fecha o menu de perfil flutuante
    menuBotao.addEventListener('click', () => {
        menuFlutuante.classList.toggle('active');
    });

    // Fecha o menu de perfil flutuante se clicar fora
    document.addEventListener('click', (event) => {
        if (!menuFlutuante.contains(event.target) && !menuBotao.contains(event.target)) {
            menuFlutuante.classList.remove('active');
        }
    });

    // Navegação de mês na página Dashboard
    if (monthPrevBtn) monthPrevBtn.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        updateAllUI();
    });
    if (monthNextBtn) monthNextBtn.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        updateAllUI();
    });

    // Botões para abrir modais de adição
    if (addTransactionBtn) addTransactionBtn.addEventListener('click', () => openTransactionModal());
    if (addGoalBtn) addGoalBtn.addEventListener('click', () => openGoalModal());
    if (addPayableBtn) addPayableBtn.addEventListener('click', () => openPayableModal());

    // Botão de logout fixo na interface
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.clear();
            location.reload();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            // Substitua 'alert' por um modal ou mensagem na UI
            alert('Erro ao fazer logout.');
        }
    });

    // Listeners para os botões de fechar os modais
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });

    // Listeners para os formulários
    if (transactionForm) transactionForm.addEventListener('submit', handleTransactionSubmit);
    if (goalForm) goalForm.addEventListener('submit', handleGoalSubmit);
    if (payableForm) payableForm.addEventListener('submit', handlePayableSubmit);

    // --- Funções de Autenticação e Sincronização de Dados ---

    // Monitora o estado de autenticação do usuário
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

    // Sincroniza dados da nuvem para o estado local na primeira autenticação
    async function firstCloudSync() {
        if (!currentUid) return;
        const pull = async (name) => {
            const snap = await getDocs(collection(db, 'users', currentUid, name));
            return snap.docs.map(d => d.data());
        };
        const [remoteTx, remoteGoals, remotePay] = await Promise.all([
            pull('transactions'), pull('goals'), pull('payables')
        ]);

        state.transactions = remoteTx;
        state.goals = remoteGoals;
        state.payables = remotePay;
        updateAllUI();
    }

    // Inicia os listeners em tempo real para as coleções
    function startRealtimeSync() {
        stopRealtimeSync();
        if (!currentUid) return;
        const listen = (name, apply) => onSnapshot(
            collection(db, 'users', currentUid, name),
            (snap) => {
                const arr = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                apply(arr);
                updateAllUI();
            },
            (error) => {
                console.error("Erro no listener de Firestore: ", error);
            }
        );
        unsubscribers = [
            listen('transactions', arr => state.transactions = arr),
            listen('goals', arr => state.goals = arr),
            listen('payables', arr => state.payables = arr)
        ];
    }

    // Para os listeners do Firestore
    function stopRealtimeSync() {
        unsubscribers.forEach(fn => fn && fn());
        unsubscribers = [];
    }

    // Função central para atualizar a interface
    function updateAllUI() {
        const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
        updateExpenseChart(monthFiltered);
        renderTransactions();
        renderGoals();
        renderPayables();
        updateMonthlySummary();
        updateAnnualSummary();
        checkPayablesForAlerts();
        updateUserUI();
    }

    // --- Funções de Lógica e Renderização ---

    function navigateToPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        const selectedPage = document.getElementById(pageId);
        if (selectedPage) selectedPage.classList.add('active');

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageId) {
                item.classList.add('active');
            }
        });

        const titles = {
            'dashboard-page': 'Visão Geral',
            'goals-page': 'Metas Pessoais',
            'payables-page': 'Despesas a Pagar',
            'resumo-mensal-page': 'Resumo Mensal',
            'resumo-anual-page': 'Resumo Anual',
            'profile-page': 'Perfil',
            'config-page': 'Configurações',
            'ajuda-page': 'Ajuda',
        };
        document.querySelector('.app-header h1').textContent = titles[pageId] || 'Controle Financeiro';
    }

    function openModal(modal) {
        modal.classList.add('active');
    }

    function closeModal(modal) {
        modal.classList.remove('active');
    }

    function openTransactionModal(transaction = null) {
        const titleEl = document.getElementById('transaction-modal-title');
        const deleteBtn = document.getElementById('delete-transaction-btn');
        const typeExpenseBtn = document.getElementById('type-expense-btn');
        const typeIncomeBtn = document.getElementById('type-income-btn');
        const transactionTypeInput = document.getElementById('transaction-type');

        transactionForm.reset();
        document.getElementById('transaction-id').value = '';
        deleteBtn.style.display = 'none';

        if (transaction) {
            titleEl.textContent = 'Editar Transação';
            document.getElementById('transaction-id').value = transaction.id;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('description').value = transaction.description;
            document.getElementById('date').value = transaction.date;
            document.getElementById('category').value = transaction.category;
            transactionTypeInput.value = transaction.type;
            deleteBtn.style.display = 'block';
            if (transaction.type === 'expense') {
                typeExpenseBtn.classList.add('active');
                typeIncomeBtn.classList.remove('active');
            } else {
                typeExpenseBtn.classList.remove('active');
                typeIncomeBtn.classList.add('active');
            }
        } else {
            titleEl.textContent = 'Nova Transação';
            transactionTypeInput.value = 'expense';
            typeExpenseBtn.classList.add('active');
            typeIncomeBtn.classList.remove('active');
        }

        updateCategoryOptions();
        openModal(transactionModal);
    }

    function openGoalModal(goal = null) {
        goalForm.reset();
        document.getElementById('goal-id').value = '';
        const deleteBtn = document.getElementById('delete-goal-btn');
        deleteBtn.style.display = 'none';

        if (goal) {
            document.getElementById('goal-modal-title').textContent = 'Editar Meta';
            document.getElementById('goal-id').value = goal.id;
            document.getElementById('goal-name').value = goal.name;
            document.getElementById('goal-target').value = goal.target;
            document.getElementById('goal-current').value = goal.current;
            document.getElementById('goal-date').value = goal.date;
            deleteBtn.style.display = 'block';
        } else {
            document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
        }
        openModal(goalModal);
    }

    function openPayableModal(payable = null) {
        payableForm.reset();
        document.getElementById('payable-id').value = '';
        const deleteBtn = document.getElementById('delete-payable-btn');
        deleteBtn.style.display = 'none';

        if (payable) {
            document.getElementById('payable-modal-title').textContent = 'Editar Conta a Pagar';
            document.getElementById('payable-id').value = payable.id;
            document.getElementById('payable-description').value = payable.description;
            document.getElementById('payable-category').value = payable.category;
            document.getElementById('payable-amount').value = payable.amount;
            document.getElementById('payable-date').value = payable.date;
            deleteBtn.style.display = 'block';
        } else {
            document.getElementById('payable-modal-title').textContent = 'Nova Conta a Pagar';
        }
        openModal(payableModal);
    }
    
    // --- Funções de manipulação de dados ---
    
    async function handleTransactionSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('transaction-id').value || `tx-${Date.now()}`;
        const transaction = {
            id,
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value,
            date: document.getElementById('date').value,
            category: document.getElementById('category').value,
            type: document.getElementById('transaction-type').value,
            timestamp: Timestamp.now()
        };
        await setDoc(doc(db, 'users', currentUid, 'transactions', id), transaction);
        closeModal(transactionModal);
    }
    
    async function handleGoalSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('goal-id').value || `goal-${Date.now()}`;
        const goal = {
            id,
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value) || 0,
            date: document.getElementById('goal-date').value,
            timestamp: Timestamp.now()
        };
        await setDoc(doc(db, 'users', currentUid, 'goals', id), goal);
        closeModal(goalModal);
    }
    
    async function handlePayableSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('payable-id').value || `pay-${Date.now()}`;
        const payable = {
            id,
            description: document.getElementById('payable-description').value,
            category: document.getElementById('payable-category').value,
            amount: parseFloat(document.getElementById('payable-amount').value),
            date: document.getElementById('payable-date').value,
            paid: false,
            timestamp: Timestamp.now()
        };
        await setDoc(doc(db, 'users', currentUid, 'payables', id), payable);
        closeModal(payableModal);
    }
    
    async function deleteItem(collectionName, id, modal) {
        if (confirm('Tem certeza que deseja deletar?')) {
            await deleteDoc(doc(db, 'users', currentUid, collectionName, id));
            if (modal) closeModal(modal);
        }
    }
    
    // Conecta botões de deletar
    document.getElementById('delete-transaction-btn').addEventListener('click', () => {
        const id = document.getElementById('transaction-id').value;
        deleteItem('transactions', id, transactionModal);
    });
    
    document.getElementById('delete-goal-btn').addEventListener('click', () => {
        const id = document.getElementById('goal-id').value;
        deleteItem('goals', id, goalModal);
    });
    
    document.getElementById('delete-payable-btn').addEventListener('click', () => {
        const id = document.getElementById('payable-id').value;
        deleteItem('payables', id, payableModal);
    });

    // Função para marcar uma conta como paga
    async function markPayablePaid(id) {
        const payableRef = doc(db, 'users', currentUid, 'payables', id);
        await setDoc(payableRef, { paid: true }, { merge: true });
    }

    // --- Renderização de Listas e Elementos da UI ---
    
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
            item.querySelector('.edit-goal').addEventListener('click', (e) => {
                const goalId = e.currentTarget.getAttribute('data-id');
                const goal = state.goals.find(g => g.id === goalId);
                if (goal) openGoalModal(goal);
            });
            list.appendChild(item);
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
                    <button class="icon-btn" data-action="edit" data-id="${p.id}"><span class="material-icons-sharp">edit</span></button>
                    <button class="icon-btn" data-action="delete" data-id="${p.id}"><span class="material-icons-sharp">delete</span></button>
                    ${!isPaid ? `<button class="icon-btn" data-action="pay" data-id="${p.id}"><span class="material-icons-sharp">done</span></button>` : ''}
                </div>
            `;
            // Adiciona listeners para os botões dinamicamente
            item.querySelectorAll('.icon-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const action = btn.getAttribute('data-action');
                    const payable = state.payables.find(p => p.id === id);
                    if (!payable) return;

                    switch (action) {
                        case 'edit':
                            openPayableModal(payable);
                            break;
                        case 'delete':
                            deleteItem('payables', id);
                            break;
                        case 'pay':
                            markPayablePaid(id);
                            break;
                    }
                });
            });
            list.appendChild(item);
        });
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

    // --- Funções de Resumo e Gráficos ---

    function updateMonthlySummary() {
        const mesAtual = state.currentDate.getMonth();
        const anoAtual = state.currentDate.getFullYear();
        const transacoesDoMes = filterTransactionsByMonth(state.transactions, state.currentDate);

        const receita = transacoesDoMes.filter(t => t.type === "income").reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const despesa = transacoesDoMes.filter(t => t.type === "expense").reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const saldo = receita - despesa;

        const currentMonthYearEl = document.getElementById('current-month-year');
        if (currentMonthYearEl) {
            currentMonthYearEl.textContent = state.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }

        document.getElementById('month-income').textContent = formatCurrency(receita);
        document.getElementById('month-expense').textContent = formatCurrency(despesa);
        const balanceEl = document.getElementById('month-balance');
        balanceEl.textContent = formatCurrency(saldo);
        balanceEl.style.color = saldo >= 0 ? 'var(--text-light)' : 'var(--danger-color)';
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
    
    // --- Funções de Autenticação na UI ---
    
    document.getElementById('btn-login-email').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log('Login com email/senha realizado com sucesso!');
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            alert(`Erro: ${error.message}`);
        }
    });

    document.getElementById('btn-signup-email').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log('Conta criada com sucesso!');
        } catch (error) {
            console.error('Erro ao criar conta:', error);
            alert(`Erro: ${error.message}`);
        }
    });

    document.getElementById('btn-login-google').addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            console.log('Login com Google realizado com sucesso!');
        } catch (error) {
            console.error('Erro no login com Google:', error);
            alert(`Erro: ${error.message}`);
        }
    });

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
    
    // --- Funções de Configurações ---
    document.getElementById('trocar-tema').addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const tema = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('tema', tema);
    });

    document.getElementById('resetar-app').addEventListener('click', async () => {
        if (!confirm('Esta ação irá apagar todos os seus dados. Tem certeza?')) return;
        if (!currentUid) {
            alert('Você precisa estar logado para resetar o aplicativo.');
            return;
        }
        
        const deleteCollection = async (collectionRef) => {
            const snapshot = await getDocs(collectionRef);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        };

        try {
            await Promise.all([
                deleteCollection(collection(db, 'users', currentUid, 'transactions')),
                deleteCollection(collection(db, 'users', currentUid, 'goals')),
                deleteCollection(collection(db, 'users', currentUid, 'payables')),
            ]);
            alert('Dados apagados com sucesso!');
        } catch (error) {
            console.error('Erro ao resetar aplicativo:', error);
            alert('Erro ao apagar os dados. Por favor, tente novamente.');
        }
    });

    // --- Funções Utilitárias ---

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

    function filterTransactionsByMonth(transactions, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });
    }

    function fecharAlerta() {
        closeModal(alertModal);
    }
});
