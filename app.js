// Importações de bibliotecas do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQeYc0Y-eYONv3ZfvZoJEzOjoKR371P-Y",
    authDomain: "controle-financeiro-65744.firebaseapp.com",
    projectId: "controle-financeiro-65744",
    storageBucket: "controle-financeiro-65744.firebasestorage.app",
    messagingSenderId: "587527394934",
    appId: "1:587527394934:web:c142740ef0139a5cf63157",
    measurementId: "G-RT2T1HNV4G"
};

// Variáveis globais para uso do Firebase
let app, auth, db, userId;

// Inicializa o Firebase e o aplicativo
document.addEventListener('DOMContentLoaded', () => {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Monitora o estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            userId = user.uid;
            console.log("Usuário autenticado:", userId);
            
            // Exibe a interface do aplicativo
            document.getElementById('app-main').style.display = 'block';
            document.getElementById('current-user-name').textContent = user.displayName || user.email || 'Usuário';
            
            // Configura os listeners em tempo real
            setupRealtimeListeners();
            setupEventListeners();
        } else {
            // Usuário não está logado, redireciona para a página de login
            window.location.href = 'login.html';
        }
    });

    // Adiciona botão de logout
    const logoutBtn = document.createElement('li');
    logoutBtn.textContent = '🚪 Sair';
    logoutBtn.onclick = () => {
        signOut(auth).then(() => {
            console.log("Usuário deslogado.");
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error("Erro ao deslogar:", error);
        });
    };
    const menuPerfilUl = document.querySelector('#menu-perfil ul');
    if (menuPerfilUl) {
        menuPerfilUl.appendChild(logoutBtn);
    }
});

// Funções de manipulação de dados em tempo real com Firestore
const setupRealtimeListeners = () => {
    if (!userId) {
        return;
    }

    const transactionCollection = collection(db, `users/${userId}/transactions`);
    onSnapshot(transactionCollection, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Transações em tempo real:", transactions);
        updateUI(transactions);
    }, (error) => {
        console.error("Erro ao obter transações em tempo real:", error);
    });

    const payableCollection = collection(db, `users/${userId}/payables`);
    onSnapshot(payableCollection, (snapshot) => {
        const payables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Contas a pagar em tempo real:", payables);
        updatePayablesUI(payables);
        checkDueDates(payables);
    }, (error) => {
        console.error("Erro ao obter contas a pagar em tempo real:", error);
    });
    
    const goalCollection = collection(db, `users/${userId}/goals`);
    onSnapshot(goalCollection, (snapshot) => {
        const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Metas em tempo real:", goals);
        renderGoals(goals);
    }, (error) => {
        console.error("Erro ao obter metas em tempo real:", error);
    });
};

// Funções para renderizar gráficos, resumo e transações
const updateUI = (transactions) => {
    const currentMonthEl = document.getElementById('current-month-year');
    if (!currentMonthEl) {
        console.error("Elemento 'current-month-year' não encontrado.");
        return;
    }
    const currentMonth = currentMonthEl.textContent;
    const [month, year] = currentMonth.split(' de ');
    const currentMonthIndex = months.indexOf(month);

    const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonthIndex && transactionDate.getFullYear().toString() === year;
    });

    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    document.getElementById('month-income').textContent = `R$ ${income.toFixed(2).replace('.', ',')}`;
    document.getElementById('month-expense').textContent = `R$ ${expense.toFixed(2).replace('.', ',')}`;
    document.getElementById('month-balance').textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;

    renderChart(filteredTransactions);
    renderCategorySummary(filteredTransactions);
    renderRecentTransactions(filteredTransactions);
};

const renderChart = (transactions) => {
    const ctx = document.getElementById('main-chart');
    if (!ctx) {
        console.error("Elemento 'main-chart' não encontrado.");
        return;
    }
    const chartContext = ctx.getContext('2d');
    if (window.myChart) {
        window.myChart.destroy();
    }
    const categories = [...new Set(transactions.map(t => t.category))];
    const data = categories.map(cat => transactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0));
    window.myChart = new Chart(chartContext, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: data,
                backgroundColor: ['#4A90E2', '#FF6384', '#FFCE56', '#2ecc71']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
};

