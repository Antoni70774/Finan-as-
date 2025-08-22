import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
    // STATE MANAGEMENT
    const state = {
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        goals: JSON.parse(localStorage.getItem('goals')) || [],
        currentUser: localStorage.getItem('currentUser') || 'Esposo',
        users: ['Esposo', 'Esposa'],
        currentDate: new Date(),
        expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros'],
        incomeCategories: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
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
            const pageId = item.dataset.page;
            
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelector('.app-header h1').textContent = {
                'dashboard-page': 'Visão Geral',
                'goals-page': 'Metas Pessoais',
                'profile-page': 'Perfil'
            }[pageId];
        });
    });

    // MODAL HANDLING
    function openModal(modal) { modal.classList.add('active'); }
    function closeModal(modal) { modal.classList.remove('active'); }

    addTransactionBtn.addEventListener('click', () => {
        transactionForm.reset();
        setCurrentDate();
        updateCategoryOptions('expense');
        openModal(transactionModal);
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
    
    function updateCategoryOptions(type) {
        const categories = type === 'expense' ? state.expenseCategories : state.incomeCategories;
        categorySelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTransaction = {
            id: Date.now(),
            user: state.currentUser,
            type: transactionTypeInput.value,
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
        };
        state.transactions.push(newTransaction);
        saveAndRerender();
        closeModal(transactionModal);
    });
    
    // GOAL FORM
    goalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newGoal = {
            id: Date.now(),
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value),
        };
        state.goals.push(newGoal);
        saveAndRerender();
        closeModal(goalModal);
    });

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

    function renderTransactionList(transactions) {
        const listEl = document.getElementById('transaction-list');
        listEl.innerHTML = '';
        if (transactions.length === 0) {
            listEl.innerHTML = '<li>Nenhuma transação este mês.</li>';
            return;
        }
        
        const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

        sorted.slice(0, 10).forEach(t => { // Show max 10 recent
            const item = document.createElement('li');
            item.className = 'transaction-item';
            const isIncome = t.type === 'income';
            
            item.innerHTML = `
                <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                    <span class="material-icons-sharp">${isIncome ? 'arrow_upward' : 'arrow_downward'}</span>
                </div>
                <div class="transaction-details">
                    <p>${t.description}</p>
                    <span>${t.category} &bull; ${t.user}</span>
                </div>
                <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
                </div>
            `;
            listEl.appendChild(item);
        });
    }
    
    function editGoal(goalId) {
        const goal = state.goals.find(g => g.id === goalId);
        if (!goal) return;

        // Preenche o modal com os dados da meta
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        
        // Atualiza título e mostra botão de deletar
        document.getElementById('goal-modal-title').textContent = 'Editar Meta';
        document.getElementById('delete-goal-btn').style.display = 'block';
        
        // Abre o modal
        document.getElementById('goal-modal').classList.add('active');
    }

    // Função para renderizar metas com botão de edição
    function renderGoals() {
        const goalsList = document.getElementById('goals-list');
        goalsList.innerHTML = '';
        
        state.goals.forEach(goal => {
            const progress = (goal.current / goal.target) * 100;
            const goalEl = document.createElement('div');
            goalEl.className = 'goal-card';
            goalEl.innerHTML = `
                <div class="goal-info">
                    <h4>${goal.name}</h4>
                    <p>Meta: R$ ${goal.target.toFixed(2)}</p>
                    <p>Atual: R$ ${goal.current.toFixed(2)}</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progress}%"></div>
                    </div>
                </div>
                <button class="edit-goal-btn" onclick="editGoal('${goal.id}')">
                    <span class="material-icons-sharp">edit</span>
                </button>
            `;
            goalsList.appendChild(goalEl);
        });
    }

    // Atualizar o event listener do formulário de metas
    document.getElementById('goal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const goalId = document.getElementById('goal-id').value;
        const goalData = {
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value)
        };

        if (goalId) {
            // Atualizar meta existente
            const index = state.goals.findIndex(g => g.id === goalId);
            if (index !== -1) {
                state.goals[index] = { ...state.goals[index], ...goalData };
            }
        } else {
            // Criar nova meta
            state.goals.push({
                id: Date.now().toString(),
                ...goalData
            });
        }

        // Salvar, atualizar interface e fechar modal
        saveAndRerender();
        closeModal(goalModal);
    });

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
});
