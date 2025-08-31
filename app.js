// --- app.js ---
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
    // ===== ELEMENTOS DA UI =====
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

    // Menu lateral
    const menuBotao = document.getElementById('menu-botao');
    const menuFlutuante = document.getElementById('menu-perfil');

    // Goals
    const addGoalBtn = document.getElementById('add-goal-btn');
    const goalModal = document.getElementById('goal-modal');
    const cancelGoalBtn = document.getElementById('cancel-goal-btn');
    const goalForm = document.getElementById('goal-form');
    const goalList = document.getElementById('goal-list');

    // Payables
    const addPayableBtn = document.getElementById('add-payable-btn');
    const payableModal = document.getElementById('payable-modal');
    const cancelPayableBtn = document.getElementById('cancel-payable-btn');
    const payableForm = document.getElementById('payable-form');
    const payableList = document.getElementById('payable-list');

    // Usuário
    const currentUserNameEl = document.getElementById('current-user-name');
    const exportDataBtn = document.getElementById('export-data-btn');

    // Chart
    const chartBtns = document.querySelectorAll('.chart-btn');
    const chartTitle = document.getElementById('chart-title');

    // ===== STATE =====
    const state = {
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        goals: JSON.parse(localStorage.getItem('goals')) || [],
        payables: JSON.parse(localStorage.getItem('payables')) || [],
        currentUser: localStorage.getItem('currentUser') || 'Esposo',
        users: ['Esposo', 'Esposa'],
        currentDate: new Date(),
        expenseCategories: [
            'Alimentação', 'Transporte', 'Moradia', 'Lazer',
            'Saúde', 'Empréstimo', 'Cartão de Crédito',
            'Energia', 'Água', 'Gás', 'Internet',
            'Investimento', 'Outros'
        ],
        incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
        chartType: 'all' // all, expense, income
    };

    // ===== INITIAL SETUP =====
    createExpenseChart();
    setCurrentDate();
    updateAll();
    registerServiceWorker();

    // ===== DATE NAVIGATION =====
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

    // ===== MENU LATERAL =====
    menuBotao.addEventListener('click', () => {
        menuFlutuante.style.display =
            menuFlutuante.style.display === 'none' ? 'block' : 'none';
    });

    // ===== NAVEGAÇÃO =====
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
            'profile-page': 'Perfil',
            'annual-summary-page': 'Resumo Anual',
            'config-page': 'Configurações'
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

    // ===== MENU OPÇÕES =====
    window.abrirPagina = function (id) {
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        const page = document.getElementById(id);
        if (page) page.classList.add("active");
        menuFlutuante.style.display = "none";
    };

    window.abrirResumoAnual = function () {
        abrirPagina('annual-summary-page');
        atualizarResumoAnual();
    };

    window.abrirConfig = function () {
        abrirPagina('config-page');
        alert("⚙️ Tela de Configurações em construção...");
    };

    window.exportarDados = function () {
        alert("📤 Exportando dados (simulação). Aqui você pode gerar CSV ou JSON.");
        menuFlutuante.style.display = "none";
    };

    // ===== RESUMO ANUAL =====
    function atualizarResumoAnual() {
        const ano = new Date().getFullYear();

        const receita = state.transactions
            .filter(t => new Date(t.date).getFullYear() === ano && t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

        const despesa = state.transactions
            .filter(t => new Date(t.date).getFullYear() === ano && t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

        const saldo = receita - despesa;

        document.getElementById("annual-revenue").textContent = receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        document.getElementById("annual-expense").textContent = despesa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        document.getElementById("annual-balance").textContent = saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        const ctx = document.getElementById("annual-chart").getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Receita", "Despesa", "Saldo"],
                datasets: [{
                    label: "R$",
                    data: [receita, despesa, saldo],
                    backgroundColor: ["#4CAF50", "#F44336", "#2196F3"]
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // ===== PERFIL =====
    function carregarPerfil() {
        currentUserNameEl.textContent = state.currentUser;
    }

    // ===== CONFIGURAÇÕES =====
    function trocarTema() {
        document.body.classList.toggle("dark-theme");
        alert("Tema alterado!");
    }

    function resetarApp() {
        if (confirm("Deseja realmente resetar o aplicativo?")) {
            localStorage.clear();
            location.reload();
        }
    }

    // ===== MODAIS =====
    function openModal(modal) { modal.classList.add('active'); }
    function closeModal(modal) { modal.classList.remove('active'); }

    addButton.addEventListener('click', () => openModal(transactionModal));
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

    // ===== FUNÇÕES AUXILIARES =====
    function updateAll() {
        // Atualiza dashboard, metas, despesas etc.
        carregarPerfil();
        if (document.getElementById('annual-summary-page').classList.contains('active')) {
            atualizarResumoAnual();
        }
    }

    function saveAndRerender() {
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        updateAll();
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js');
        }
    }
});
