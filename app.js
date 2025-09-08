import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// VARIÁVEIS GLOBAIS FORNECIDAS PELO AMBIENTE
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const authToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let userId;

// Referências aos elementos do DOM
const body = document.body;
const themeToggleBtn = document.getElementById('theme-toggle');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const transactionModalOverlay = document.getElementById('transaction-modal-overlay');
const transactionForm = document.getElementById('transaction-form');
const closeTransactionModalBtn = document.getElementById('close-modal-btn');
const transactionList = document.getElementById('transaction-list');
const modalTitle = document.getElementById('modal-title');
const transactionIdInput = document.getElementById('transaction-id');
const userIdDisplay = document.getElementById('user-id-display');
const totalReceitaEl = document.getElementById('total-receita');
const totalDespesaEl = document.getElementById('total-despesa');
const totalSaldoEl = document.getElementById('total-saldo');
const messageModalOverlay = document.getElementById('message-modal-overlay');
const messageModalTitle = document.getElementById('message-title');
const messageModalText = document.getElementById('message-text');
const messageModalCloseBtn = document.getElementById('message-modal-close');
const addGoalBtn = document.getElementById('add-goal-btn');
const goalsModalOverlay = document.getElementById('goals-modal-overlay');
const goalsForm = document.getElementById('goals-form');
const closeGoalsModalBtn = document.getElementById('close-goals-modal-btn');
const goalList = document.getElementById('goal-list');

// Elementos adicionais do seu arquivo original
const menuFlutuante = document.getElementById('menu-flutuante');
const menuBotao = document.getElementById('menu-flutuante-btn');
const closeMenuBotao = document.getElementById('close-menu-btn');
const mainContent = document.getElementById('main-content');
const abas = document.querySelectorAll('.tab-btn');
const paineis = document.querySelectorAll('.painel');
const tabBotoes = document.querySelectorAll('.tab-btn');

let financialChart;

// --- Funções Auxiliares Comuns ---

/**
 * @description Exibe um modal de mensagem personalizado.
 * @param {string} title O título do modal.
 * @param {string} text O texto da mensagem.
 */
const showMessage = (title, text) => {
    messageModalTitle.textContent = title;
    messageModalText.textContent = text;
    messageModalOverlay.classList.add('show');
};

/**
 * @description Oculta o modal de mensagem.
 */
const hideMessage = () => {
    messageModalOverlay.classList.remove('show');
};

/**
 * @description Abre o modal de metas.
 * @param {object} goal Dados da meta para edição (opcional).
 */
const openGoalsModal = (goal = null) => {
    const goalsModalTitle = document.getElementById('goals-modal-title');
    const goalIdInput = document.getElementById('goal-id');

    if (goal) {
        goalsModalTitle.textContent = 'Editar Meta';
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current || 0;
        goalIdInput.value = goal.id;
    } else {
        goalsModalTitle.textContent = 'Adicionar Meta';
        goalsForm.reset();
        goalIdInput.value = '';
    }
    goalsModalOverlay.classList.add('show');
};

/**
 * @description Fecha o modal de metas.
 */
const closeGoalsModal = () => {
    goalsModalOverlay.classList.remove('show');
};

/**
 * @description Formata um número para moeda BRL.
 * @param {number} value O valor a ser formatado.
 * @returns {string} O valor formatado como moeda.
 */
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// --- Funções Específicas para Metas ---

/**
 * @description Salva ou edita uma meta no Firestore.
 * @param {Event} e O evento de submit do formulário.
 */
const handleGoalsFormSubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById('goal-name').value;
    const target = parseFloat(document.getElementById('goal-target').value);
    const current = parseFloat(document.getElementById('goal-current').value);
    const id = document.getElementById('goal-id').value;

    const goalData = {
        name,
        target,
        current: current || 0,
        createdAt: new Date().toISOString()
    };

    try {
        if (id) {
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/metas`, id), goalData);
            showMessage('Sucesso', 'Meta atualizada com sucesso!');
        } else {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/metas`), goalData);
            showMessage('Sucesso', 'Meta adicionada com sucesso!');
        }
        closeGoalsModal();
    } catch (error) {
        console.error("Erro ao salvar a meta: ", error);
        showMessage('Erro', 'Não foi possível salvar a meta. Tente novamente.');
    }
};

/**
 * @description Renderiza a lista de metas.
 * @param {Array<object>} goals A lista de metas a ser exibida.
 */
const renderGoals = (goals) => {
    goalList.innerHTML = '';
    if (goals.length === 0) {
        goalList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Nenhuma meta encontrada.</p>';
        return;
    }

    goals.forEach(goal => {
        const itemEl = document.createElement('div');
        itemEl.className = 'goal-card p-4 bg-white rounded-lg shadow-sm mb-4';
        
        const progress = (goal.current / goal.target) * 100;
        const progressCls = progress >= 100 ? 'bg-green-500' : 'bg-blue-500';

        itemEl.innerHTML = `
            <h4 class="font-bold text-lg mb-2">${goal.name}</h4>
            <p class="text-gray-600">Meta: ${formatCurrency(goal.target)} | Atual: ${formatCurrency(goal.current)}</p>
            <div class="w-full bg-gray-200 rounded-full h-2.5 my-2">
                <div class="h-2.5 rounded-full ${progressCls}" style="width: ${Math.min(100, progress)}%;"></div>
            </div>
            <p class="text-sm text-gray-500">${progress.toFixed(0)}% Concluído</p>
            <div class="flex justify-end gap-2 mt-2">
                <button class="edit-btn p-1 rounded-full text-gray-600 hover:bg-gray-200" data-id="${goal.id}">
                    <span class="material-icons text-base">edit</span>
                </button>
                <button class="delete-btn p-1 rounded-full text-gray-600 hover:bg-gray-200" data-id="${goal.id}">
                    <span class="material-icons text-base">delete</span>
                </button>
            </div>
        `;
        
        itemEl.querySelector('.edit-btn').addEventListener('click', () => {
            openGoalsModal(goal);
        });
        
        itemEl.querySelector('.delete-btn').addEventListener('click', () => {
            showMessage(
                'Confirmação',
                'Tem certeza que deseja deletar esta meta?',
            );
            document.getElementById('message-modal-close').onclick = () => {
                deleteGoal(goal.id);
                hideMessage();
            };
        });
        
        goalList.appendChild(itemEl);
    });
};

/**
 * @description Deleta uma meta do Firestore.
 * @param {string} id O ID do documento da meta.
 */
