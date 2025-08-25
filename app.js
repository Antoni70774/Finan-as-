import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
    // STATE MANAGEMENT
    const state = {
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        goals: JSON.parse(localStorage.getItem('goals')) || [],
        currentUser: localStorage.getItem('currentUser') || 'Esposo',
        users: ['Esposo', 'Esposa'],
        currentDate: new Date(),
        expenseCategories: ['Supermercado', 'Transporte', 'Investimento', 'Moradia', 'Saúde', 'Cartão de Credito 1', 'Cartão de Credito 2', 'Agua', 'Internet Residencia', 'Plano Celular', ' Gás', 'Energia Eletrica', 'Emprestimos', 'Vestuario', 'Lazer', 'Saúde', 'Outros'],
        incomeCategories: ['Salário', 'Combustível', 'Aluguel', ' Bolsa Familia', 'Outros'],
    };
	
    // UI ELEMENTS
    const pages = document.querySelectorAll('.page');
    const navItems = document.querySelectorAll('.nav-item');
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const transactionModal = document.getElementById('transaction-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const transactionForm = document.getElementById('transaction-form');
    const typeExpenseBtn = document.getElementById('type-expense-btn');
    const typeIncomeBtn = document.getElementById('type-income-btn');
    const transactionTypeInput = document.getElementById('transaction-type');
    const categorySelect = document.getElementById('category');
    
    const addGoalBtn = document.getElementById('add-goal-btn');
    const goalModal = document.getElementById('goal-modal');
    const cancelGoalBtn = document.getElementById('cancel-goal-btn');
    const goalForm = document.getElementById('goal-form');
    const userButtons = document.querySelectorAll('.user-buttons button');
    const currentUserNameEl = document.getElementById('current-user-name');
    const exportDataBtn = document.getElementById('export-data-btn');

    // INITIAL SETUP
    createExpenseChart();
    setCurrentDate();
    updateAll();
    registerServiceWorker();

    // DATE NAVIGATION
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

    function changeMonth(direction) {
        state.currentDate.setMonth(state.currentDate.getMonth() + direction);
        updateAll();
    }
    
    function setCurrentDate() {
        const today = new Date();
        document.getElementById('date').value = today.toISOString().split('T')[0];
    }

    // NAVIGATION
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            
            // Remove classe active de todas as páginas
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Ativa a página selecionada
            document.getElementById(pageId).classList.add('active');
            
            // Atualiza navegação
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            item.classList.add('active');
        });
    });

    // MODAL HANDLING
    function openModal(modal) { modal.classList.add('active'); }
    function closeModal(modal) { modal.classList.remove('active'); }

    addTransactionBtn.addEventListener('click', () => {
        const modal = document.getElementById('transaction-modal');
        modal.classList.add('active');
        document.getElementById('transaction-form').reset();
        setCurrentDate();
    });
    cancelBtn.addEventListener('click', () => closeModal(transactionModal));

    addGoalBtn.addEventListener('click', () => {
        goalForm.reset();
        openModal(goalModal);
    });
    cancelGoalBtn.addEventListener('click', () => closeModal(goalModal));

    // TRANSACTION FORM
    typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
    typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));
    
    function setTransactionType(type) {
        transactionTypeInput.value = type;
        typeExpenseBtn.classList.toggle('active', type === 'expense');
        typeIncomeBtn.classList.toggle('active', type === 'income');
        updateCategoryOptions(type);
    }

    // Correção do formulário de transação
    transactionForm.addEventListener('submit', function(e) {
		e.preventDefault();

		const dateInput = document.getElementById('date').value;
		const [year, month, day] = dateInput.split('-');
		const localDate = new Date(year, month - 1, day); // mês começa do zero

		const transaction = {
			id: Date.now().toString(),
			type: document.getElementById('transaction-type').value,
			amount: parseFloat(document.getElementById('amount').value),
			description: document.getElementById('description').value,
			category: document.getElementById('category').value,
			date: localDate.toISOString().split('T')[0], // salva como YYYY-MM-DD
			user: state.currentUser
		};

		state.transactions.push(transaction);	
		saveAndRerender();
		document.getElementById('transaction-modal').classList.remove('active');
		this.reset();
	});



    // GOAL FORM
    goalForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const goal = {
            id: document.getElementById('goal-id').value || Date.now().toString(),
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value)
        };

        if (document.getElementById('goal-id').value) {
            const index = state.goals.findIndex(g => g.id === goal.id);
            if (index !== -1) {
                state.goals[index] = goal;
            }
        } else {
            state.goals.push(goal);
        }

        saveAndRerender();
        closeGoalModal();
    });

    // Função global para editar meta
    window.editGoal = function(goalId) {
        const goal = state.goals.find(g => g.id === goalId);
        if (!goal) return;

        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        
        document.getElementById('goal-modal-title').textContent = 'Editar Meta';
        document.getElementById('delete-goal-btn').style.display = 'block';
        document.getElementById('goal-modal').classList.add('active');
    };

    // Função global para fechar modal de meta
    window.closeGoalModal = function() {
        document.getElementById('goal-modal').classList.remove('active');
        document.getElementById('goal-form').reset();
        document.getElementById('goal-id').value = '';
        document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
        document.getElementById('delete-goal-btn').style.display = 'none';
    };

    // USER MANAGEMENT
    userButtons.forEach(button => {
        button.addEventListener('click', () => {
            state.currentUser = button.dataset.user;
            localStorage.setItem('currentUser', state.currentUser);
            updateAll();
        });
    });
    
    // DATA EXPORT
    exportDataBtn.addEventListener('click', exportData);
    
    function exportData() {
        const data = {
            transactions: state.transactions,
            goals: state.goals,
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "dados_financeiros.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // DATA & RENDERING
    function saveAndRerender() {
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('goals', JSON.stringify(state.goals));
        updateAll();
    }

    function updateAll() {
        const filtered = filterTransactionsByMonth(state.transactions, state.currentDate);
        renderSummary(filtered);
        renderTransactionList(filtered);
        updateExpenseChart(filtered, state.expenseCategories);
        renderGoals();
        updateMonthDisplay();
        updateUserUI();
    }

    function filterTransactionsByMonth(transactions, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });
    }

    function updateMonthDisplay() {
        document.getElementById('current-month-year').textContent = state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function renderSummary(transactions) {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;

        document.getElementById('month-income').textContent = formatCurrency(income);
        document.getElementById('month-expense').textContent = formatCurrency(expense);
        document.getElementById('month-balance').textContent = formatCurrency(balance);
        document.getElementById('month-balance').style.color = balance >= 0 ? 'var(--text-light)' : '#ff8a80';
    }

    // Corrigido renderização de transações com data
    function renderTransactionList(transactions) {
        const listEl = document.getElementById('transaction-list');
        listEl.innerHTML = '';
        if (transactions.length === 0) {
            listEl.innerHTML = '<li>Nenhuma transação este mês.</li>';
            return;
        }
        
        const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

        sorted.slice(0, 10).forEach(t => {
            const item = document.createElement('li');
            item.className = 'transaction-item';
            const isIncome = t.type === 'income';
            const date = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR');
            
            item.innerHTML = `
                <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                    <span class="material-icons-sharp">${isIncome ? 'arrow_upward' : 'arrow_downward'}</span>
                </div>
                <div class="transaction-details">
                    <p>${t.description}</p>
                    <span>${t.category} • ${t.user} • ${date}</span>
                </div>
                <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
                </div>
            `;
            listEl.appendChild(item);
        });
    }

    // Correção do sistema de metas
    function handleGoalSubmit(e) {
        e.preventDefault();
        const goalId = document.getElementById('goal-id').value;
        const goalData = {
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value),
            date: document.getElementById('goal-date').value
        };

        if (!goalData.name || !goalData.target || isNaN(goalData.current)) {
            alert('Por favor, preencha todos os campos corretamente');
            return;
        }

        if (goalId) {
            const index = state.goals.findIndex(g => g.id === goalId);
            if (index !== -1) {
                state.goals[index] = { ...state.goals[index], ...goalData };
            }
        } else {
            state.goals.push({
                id: Date.now().toString(),
                ...goalData
            });
        }

        saveAndRerender();
        closeGoalModal();
    }

    // Adicionar listener para deletar meta
    document.getElementById('delete-goal-btn').addEventListener('click', function() {
        const goalId = document.getElementById('goal-id').value;
        if (confirm('Tem certeza que deseja excluir esta meta?')) {
            state.goals = state.goals.filter(g => g.id !== goalId);
            saveAndRerender();
            closeModal(goalModal);
        }
    });

    function closeGoalModal() {
        document.getElementById('goal-modal').classList.remove('active');
        document.getElementById('goal-form').reset();
        document.getElementById('goal-id').value = '';
        document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
        document.getElementById('delete-goal-btn').style.display = 'none';
    }

    function updateUserUI() {
        currentUserNameEl.textContent = state.currentUser;
        userButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.user === state.currentUser);
        });
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    }

    // Correção da integração bancária
    window.connectBank = async function(bankName) {
        try {
            alert(`Integração com ${bankName} em desenvolvimento. Em breve estará disponível.`);
            // Aqui você implementará a integração real quando tiver as credenciais
        } catch (error) {
            console.error('Erro na conexão:', error);
            alert(`Não foi possível conectar ao ${bankName}. Tente novamente mais tarde.`);
        }
    }
});
