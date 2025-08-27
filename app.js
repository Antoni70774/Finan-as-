import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

// ==========================
// APP PRINCIPAL
// ==========================
document.addEventListener('DOMContentLoaded', () => {
    const state = {
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        goals: JSON.parse(localStorage.getItem('goals')) || [],
        categories: ["Alimentação", "Transporte", "Moradia", "Lazer", "Outros"]
    };

    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    const goalForm = document.getElementById('goal-form');
    const goalList = document.getElementById('goal-list');
    const incomeEl = document.getElementById('month-income');
    const expenseEl = document.getElementById('month-expense');
    const balanceEl = document.getElementById('month-balance');

    // Criar gráfico
    createExpenseChart();

    // Render inicial
    renderTransactions();
    renderGoals();
    updateSummary();
    updateExpenseChart(state.transactions, state.categories);

    // ==========================
    // EVENTOS
    // ==========================
    transactionForm.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(transactionForm);
        const transaction = {
            id: Date.now(),
            date: formData.get('date'),
            category: formData.get('category'),
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount'))
        };
        state.transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        transactionForm.reset();
        renderTransactions();
        updateSummary();
        updateExpenseChart(state.transactions, state.categories);
    });

    goalForm.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(goalForm);
        const goal = {
            id: Date.now(),
            name: formData.get('name'),
            amount: parseFloat(formData.get('amount'))
        };
        state.goals.push(goal);
        localStorage.setItem('goals', JSON.stringify(state.goals));
        goalForm.reset();
        renderGoals();
    });

    // ==========================
    // FUNÇÕES DE RENDER
    // ==========================
    function renderTransactions() {
        transactionList.innerHTML = '';
        state.transactions.forEach(t => {
            const li = document.createElement('li');
            li.className = t.type;
            li.innerHTML = `
                <strong>${t.category}</strong> - 
                ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                <small>(${t.date})</small>
                <button class="delete-btn">x</button>
            `;
            li.querySelector('.delete-btn').addEventListener('click', () => {
                state.transactions = state.transactions.filter(tr => tr.id !== t.id);
                localStorage.setItem('transactions', JSON.stringify(state.transactions));
                renderTransactions();
                updateSummary();
                updateExpenseChart(state.transactions, state.categories);
            });
            transactionList.appendChild(li);
        });
    }

    function renderGoals() {
        goalList.innerHTML = '';
        state.goals.forEach(g => {
            const li = document.createElement('li');
            li.innerHTML = `
                🎯 <strong>${g.name}</strong> - 
                ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.amount)}
                <button class="delete-btn">x</button>
            `;
            li.querySelector('.delete-btn').addEventListener('click', () => {
                state.goals = state.goals.filter(goal => goal.id !== g.id);
                localStorage.setItem('goals', JSON.stringify(state.goals));
                renderGoals();
            });
            goalList.appendChild(li);
        });
    }

    function updateSummary() {
        const income = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;

        incomeEl.textContent = income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        expenseEl.textContent = expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        balanceEl.textContent = balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
});
