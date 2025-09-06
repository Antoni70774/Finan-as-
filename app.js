// Importações de bibliotecas do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    document.querySelector('#menu-perfil ul').appendChild(logoutBtn);
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
    const currentMonth = document.getElementById('current-month-year').textContent;
    const [month, year] = currentMonth.split(' de ');
    const currentMonthIndex = new Date(`${month} 1, ${year}`).getMonth();

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
    const ctx = document.getElementById('main-chart').getContext('2d');
    if (window.myChart) {
        window.myChart.destroy();
    }
    const categories = [...new Set(transactions.map(t => t.category))];
    const data = categories.map(cat => transactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0));
    window.myChart = new Chart(ctx, {
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
    list.innerHTML = '';
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).forEach(t => {
        const item = document.createElement('li');
        item.className = `transaction-item ${t.type}`;
        item.innerHTML = `
            <span>${t.description}</span>
            <span class="amount">R$ ${t.amount.toFixed(2).replace('.', ',')}</span>
        `;
        list.appendChild(item);
    });
};

// Manipulação do modal de transações
const transactionModal = document.getElementById('transaction-modal');
const transactionForm = document.getElementById('transaction-form');
const transactionTypeExpenseBtn = document.getElementById('type-expense-btn');
const transactionTypeIncomeBtn = document.getElementById('type-income-btn');
const transactionTypeInput = document.getElementById('transaction-type');

transactionTypeExpenseBtn.addEventListener('click', () => {
    transactionTypeExpenseBtn.classList.add('active');
    transactionTypeIncomeBtn.classList.remove('active');
    transactionTypeInput.value = 'expense';
});

transactionTypeIncomeBtn.addEventListener('click', () => {
    transactionTypeIncomeBtn.classList.add('active');
    transactionTypeExpenseBtn.classList.remove('active');
    transactionTypeInput.value = 'income';
});

const showTransactionModal = () => {
    transactionForm.reset();
    document.getElementById('transaction-modal-title').textContent = 'Nova Transação';
    document.getElementById('transaction-id').value = '';
    document.getElementById('delete-transaction-btn').style.display = 'none';
    transactionModal.style.display = 'flex';
};

document.getElementById('add-transaction-btn').addEventListener('click', showTransactionModal);

document.getElementById('cancel-btn').addEventListener('click', () => {
    transactionModal.style.display = 'none';
});

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
        transactionModal.style.display = 'none';
        transactionForm.reset();
    } catch (e) {
        console.error("Erro ao adicionar/atualizar transação: ", e);
    }
});

// Outras funções de controle da interface e funcionalidades
const switchPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
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
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
};

// Funções para exibir modais (metas e contas a pagar)
const goalModal = document.getElementById('goal-modal');
const payableModal = document.getElementById('payable-modal');

document.getElementById('add-goal-btn').addEventListener('click', () => {
    goalModal.style.display = 'flex';
});
document.getElementById('cancel-goal-btn').addEventListener('click', () => {
    goalModal.style.display = 'none';
});

document.getElementById('add-payable-btn').addEventListener('click', () => {
    payableModal.style.display = 'flex';
});
document.getElementById('cancel-payable-btn').addEventListener('click', () => {
    payableModal.style.display = 'none';
});

// Funções para salvar dados no Firestore
const saveGoal = async (goalData) => {
    try {
        await addDoc(collection(db, `users/${userId}/goals`), goalData);
        goalModal.style.display = 'none';
    } catch (e) {
        console.error("Erro ao adicionar meta: ", e);
    }
};

const savePayable = async (payableData) => {
    try {
        await addDoc(collection(db, `users/${userId}/payables`), payableData);
        payableModal.style.display = 'none';
    } catch (e) {
        console.error("Erro ao adicionar conta a pagar: ", e);
    }
};