const deleteGoal = async (id) => {
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/metas`, id));
        showMessage('Sucesso', 'Meta deletada com sucesso!');
    } catch (error) {
        console.error("Erro ao deletar a meta: ", error);
        showMessage('Erro', 'Não foi possível deletar a meta. Tente novamente.');
    }
};

// --- Funções do Gráfico e Transações ---

/**
 * @description Inicializa o gráfico de barras.
 */
const initChart = () => {
    const ctx = document.getElementById('financialChart').getContext('2d');
    if (financialChart) {
        financialChart.destroy();
    }
    financialChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                label: 'Valores',
                data: [0, 0],
                backgroundColor: ['rgba(76, 209, 55, 0.8)', 'rgba(235, 77, 75, 0.8)'],
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
};

/**
 * @description Atualiza os dados do gráfico.
 * @param {number} receita O valor total das receitas.
 * @param {number} despesa O valor total das despesas.
 */
const updateChart = (receita, despesa) => {
    if (financialChart) {
        financialChart.data.datasets[0].data = [receita, despesa];
        financialChart.update();
    }
};

/**
 * @description Abre o modal de transação, preenchendo os dados se for uma edição.
 * @param {object} transaction Os dados da transação para edição (opcional).
 */
const openTransactionModal = (transaction = null) => {
    if (transaction) {
        modalTitle.textContent = 'Editar Transação';
        document.getElementById('tipo').value = transaction.tipo;
        document.getElementById('descricao').value = transaction.descricao;
        document.getElementById('valor').value = transaction.valor;
        transactionIdInput.value = transaction.id;
    } else {
        modalTitle.textContent = 'Adicionar Transação';
        transactionForm.reset();
        transactionIdInput.value = '';
    }
    transactionModalOverlay.classList.add('show');
};

/**
 * @description Fecha o modal de transação.
 */
const closeTransactionModal = () => {
    transactionModalOverlay.classList.remove('show');
};

/**
 * @description Salva ou edita a transação no Firestore.
 * @param {Event} e O evento de submit do formulário.
 */
const handleFormSubmit = async (e) => {
    e.preventDefault();

    const tipo = document.getElementById('tipo').value;
    const descricao = document.getElementById('descricao').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const id = transactionIdInput.value;
    const data = new Date().toISOString();

    const transactionData = {
        tipo,
        descricao,
        valor,
        data,
    };

    try {
        if (id) {
            // Edição de transação
            const transactionDocRef = doc(db, `artifacts/${appId}/users/${userId}/transacoes`, id);
            await updateDoc(transactionDocRef, transactionData);
            showMessage('Sucesso', 'Transação atualizada com sucesso!');
        } else {
            // Adicionar nova transação
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/transacoes`), transactionData);
            showMessage('Sucesso', 'Transação adicionada com sucesso!');
        }
        closeTransactionModal();
    } catch (error) {
        console.error("Erro ao salvar a transação: ", error);
        showMessage('Erro', 'Não foi possível salvar a transação. Tente novamente.');
    }
};

/**
 * @description Deleta a transação do Firestore.
 * @param {string} id O ID do documento da transação.
 */
