// ==========================
// APP PRINCIPAL
// ==========================
import { createExpenseChart, updateExpenseChart } from "./chart-setup.js";

document.addEventListener("DOMContentLoaded", () => {
  // --------------------------
  // STATE MANAGEMENT
  // --------------------------
  const state = {
    transactions: JSON.parse(localStorage.getItem("transactions")) || [],
    goals: JSON.parse(localStorage.getItem("goals")) || [],
  };

  // --------------------------
  // ELEMENTOS
  // --------------------------
  const incomeEl = document.getElementById("month-income");
  const expenseEl = document.getElementById("month-expense");
  const balanceEl = document.getElementById("month-balance");
  const transactionForm = document.getElementById("transaction-form");
  const goalForm = document.getElementById("goal-form");
  const transactionList = document.getElementById("transaction-list");
  const goalList = document.getElementById("goal-list");

  // --------------------------
  // CHART SETUP
  // --------------------------
  const expenseChart = createExpenseChart();
  const categories = ["Alimentação", "Transporte", "Moradia", "Lazer", "Outros"];

  // --------------------------
  // FUNÇÕES DE UTILIDADE
  // --------------------------
  function saveState() {
    localStorage.setItem("transactions", JSON.stringify(state.transactions));
    localStorage.setItem("goals", JSON.stringify(state.goals));
  }

  function updateSummary() {
    const income = state.transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const expense = state.transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    incomeEl.textContent = `R$ ${income.toFixed(2)}`;
    expenseEl.textContent = `R$ ${expense.toFixed(2)}`;
    balanceEl.textContent = `R$ ${(income - expense).toFixed(2)}`;
  }

  function renderTransactions() {
    transactionList.innerHTML = "";
    state.transactions.forEach((t, index) => {
      const li = document.createElement("li");
      li.textContent = `${t.date} - ${t.category} - ${t.type === "income" ? "+" : "-"}R$ ${parseFloat(t.amount).toFixed(2)}`;
      li.classList.add(t.type);
      li.addEventListener("click", () => {
        state.transactions.splice(index, 1);
        saveState();
        renderTransactions();
        updateSummary();
        updateExpenseChart(state.transactions, categories);
      });
      transactionList.appendChild(li);
    });
  }

  function renderGoals() {
    goalList.innerHTML = "";
    state.goals.forEach((g, index) => {
      const li = document.createElement("li");
      li.textContent = `${g.name} - R$ ${parseFloat(g.amount).toFixed(2)}`;
      li.addEventListener("click", () => {
        state.goals.splice(index, 1);
        saveState();
        renderGoals();
      });
      goalList.appendChild(li);
    });
  }

  // --------------------------
  // EVENTOS
  // --------------------------
  transactionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(transactionForm);
    const transaction = {
      date: formData.get("date"),
      category: formData.get("category"),
      type: formData.get("type"),
      amount: parseFloat(formData.get("amount")),
    };
    state.transactions.push(transaction);
    saveState();
    renderTransactions();
    updateSummary();
    updateExpenseChart(state.transactions, categories);
    transactionForm.reset();
  });

  goalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(goalForm);
    const goal = {
      name: formData.get("name"),
      amount: parseFloat(formData.get("amount")),
    };
    state.goals.push(goal);
    saveState();
    renderGoals();
    goalForm.reset();
  });

  // --------------------------
  // INICIALIZAÇÃO
  // --------------------------
  renderTransactions();
  renderGoals();
  updateSummary();
  updateExpenseChart(state.transactions, categories);
});