// Funções para renderizar listas
const renderGoals = (goals) => {
    const list = document.getElementById('goal-list');
    list.innerHTML = '';
    goals.forEach(goal => {
        const item = document.createElement('div');
        item.innerHTML = `
            <h3>${goal.name}</h3>
            <p>Alvo: R$ ${goal.target.toFixed(2).replace('.', ',')}</p>
            <p>Atual: R$ ${goal.current.toFixed(2).replace('.', ',')}</p>
        `;
        list.appendChild(item);
    });
};

const updatePayablesUI = (payables) => {
    const list = document.getElementById('payable-list');
    list.innerHTML = '';
    payables.forEach(p => {
        const item = document.createElement('div');
        item.innerHTML = `
            <h3>${p.description}</h3>
            <p>Valor: R$ ${p.amount.toFixed(2).replace('.', ',')}</p>
            <p>Vencimento: ${p.date}</p>
        `;
        list.appendChild(item);
    });
};

// Função para verificar contas a pagar e gerar alertas
const checkDueDates = (payables) => {
    const today = new Date().toISOString().split('T')[0];
    const alerts = payables.filter(p => p.date === today);
    const alertCount = document.getElementById('alert-count');
    const alertList = document.getElementById('alert-list');

    alertCount.textContent = alerts.length;
    alertList.innerHTML = '';

    if (alerts.length > 0) {
        alerts.forEach(alert => {
            const li = document.createElement('li');
            li.textContent = `${alert.description} - R$ ${alert.amount.toFixed(2).replace('.', ',')}`;
            alertList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = "Nenhuma conta a vencer hoje.";
        alertList.appendChild(li);
    }
};

// Funções para manipulação de alerta
const alertModal = document.getElementById('alert-modal');
window.abrirAlerta = () => {
    alertModal.style.display = 'block';
};

window.fecharAlerta = () => {
    alertModal.style.display = 'none';
};

// Funcionalidades de navegação do menu lateral
window.abrirResumoMensal = () => {
    switchPage('resumo-mensal-page');
    document.getElementById('menu-perfil').style.display = 'none';
};

window.abrirResumoAnual = () => {
    switchPage('resumo-anual-page');
    document.getElementById('menu-perfil').style.display = 'none';
};

window.abrirPagina = (pageId) => {
    switchPage(pageId);
    document.getElementById('menu-perfil').style.display = 'none';
};

window.exportarDados = () => {
    console.log("Exportando dados...");
    // Lógica para exportar dados para um arquivo JSON/CSV
    document.getElementById('menu-perfil').style.display = 'none';
};

window.abrirConfig = () => {
    switchPage('config-page');
    document.getElementById('menu-perfil').style.display = 'none';
};

window.trocarTema = () => {
    console.log("Trocando tema...");
    // Lógica para alternar entre temas claro/escuro
};

window.resetarApp = () => {
    if (confirm("Você tem certeza que deseja resetar o aplicativo? Todos os seus dados serão excluídos permanentemente.")) {
        console.log("Resetando aplicativo...");
        // Lógica para excluir todos os dados do usuário no Firestore
    }
};

window.connectBank = (bankName) => {
    console.log(`Conectando ao banco ${bankName}...`);
};

// Lógica de manipulação de formulários para metas e contas a pagar
document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const goalData = {
        name: document.getElementById('goal-name').value,
        target: parseFloat(document.getElementById('goal-target').value),
        current: parseFloat(document.getElementById('goal-current').value),
        date: document.getElementById('goal-date').value
    };
    await saveGoal(goalData);
});

document.getElementById('payable-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payableData = {
        description: document.getElementById('payable-description').value,
        category: document.getElementById('payable-category').value,
        amount: parseFloat(document.getElementById('payable-amount').value),
        date: document.getElementById('payable-date').value
    };
    await savePayable(payableData);
});

// Configuração inicial da página e navegação
const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
let currentDate = new Date();

const updateMonthDisplay = () => {
    const monthYear = `${months[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    document.getElementById('current-month-year').textContent = monthYear;
};

document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateMonthDisplay();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateMonthDisplay();
});

updateMonthDisplay();
