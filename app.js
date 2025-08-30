// --- app.js ---
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
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

    const addGoalBtn = document.getElementById('add-goal-btn');
    const goalModal = document.getElementById('goal-modal');
    const cancelGoalBtn = document.getElementById('cancel-goal-btn');
    const goalForm = document.getElementById('goal-form');
    const goalList = document.getElementById('goal-list');
    const userButtons = document.querySelectorAll('.user-buttons button');
    const currentUserNameEl = document.getElementById('current-user-name');
    const exportDataBtn = document.getElementById('export-data-btn');
    const chartBtns = document.querySelectorAll('.chart-btn');
    const chartTitle = document.getElementById('chart-title');

    // Payables
    const addPayableBtn = document.getElementById('add-payable-btn');
    const payableModal = document.getElementById('payable-modal');
    const cancelPayableBtn = document.getElementById('cancel-payable-btn');
    const payableForm = document.getElementById('payable-form');
    const payableList = document.getElementById('payable-list');

    // STATE MANAGEMENT
    const state = {
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        goals: JSON.parse(localStorage.getItem('goals')) || [],
        payables: JSON.parse(localStorage.getItem('payables')) || [],
        currentUser: localStorage.getItem('currentUser') || 'Esposo',
        users: ['Esposo', 'Esposa'],
        currentDate: new Date(),
        expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
        incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
        chartType: 'all' // all, expense, income
    };

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
    function navigateToPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        const selectedPage = document.getElementById(pageId);
        if (selectedPage) selectedPage.classList.add('active');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageId) item.classList.add('active');
        });
        const titles = {
            'dashboard-page': 'Visão Geral',
            'goals-page': 'Metas Pessoais',
            'payables-page': 'Despesas a Pagar',
            'profile-page': 'Perfil'
        };
        document.querySelector('.app-header h1').textContent = titles[pageId] || 'Visão Geral';
        if (pageId === 'payables-page') renderPayables();
    }
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            if (pageId) navigateToPage(pageId);
        });
    });

    // MODAL HANDLING
    function openModal(modal) { modal.classList.add('active'); }
    function closeModal(modal) { modal.classList.remove('active'); }

    addButton.addEventListener('click', () => {
        openTransactionModal();
    });
    cancelBtn.addEventListener('click', () => closeModal(transactionModal));
    deleteTransactionBtn.addEventListener('click', () => {
        const id = transactionIdInput.value;
        if (!id) return;
        if (confirm("Deseja excluir esta transação?")) {
            state.transactions = state.transactions.filter(t => t.id !== id);
            localStorage.setItem('transactions', JSON.stringify(state.transactions));
            saveAndRerender();
            closeModal(transactionModal);
        }
    });

    // Transaction Modal - abrir para novo lançamento
    function openTransactionModal(transaction = null) {
        transactionForm.reset();
        setCurrentDate();
        transactionIdInput.value = '';
        deleteTransactionBtn.style.display = 'none';
        transactionModalTitle.textContent = transaction ? 'Editar Transação' : 'Nova Transação';
        if (transaction) {
            transactionTypeInput.value = transaction.type;
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

    // TRANSACTION TYPE SELECT
    typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
    typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));
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

    // TRANSACTION FORM SUBMISSION (novo ou editar)
    transactionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = transactionIdInput.value;
        const type = transactionTypeInput.value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const category = categorySelect.value;
        const date = document.getElementById('date').value;
        const user = state.currentUser;

        if (!amount || !description || !category || !date) {
            alert('Preencha todos os campos');
            return;
        }

        if (id) {
            // Editar
            const idx = state.transactions.findIndex(t => t.id === id);
            if (idx > -1) {
                state.transactions[idx] = { id, type, amount, description, category, date, user };
            }
        } else {
            // Novo (ID único garantido)
            state.transactions.push({
                id: crypto.randomUUID(),
                type,
                amount,
                description,
                category,
                date,
                user
            });
        }
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        saveAndRerender();
        closeModal(transactionModal);
    });

    // Chart selector
    chartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chartBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.chartType = btn.getAttribute('data-type');
            updateAll();
        });
    });

    // DATA & RENDERING
    function saveAndRerender() {
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('goals', JSON.stringify(state.goals));
        localStorage.setItem('payables', JSON.stringify(state.payables));
        updateAll();
    }

    function updateAll() {
        const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);

        // aplica filtro igual ao gráfico para as transações recentes
        let transactionsForDisplay = monthFiltered;
        if (state.chartType === 'expense') {
            transactionsForDisplay = monthFiltered.filter(t => t.type === 'expense');
        } else if (state.chartType === 'income') {
            transactionsForDisplay = monthFiltered.filter(t => t.type === 'income');
        }

        renderSummary(monthFiltered);                 // resumo geral
        renderTransactionList(transactionsForDisplay); // lista segue filtro
        updateMainChart(monthFiltered);               // gráfico usa filtro interno
        renderGoals();
        renderPayables();
        updateMonthDisplay();
        updateUserUI();
    }

    function filterTransactionsByMonth(transactions, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return transactions.filter(t => {
            const tDate = new Date(t.date + "T03:00:00");
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });
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
    }

    function renderTransactionList(transactions) {
        const listEl = document.getElementById('transaction-list');
        listEl.innerHTML = '';
        if (transactions.length === 0) {
            listEl.innerHTML = '<li>Nenhuma transação neste filtro.</li>';
            return;
        }
        const sorted = [...transactions].sort((a,b) => new Date(b.date + "T03:00:00") - new Date(a.date + "T03:00:00"));
        sorted.forEach(t => {   // removido slice(0,10) → agora mostra todas
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

    // Helpers
    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    function formatDateBR(dateStr) {
        return new Date(dateStr + "T03:00:00").toLocaleDateString('pt-BR');
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

    function updateMonthDisplay() {
        document.getElementById('current-month-year').textContent =
            state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    }

    function updateUserUI() {
        currentUserNameEl.textContent = state.currentUser;
        userButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.user === state.currentUser);
        });
    }


    // GOAL FORM SUBMISSION
    goalForm.addEventListener('submit', function(e) {
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
    });

    document.getElementById('delete-goal-btn').addEventListener('click', function() {
        const goalId = document.getElementById('goal-id').value;
        if (confirm('Tem certeza que deseja excluir esta meta?')) {
            state.goals = state.goals.filter(g => g.id !== goalId);
            saveAndRerender();
            closeModal(goalModal);
        }
    });

    // Função global para editar meta
    window.editGoal = function(goalId) {
        const goal = state.goals.find(g => g.id === goalId);
        if (!goal) return;
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        document.getElementById('goal-date').value = goal.date;
        document.getElementById('goal-modal-title').textContent = 'Editar Meta';
        document.getElementById('delete-goal-btn').style.display = 'block';
        openModal(goalModal);
    };

    // Função global para fechar modal de meta
    window.closeGoalModal = function() {
        closeModal(goalModal);
        goalForm.reset();
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
            payables: state.payables
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "dados_financeiros.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // PAYABLES LOGIC
    addPayableBtn.addEventListener('click', () => openPayableModal());
    cancelPayableBtn.addEventListener('click', () => closeModal(payableModal));
    payableForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const payableId = document.getElementById('payable-id').value;
        const payableData = {
            description: document.getElementById('payable-description').value,
            category: document.getElementById('payable-category').value,
            amount: parseFloat(document.getElementById('payable-amount').value),
            date: document.getElementById('payable-date').value,
            paid: false
        };
        if (!payableData.description || !payableData.category || !payableData.amount || !payableData.date) {
            alert('Preencha todos os campos');
            return;
        }
        if (payableId) {
            const index = state.payables.findIndex(p => p.id === payableId);
            if (index !== -1) {
                state.payables[index] = { ...state.payables[index], ...payableData };
            }
        } else {
            state.payables.push({
                id: Date.now().toString(),
                ...payableData
            });
        }
        localStorage.setItem('payables', JSON.stringify(state.payables));
        saveAndRerender();
        closeModal(payableModal);
        renderPayables();
    });

    function openPayableModal(payable = null) {
        payableForm.reset();
        document.getElementById('payable-id').value = '';
        document.getElementById('payable-modal-title').textContent = payable ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar';
        if (payable) {
            document.getElementById('payable-id').value = payable.id;
            document.getElementById('payable-description').value = payable.description;
            document.getElementById('payable-category').value = payable.category;
            document.getElementById('payable-amount').value = payable.amount;
            document.getElementById('payable-date').value = payable.date;
        }
        openModal(payableModal);
    }

    window.markPayablePaid = function(id) {
        const idx = state.payables.findIndex(p => p.id === id);
        if (idx > -1) {
            state.payables[idx].paid = !state.payables[idx].paid;
            localStorage.setItem('payables', JSON.stringify(state.payables));
            renderPayables();
        }
    };
    window.deletePayable = function(id) {
        if (confirm('Excluir esta conta?')) {
            state.payables = state.payables.filter(p => p.id !== id);
            localStorage.setItem('payables', JSON.stringify(state.payables));
            renderPayables();
        }
    };
    window.editPayable = function(id) {
        const payable = state.payables.find(p => p.id === id);
        if (!payable) return;
        openPayableModal(payable);
    };

    // DATA & RENDERING
    function saveAndRerender() {
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('goals', JSON.stringify(state.goals));
        localStorage.setItem('payables', JSON.stringify(state.payables));
        updateAll();
    }


    function filterTransactionsByMonth(transactions, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return transactions.filter(t => {
            const tDate = new Date(t.date + "T03:00:00");
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });
    }

    function updateMonthDisplay() {
        document.getElementById('current-month-year').textContent = state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDateBR(dateStr) {
        return new Date(dateStr + "T03:00:00").toLocaleDateString('pt-BR');
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

   // FILTRO DO GRÁFICO
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
    
        // ✅ NOVO: Atualiza o resumo por categoria
        renderCategorySummary(filtered);
    }
    
    // ✅ NOVA FUNÇÃO: Resumo por Categoria com ícones
        function renderCategorySummary(transactions) {
        const container = document.getElementById('category-summary');
        if (!container) return;
    
        container.innerHTML = '';
    
        const summary = {};
    
        transactions.forEach(t => {
            if (!summary[t.category]) {
                summary[t.category] = { total: 0, type: t.type };
            }
            summary[t.category].total += t.amount;
        });
    
        Object.entries(summary).forEach(([category, data]) => {
            const icon = getCategoryIcon(category);
            const card = document.createElement('div');
            card.className = `category-card ${data.type}`;
    
            card.innerHTML = `
                <div class="category-icon">
                    <span class="material-icons-sharp">${icon}</span>
                </div>
                <div class="category-info">
                    <span class="category-name">${category}</span>
                    <span class="category-amount">R$ ${data.total.toFixed(2)}</span>
                </div>
            `;
    
            container.appendChild(card);
        });
    }
    
    // ✅ FUNÇÃO AUXILIAR: Ícones por categoria
    function getCategoryIcon(category) {
        const icons = {
            'Alimentação': 'restaurant',
            'Transporte': 'directions_bus',
            'Moradia': 'home',
            'Lazer': 'sports_esports',
            'Saúde': 'local_hospital',
            'Empréstimo': 'account_balance',
            'Cartão de Crédito': 'credit_card',
            'Energia': 'bolt',
            'Água': 'water_drop',
            'Gás': 'local_fire_department',
            'Internet': 'wifi',
            'Investimento': 'trending_up',
            'Outros': 'category',
            'Salário': 'attach_money',
            'Combustível': 'local_gas_station',
            'Aluguel': 'business'
        };
        return icons[category] || 'category';
    }
    
    // ✅ LISTA DE TRANSAÇÕES
    function renderTransactionList(transactions) {
        const listEl = document.getElementById('transaction-list');
        listEl.innerHTML = '';
        if (transactions.length === 0) {
            listEl.innerHTML = '<li>Nenhuma transação este mês.</li>';
            return;
        }
        const sorted = [...transactions].sort((a,b) => new Date(b.date + "T03:00:00") - new Date(a.date + "T03:00:00"));
        sorted.forEach(t => {
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
              <span class="meta-info">Limite: <strong>${formatDateBR(goal.date)}</strong></span>
            
              <div class="goal-visual">
                <canvas id="goal-chart-${goal.id}" width="70" height="70"></canvas>
                <p class="monthly-suggestion" id="monthly-${goal.id}"></p>
              </div>
            
              <div class="goal-actions">
                <button class="btn-secondary" onclick="editGoal('${goal.id}')">Editar</button>
                <button class="btn-danger" onclick="window.deleteGoal && deleteGoal('${goal.id}')">Excluir</button>
              </div>
            `;
    
            goalList.appendChild(card);
    
            // Cálculo da sugestão mensal
            const restante = goal.target - goal.current;
            const mesesRestantes = Math.max(
                Math.ceil((new Date(goal.date) - new Date()) / (1000 * 60 * 60 * 24 * 30)),
                1
            );
            const sugestao = restante / mesesRestantes;
            document.getElementById(`monthly-${goal.id}`).textContent =
                `Sugestão: R$ ${sugestao.toFixed(2)} por mês`;
    
            // Gráfico de progresso
            const ctx = document.getElementById(`goal-chart-${goal.id}`).getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Concluído', 'Restante'],
                    datasets: [{
                        data: [goal.current, restante],
                        backgroundColor: ['#4A90E2', '#e0e0e0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: '70%',
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
        });
    }

    window.deleteGoal = function(goalId) {
        if (confirm('Tem certeza que deseja excluir esta meta?')) {
            state.goals = state.goals.filter(g => g.id !== goalId);
            saveAndRerender();
        }
    };

    function renderPayables() {
        payableList.innerHTML = '';
        if (state.payables.length === 0) {
            payableList.innerHTML = '<p>Nenhuma conta lançada.</p>';
            return;
        }
        state.payables.forEach(p => {
            payableList.innerHTML += `
            <div class="goal-card">
                <span class="meta-title">${p.description}</span>
                <span class="meta-info">Categoria: ${p.category}</span>
                <span class="meta-info">Valor: ${formatCurrency(p.amount)}</span>
                <span class="meta-info">Vencimento: ${formatDateBR(p.date)}</span>
                <span class="meta-info">Status: ${p.paid ? '<span style="color:green">Pago</span>' : '<span style="color:red">A pagar</span>'}</span>
                <div class="goal-actions">
                    <button class="btn-secondary" onclick="window.markPayablePaid('${p.id}')">${p.paid ? 'Desfazer' : 'Marcar Pago'}</button>
                    <button class="btn-secondary" onclick="window.editPayable('${p.id}')">Editar</button>
                    <button class="btn-danger" onclick="window.deletePayable('${p.id}')">Excluir</button>
                </div>
            </div>
            `;
        });
    }

    function updateUserUI() {
        currentUserNameEl.textContent = state.currentUser;
        userButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.user === state.currentUser);
        });
    }

    // GRAFICO DA META A ALCANÇA
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

    document.getElementById('add-goal-btn').addEventListener('click', () => {
      document.getElementById('goal-modal').classList.add('active');
      document.getElementById('goal-form').reset();
      document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
      document.getElementById('delete-goal-btn').style.display = 'none';
    });

    document.getElementById('cancel-goal-btn').addEventListener('click', () => {
      document.getElementById('goal-modal').classList.remove('active');
    });


    // 🔔 Sino de Alerta de Contas a Vencer
    // Função para calcular dias restantes
    function diasRestantes(dataVencimento) {
      const hoje = new Date();
      const vencimento = new Date(dataVencimento);
      return Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    }
    
    // Função para verificar contas a vencer
    function verificarContasAVencer() {
      const hoje = new Date();
      const proximas = contas.filter(conta => {
        const dias = diasRestantes(conta.dueDate);
        return dias >= 0 && dias <= 5 && !conta.paid;
      });
    
      // Atualiza contador no sino
      const alertCount = document.getElementById('alert-count');
      if (alertCount) alertCount.textContent = proximas.length;
    
      // Atualiza lista de contas no modal
      const alertList = document.getElementById('alert-list');
      if (alertList) {
        alertList.innerHTML = '';
        proximas.forEach(conta => {
          const dias = diasRestantes(conta.dueDate);
          const item = document.createElement('li');
          item.textContent = `${conta.description} - vence em ${dias} dia${dias > 1 ? 's' : ''}`;
          alertList.appendChild(item);
        });
      }
    
      // Aplica animação no ícone do sino
      const alertIcon = document.getElementById('alert-icon');
      if (alertIcon) alertIcon.classList.toggle('ativo', proximas.length > 0);
    
      return proximas;
    }
    
    // Função para abrir o modal de alerta
    function abrirAlerta() {
      const modal = document.getElementById('alert-modal');
      modal.classList.add('active');
    
      const lista = document.getElementById('alert-list');
      lista.innerHTML = ''; // Limpa a lista antes de preencher
    
      const contasAVencer = verificarContasAVencer();
    
      if (contasAVencer.length === 0) {
        const item = document.createElement('li');
        item.textContent = 'Nenhuma conta a vencer nos próximos dias.';
        lista.appendChild(item);
      } else {
        contasAVencer.forEach(conta => {
          const dias = diasRestantes(conta.dueDate);
          const item = document.createElement('li');
          item.textContent = `${conta.description} - vence em ${dias} dia${dias > 1 ? 's' : ''}`;
          lista.appendChild(item);
        });
      }
    }
    
    // Função para fechar o modal de alerta
    function fecharAlerta() {
      const modal = document.getElementById('alert-modal');
      modal.classList.remove('active');
    }
    
    // Adiciona o evento de clique no ícone do sino
    document.addEventListener('DOMContentLoaded', () => {
      const icon = document.getElementById('alert-icon');
      if (icon) {
        icon.addEventListener('click', abrirAlerta);
      }
    });
    
    // Correção da integração bancária
    window.connectBank = async function(bankName) {
      try {
        alert(`Integração com ${bankName} em desenvolvimento. Em breve estará disponível.`);
      } catch (error) {
        console.error('Erro na conexão:', error);
        alert(`Não foi possível conectar ao ${bankName}. Tente novamente mais tarde.`);
      }
    };

 });
