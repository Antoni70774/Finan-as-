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
        incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
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
    // registerServiceWorker(); // Ativar somente se tiver um sw.js na raiz

    // DATE NAVIGATION
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

    function changeMonth(direction) {
        state.currentDate.setMonth(state.currentDate.getMonth() + direction);
        updateAll();
    }
    
    function setCurrentDate() {
        const today = new Date();
        const dateEl = document.getElementById('date');
        if (dateEl) dateEl.value = today.toISOString().split('T')[0];
    }

    // NAVIGATION
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            if (!pageId) return;
            
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            const targetPage = document.getElementById(pageId);
            if (targetPage) targetPage.classList.add('active');
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // MODAL HANDLING
    function openModal(modal) { if (modal) modal.classList.add('active'); }
    function closeModal(modal) { if (modal) modal.classList.remove('active'); }

    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', () => {
            if (transactionModal) transactionModal.classList.add('active');
            if (transactionForm) transactionForm.reset();
            setCurrentDate();
        });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(transactionModal));

    if (addGoalBtn) {
        addGoalBtn.addEventListener('click', () => {
            if (goalForm) goalForm.reset();
            openModal(goalModal);
        });
    }
    if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', () => closeModal(goalModal));

    // TRANSACTION FORM
    if (typeExpenseBtn) typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
    if (typeIncomeBtn) typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));
    
    function setTransactionType(type) {
        if (!transactionTypeInput) return;
        transactionTypeInput.value = type;
        if (typeExpenseBtn) typeExpenseBtn.classList.toggle('active', type === 'expense');
        if (typeIncomeBtn) typeIncomeBtn.classList.toggle('active', type === 'income');
        updateCategoryOptions(type);
    }

    // Popula categorias dinamicamente
    function updateCategoryOptions(type) {
        if (!categorySelect) return;
        categorySelect.innerHTML = '';
        const categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            categorySelect.appendChild(opt);
        });
    }

    if (transactionForm) {
        transactionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const transaction = {
                id: Date.now().toString(),
                type: transactionTypeInput.value,
                amount: parseFloat(document.getElementById('amount').value),
                description: document.getElementById('description').value,
                category: categorySelect.value,
                date: document.getElementById('date').value,
                user: state.currentUser
            };

            state.transactions.push(transaction);
            saveAndRerender();
            closeModal(transactionModal);
            this.reset();
        });
    }

    // GOAL FORM
    if (goalForm) {
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
                if (index !== -1) state.goals[index] = goal;
            } else {
                state.goals.push(goal);
            }

            saveAndRerender();
            closeGoalModal();
        });
    }

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
        openModal(goalModal);
    };

    // Fechar modal de meta
    function closeGoalModal() {
        closeModal(goalModal);
        if (goalForm) goalForm.reset();
        const goalIdEl = document.getElementById('goal-id');
        if (goalIdEl) goalIdEl.value = '';
        document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
        document.getElementById('delete-goal-btn').style.display = 'none';
    }

    // USER MANAGEMENT
    userButtons.forEach(button => {
        button.addEventListener('click', () => {
            state.currentUser = button.dataset.user;
            localStorage.setItem('currentUser', state.currentUser);
            updateAll();
        });
    });
    
    // DATA EXPORT
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
    
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
        const el = document.getElementById('current-month-year');
        if (el) el.textContent = state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function renderSummary(transactions) {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;

        const incomeEl = document.getElementById('month-income');
        const expenseEl = document.getElementById('month-expense');
        const balanceEl = document.getElementById('month-balance');

        if (incomeEl) incomeEl.textContent = formatCurrency(income);
        if (expenseEl) expenseEl.textContent = formatCurrency(expense);
        if (balanceEl) {
            balanceEl.textContent = formatCurrency(balance);
            balanceEl.style.color = balance >= 0 ? 'var(--text-light)' : '#ff8a80';
        }
    }

    function renderTransactionList(transactions) {
        const listEl = document.getElementById('transaction-list');
        if (!listEl) return;
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
            const date = new Date(t.date).toLocaleDateString('pt-BR');
            
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

    function renderGoals() {
        const list = document.getElementById('goal-list');
        if (!list) return;
        list.innerHTML = '';
        if (state.goals.length === 0) {
            list.innerHTML = '<li>Nenhuma meta definida.</li>';
            return;
        }
        state.goals.forEach(goal => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${goal.name}</strong> - ${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}
                <button onclick="editGoal('${goal.id}')">Editar</button>
            `;
            list.appendChild(li);
        });
    }

    function updateUserUI() {
        if (currentUserNameEl) currentUserNameEl.textContent = state.currentUser;
        userButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.user === state.currentUser);
        });
    }

    // Integração bancária placeholder
    window.connectBank = async function(bankName) {
        try {
            alert(`Integração com ${bankName} em desenvolvimento. Em breve estará disponível.`);
        } catch (error) {
            console.error('Erro na conexão:', error);
            alert(`Não foi possível conectar ao ${bankName}. Tente novamente mais tarde.`);
        }
    };
});