const deleteTransaction = async (id) => {
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/transacoes`, id));
        showMessage('Sucesso', 'Transação deletada com sucesso!');
    } catch (error) {
        console.error("Erro ao deletar a transação: ", error);
        showMessage('Erro', 'Não foi possível deletar a transação. Tente novamente.');
    }
};

/**
 * @description Renderiza a lista de transações e atualiza o resumo financeiro.
 * @param {Array<object>} transactions A lista de transações a ser exibida.
 */
const renderTransactionsAndSummary = (transactions) => {
    transactionList.innerHTML = '';
    if (transactions.length === 0) {
        transactionList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Nenhuma transação encontrada.</p>';
        totalReceitaEl.textContent = 'R$ 0,00';
        totalDespesaEl.textContent = 'R$ 0,00';
        totalSaldoEl.textContent = 'R$ 0,00';
        updateChart(0, 0);
        return;
    }

    let totalReceita = 0;
    let totalDespesa = 0;

    transactions.forEach(transaction => {
        const itemEl = document.createElement('div');
        itemEl.className = `transaction-list-item card flex items-center mb-2 p-3 rounded-lg`;

        const valorFormatado = transaction.valor.toFixed(2).replace('.', ',');
        const tipoIcon = transaction.tipo === 'receita' ? 'arrow_upward' : 'arrow_downward';
        const tipoColor = transaction.tipo === 'receita' ? 'text-green-500' : 'text-red-500';

        if (transaction.tipo === 'receita') {
            totalReceita += transaction.valor;
        } else {
            totalDespesa += transaction.valor;
        }

        itemEl.innerHTML = `
            <div class="flex-grow flex items-center">
                <span class="material-icons text-xl ${tipoColor} mr-2">${tipoIcon}</span>
                <div>
                    <p class="font-medium text-lg">${transaction.descricao}</p>
                    <p class="text-sm text-gray-500">${new Date(transaction.data).toLocaleDateString()}</p>
                </div>
            </div>
            <p class="font-bold text-lg mr-4 ${tipoColor}">R$ ${valorFormatado}</p>
            <div class="flex items-center gap-2">
                <button class="edit-btn p-1 rounded-full text-gray-600 hover:bg-gray-200" data-id="${transaction.id}">
                    <span class="material-icons text-base">edit</span>
                </button>
                <button class="delete-btn p-1 rounded-full text-gray-600 hover:bg-gray-200" data-id="${transaction.id}">
                    <span class="material-icons text-base">delete</span>
                </button>
            </div>
        `;

        itemEl.querySelector('.edit-btn').addEventListener('click', () => {
            openTransactionModal(transaction);
        });

        itemEl.querySelector('.delete-btn').addEventListener('click', () => {
            showMessage(
                'Confirmação',
                'Tem certeza que deseja deletar esta transação?',
            );
            document.getElementById('message-modal-close').onclick = () => {
                deleteTransaction(transaction.id);
                hideMessage();
            };
        });

        transactionList.appendChild(itemEl);
    });

    const totalSaldo = totalReceita - totalDespesa;
    totalReceitaEl.textContent = `R$ ${totalReceita.toFixed(2).replace('.', ',')}`;
    totalDespesaEl.textContent = `R$ ${totalDespesa.toFixed(2).replace('.', ',')}`;
    totalSaldoEl.textContent = `R$ ${totalSaldo.toFixed(2).replace('.', ',')}`;

    updateChart(totalReceita, totalDespesa);
};

// --- Lógica de navegação e Event Listeners ---

/**
 * @description Alterna entre as abas do menu principal.
 * @param {string} painelId O ID do painel a ser exibido.
 */
const ativarPainel = (painelId) => {
    paineis.forEach(painel => {
        if (painel.id === painelId) {
            painel.classList.add('active-painel');
        } else {
            painel.classList.remove('active-painel');
        }
    });

    tabBotoes.forEach(aba => {
        aba.classList.remove('active');
        if (aba.dataset.target === painelId) {
            aba.classList.add('active');
        }
    });
};

// Eventos do menu flutuante
menuBotao.addEventListener('click', () => {
    menuFlutuante.classList.toggle('active');
});

closeMenuBotao.addEventListener('click', () => {
    menuFlutuante.classList.remove('active');
});

// Eventos de clique nas abas
tabBotoes.forEach(aba => {
    aba.addEventListener('click', () => {
        ativarPainel(aba.dataset.target);
    });
});

// Eventos para Transações
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});
addTransactionBtn.addEventListener('click', () => openTransactionModal());
closeTransactionModalBtn.addEventListener('click', closeTransactionModal);
transactionForm.addEventListener('submit', handleFormSubmit);

// Eventos para Metas
addGoalBtn.addEventListener('click', () => openGoalsModal());
closeGoalsModalBtn.addEventListener('click', closeGoalsModal);
goalsForm.addEventListener('submit', handleGoalsFormSubmit);

// Evento para o modal de mensagem
messageModalCloseBtn.addEventListener('click', hideMessage);

// Autenticação com Firebase e inicialização do app
const initializeAppAndAuth = async () => {
    try {
        if (authToken) {
            await signInWithCustomToken(auth, authToken);
        } else {
            await signInAnonymously(auth);
        }
        userId = auth.currentUser.uid;
        userIdDisplay.textContent = `ID do usuário: ${userId}`;
        
        // Inicia o listener de transações em tempo real
        onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/transacoes`), (snapshot) => {
            const transactions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderTransactionsAndSummary(transactions);
        });

        // Inicia o listener de metas em tempo real
        onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/metas`), (snapshot) => {
            const goals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderGoals(goals);
        });

    } catch (error) {
        console.error("Erro durante a autenticação: ", error);
        userIdDisplay.textContent = 'Erro de autenticação';
    }
};

window.onload = () => {
    initChart();
    initializeAppAndAuth();
    ativarPainel('dashboard-page');
};