const renderCategorySummary = (transactions) => {
    const summaryContainer = document.getElementById('category-summary');
    if (!summaryContainer) {
        console.error("Elemento 'category-summary' não encontrado.");
        return;
    }
    summaryContainer.innerHTML = '';
    const categories = {};
    transactions.forEach(t => {
        if (!categories[t.category]) {
            categories[t.category] = { expense: 0, income: 0 };
        }
        categories[t.category][t.type] += t.amount;
    });
    for (const cat in categories) {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <h4>${cat}</h4>
            <p>Receita: R$ ${categories[cat].income.toFixed(2).replace('.', ',')}</p>
            <p>Despesa: R$ ${categories[cat].expense.toFixed(2).replace('.', ',')}</p>
        `;
        summaryContainer.appendChild(item);
    }
};

const renderRecentTransactions = (transactions) => {
    const list = document.getElementById('transaction-list');
    if (!list) {
        console.error("Elemento 'transaction-list' não encontrado.");
        return;
    }
    list.innerHTML = '';
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).forEach(t => {
        const item = document.createElement('li');
        item.className = `transaction-item ${t.type}`;
        item.innerHTML = `
            <span>${t.description}</span>
            <span class="amount">R$ ${t.amount.toFixed(2).replace('.', ',')}</span>
        `;
        item.dataset.id = t.id;
        item.addEventListener('click', () => editTransaction(t));
        list.appendChild(item);
    });
};

// Funções de Edição e Exclusão
const editTransaction = (transaction) => {
    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('description').value = transaction.description;
    document.getElementById('category').value = transaction.category;
    document.getElementById('date').value = transaction.date;
    document.getElementById('transaction-type').value = transaction.type;
    document.getElementById('transaction-modal-title').textContent = 'Editar Transação';
    document.getElementById('delete-transaction-btn').style.display = 'block';
    transactionModal.style.display = 'flex';
};

const deleteTransaction = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
        try {
            await deleteDoc(doc(db, `users/${userId}/transactions`, id));
            transactionModal.style.display = 'none';
        } catch (e) {
            console.error("Erro ao excluir transação: ", e);
        }
    }
};

document.getElementById('delete-transaction-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const id = document.getElementById('transaction-id').value;
    if (id) {
        deleteTransaction(id);
    }
});


// Manipulação do modal de transações
const transactionModal = document.getElementById('transaction-modal');
const transactionForm = document.getElementById('transaction-form');
const transactionTypeExpenseBtn = document.getElementById('type-expense-btn');
const transactionTypeIncomeBtn = document.getElementById('type-income-btn');
const transactionTypeInput = document.getElementById('transaction-type');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const cancelBtn = document.getElementById('cancel-btn');

if (transactionTypeExpenseBtn) {
    transactionTypeExpenseBtn.addEventListener('click', () => {
        transactionTypeExpenseBtn.classList.add('active');
        transactionTypeIncomeBtn.classList.remove('active');
        transactionTypeInput.value = 'expense';
    });
}

if (transactionTypeIncomeBtn) {
    transactionTypeIncomeBtn.addEventListener('click', () => {
        transactionTypeIncomeBtn.classList.add('active');
        transactionTypeExpenseBtn.classList.remove('active');
        transactionTypeInput.value = 'income';
    });
}

const showTransactionModal = () => {
    if (transactionForm) {
        transactionForm.reset();
    }
    const modalTitle = document.getElementById('transaction-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Nova Transação';
    }
    const transactionIdInput = document.getElementById('transaction-id');
    if (transactionIdInput) {
        transactionIdInput.value = '';
    }
    const deleteBtn = document.getElementById('delete-transaction-btn');
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
    }
    if (transactionModal) {
        transactionModal.style.display = 'flex';
    }
};

if (addTransactionBtn) {
    addTransactionBtn.addEventListener('click', showTransactionModal);
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        if (transactionModal) {
            transactionModal.style.display = 'none';
        }
    });
}

if (transactionForm) {
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
            type: document.getElementById('transaction-type').value,
            userId: userId
        };

        if (!userId) {
            console.error("userId não está disponível. Não é possível salvar a transação.");
            return;
        }

        try {
            const transactionId = document.getElementById('transaction-id').value;
            if (transactionId) {
                const docRef = doc(db, `users/${userId}/transactions`, transactionId);
                await updateDoc(docRef, data);
            } else {
                await addDoc(collection(db, `users/${userId}/transactions`), data);
            }
            if (transactionModal) {
                transactionModal.style.display = 'none';
            }
            transactionForm.reset();
        } catch (e) {
            console.error("Erro ao adicionar/atualizar transação: ", e);
        }
    });
}

// Outras funções de controle da interface e funcionalidades
const switchPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.classList.add('active');
    }
};

const setupEventListeners = () => {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pageId = e.currentTarget.dataset.page;
            if (pageId) {
                switchPage(pageId);
                document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
                e.currentTarget.classList.add('active');
            }
        });
    });

    document.getElementById('menu-botao').addEventListener('click', () => {
        const menu = document.getElementById('menu-perfil');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    });
};

// Funções para exibir modais (metas e contas a pagar)
const goalModal = document.getElementById('goal-modal');
const payableModal = document.getElementById('payable-modal');
const addGoalBtn = document.getElementById('add-goal-btn');
const cancelGoalBtn = document.getElementById('cancel-goal-btn');
const addPayableBtn = document.getElementById('add-payable-btn');
const cancelPayableBtn = document.getElementById('cancel-payable-btn');

if (addGoalBtn) {
    addGoalBtn.addEventListener('click', () => {
        if (goalModal) {
            goalModal.style.display = 'flex';
        }
    });
}

if (cancelGoalBtn) {
    cancelGoalBtn.addEventListener('click', () => {
        if (goalModal) {
            goalModal.style.display = 'none';
        }
    });
}

if (addPayableBtn) {
    addPayableBtn.addEventListener('click', () => {
        if (payableModal) {
            payableModal.style.display = 'flex';
        }
    });
}

if (cancelPayableBtn) {
    cancelPayableBtn.addEventListener('click', () => {
        if (payableModal) {
            payableModal.style.display = 'none';
        }
    });
}

// Funções para salvar dados no Firestore
const saveGoal = async (goalData, goalId) => {
    try {
        if (goalId) {
            await updateDoc(doc(db, `users/${userId}/goals`, goalId), goalData);
        } else {
            await addDoc(collection(db, `users/${userId}/goals`), goalData);
        }
        if (goalModal) {
            goalModal.style.display = 'none';
        }
    } catch (e) {
        console.error("Erro ao adicionar/atualizar meta: ", e);
    }
};

const savePayable = async (payableData, payableId) => {
    try {
        if (payableId) {
            await updateDoc(doc(db, `users/${userId}/payables`, payableId), payableData);
        } else {
            await addDoc(collection(db, `users/${userId}/payables`), payableData);
        }
        if (payableModal) {
            payableModal.style.display = 'none';
        }
    } catch (e) {
        console.error("Erro ao adicionar/atualizar conta a pagar: ", e);
    }
};

// Funções para renderizar listas
const renderGoals = (goals) => {
    const list = document.getElementById('goal-list');
    if (!list) return;
    list.innerHTML = '';
    goals.forEach(goal => {
        const item = document.createElement('div');
        item.className = 'goal-item';
        item.innerHTML = `
            <h3>${goal.name}</h3>
            <p>Alvo: R$ ${goal.target.toFixed(2).replace('.', ',')}</p>
            <p>Atual: R$ ${goal.current.toFixed(2).replace('.', ',')}</p>
        `;
        item.dataset.id = goal.id;
        item.addEventListener('click', () => editGoal(goal));
        list.appendChild(item);
    });
};

const updatePayablesUI = (payables) => {
    const list = document.getElementById('payable-list');
    if (!list) return;
    list.innerHTML = '';
    payables.forEach(p => {
        const item = document.createElement('div');
        item.className = 'payable-item';
        item.innerHTML = `
            <h3>${p.description}</h3>
            <p>Valor: R$ ${p.amount.toFixed(2).replace('.', ',')}</p>
            <p>Vencimento: ${p.date}</p>
        `;
        item.dataset.id = p.id;
        item.addEventListener('click', () => editPayable(p));
        list.appendChild(item);
    });
};

// Funções de Edição e Exclusão para Metas e Contas a Pagar
const editGoal = (goal) => {
    document.getElementById('goal-id').value = goal.id;
    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-target').value = goal.target;
    document.getElementById('goal-current').value = goal.current;
    document.getElementById('goal-date').value = goal.date;
    document.getElementById('goal-modal-title').textContent = 'Editar Meta';
    document.getElementById('delete-goal-btn').style.display = 'block';
    goalModal.style.display = 'flex';
};

const deleteGoal = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta meta?")) {
        try {
            await deleteDoc(doc(db, `users/${userId}/goals`, id));
            goalModal.style.display = 'none';
        } catch (e) {
            console.error("Erro ao excluir meta: ", e);
        }
    }
};

document.getElementById('delete-goal-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const id = document.getElementById('goal-id').value;
    if (id) {
        deleteGoal(id);
    }
});

const editPayable = (payable) => {
    document.getElementById('payable-id').value = payable.id;
    document.getElementById('payable-description').value = payable.description;
    document.getElementById('payable-category').value = payable.category;
    document.getElementById('payable-amount').value = payable.amount;
    document.getElementById('payable-date').value = payable.date;
    document.getElementById('payable-modal-title').textContent = 'Editar Conta a Pagar';
    document.getElementById('delete-payable-btn').style.display = 'block';
    payableModal.style.display = 'flex';
};

const deletePayable = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta conta a pagar?")) {
        try {
            await deleteDoc(doc(db, `users/${userId}/payables`, id));
            payableModal.style.display = 'none';
        } catch (e) {
            console.error("Erro ao excluir conta a pagar: ", e);
        }
    }
};

document.getElementById('delete-payable-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const id = document.getElementById('payable-id').value;
    if (id) {
        deletePayable(id);
    }
});

// Função para verificar contas a pagar e gerar alertas
const checkDueDates = (payables) => {
    const today = new Date().toISOString().split('T')[0];
    const alerts = payables.filter(p => p.date === today);
    const alertCount = document.getElementById('alert-count');
    const alertList = document.getElementById('alert-list');

    if (alertCount) {
        alertCount.textContent = alerts.length;
    }
    if (alertList) {
        alertList.innerHTML = '';
    }

    if (alerts.length > 0) {
        alerts.forEach(alert => {
            const li = document.createElement('li');
            li.textContent = `${alert.description} - R$ ${alert.amount.toFixed(2).replace('.', ',')}`;
            if (alertList) {
                alertList.appendChild(li);
            }
        });
    } else {
        const li = document.createElement('li');
        li.textContent = "Nenhuma conta a vencer hoje.";
        if (alertList) {
            alertList.appendChild(li);
        }
    }
};

// Funções para manipulação de alerta
const alertModal = document.getElementById('alert-modal');
window.abrirAlerta = () => {
    if (alertModal) {
        alertModal.style.display = 'block';
    }
};

window.fecharAlerta = () => {
    if (alertModal) {
        alertModal.style.display = 'none';
    }
};

// Funcionalidades de navegação do menu lateral
window.abrirResumoMensal = () => {
    switchPage('resumo-mensal-page');
    const menu = document.getElementById('menu-perfil');
    if (menu) menu.style.display = 'none';
};

window.abrirResumoAnual = () => {
    switchPage('resumo-anual-page');
    const menu = document.getElementById('menu-perfil');
    if (menu) menu.style.display = 'none';
};

window.abrirPagina = (pageId) => {
    switchPage(pageId);
    const menu = document.getElementById('menu-perfil');
    if (menu) menu.style.display = 'none';
};

window.exportarDados = () => {
    console.log("Exportando dados...");
    // Lógica para exportar dados para um arquivo JSON/CSV
    const menu = document.getElementById('menu-perfil');
    if (menu) menu.style.display = 'none';
};

window.abrirConfig = () => {
    switchPage('config-page');
    const menu = document.getElementById('menu-perfil');
    if (menu) menu.style.display = 'none';
};

window.trocarTema = () => {
    console.log("Trocando tema...");
    // Lógica para alternar entre temas claro/escuro
};

window.resetarApp = () => {
    // Nota: Evitar alert() e confirm() em produção. Usar um modal personalizado.
    if (confirm("Você tem certeza que deseja resetar o aplicativo? Todos os seus dados serão excluídos permanentemente.")) {
        console.log("Resetando aplicativo...");
        // Lógica para excluir todos os dados do usuário no Firestore
    }
};

window.connectBank = (bankName) => {
    console.log(`Conectando ao banco ${bankName}...`);
};

// Lógica de manipulação de formulários para metas e contas a pagar
const goalForm = document.getElementById('goal-form');
if (goalForm) {
    goalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goalData = {
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value),
            date: document.getElementById('goal-date').value
        };
        const goalId = document.getElementById('goal-id').value;
        await saveGoal(goalData, goalId);
    });
}

const payableForm = document.getElementById('payable-form');
if (payableForm) {
    payableForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payableData = {
            description: document.getElementById('payable-description').value,
            category: document.getElementById('payable-category').value,
            amount: parseFloat(document.getElementById('payable-amount').value),
            date: document.getElementById('payable-date').value
        };
        const payableId = document.getElementById('payable-id').value;
        await savePayable(payableData, payableId);
    });
}

// Configuração inicial da página e navegação
const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
let currentDate = new Date();

const updateMonthDisplay = () => {
    const monthYear = `${months[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    const currentMonthEl = document.getElementById('current-month-year');
    if (currentMonthEl) {
        currentMonthEl.textContent = monthYear;
    }
};

const prevMonthBtn = document.getElementById('prev-month');
if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateMonthDisplay();
    });
}

const nextMonthBtn = document.getElementById('next-month');
if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateMonthDisplay();
    });
}

updateMonthDisplay();
