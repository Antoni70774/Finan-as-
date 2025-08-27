import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || []
  };

  createExpenseChart();aimport { createExpenseChart, updateExpenseChart } from './chart-setup.js';

// ==========================
// APP PRINCIPAL
// ==========================
document.addEventListener('DOMContentLoaded', () => {
  // --------------------------
  // STATE MANAGEMENT
  // --------------------------
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Esposo',
    users: ['Esposo', 'Esposa'],
    currentDate: new Date(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros', 'Agua', 'Energia', 'Emprestimo'],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
  };

  // --------------------------
  // UTILITÁRIOS
  // --------------------------
  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Corrige "data de ontem" por causa de toISOString/UTC
  function formatDateLocalISO(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`; // YYYY-MM-DD no fuso local
  }

  function ensureHiddenIdInput() {
    if (!document.getElementById('transaction-id')) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = 'transaction-id';
      hidden.name = 'transaction-id';
      transactionForm?.appendChild(hidden);
    }
  }

  function injectStylesOnce() {
    if (document.getElementById('finance-app-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'finance-app-injected-styles';
    style.textContent = `
      /* Floating Action Button */
      .fab {
        position: fixed; right: 20px; bottom: 20px; z-index: 1000;
        border-radius: 9999px; padding: 12px 18px; font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,.2);
      }
      .fab-menu { position: fixed; right: 20px; bottom: 80px; display: flex; flex-direction: column; gap: 10px; z-index: 1000; }
      .fab-menu button { border-radius: 9999px; padding: 10px 14px; box-shadow: 0 6px 18px rgba(0,0,0,.15); }

      /* Modal de listagem */
      .list-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1100; }
      .list-modal { width: min(720px, 94vw); max-height: 80vh; overflow: auto; background: var(--card-bg, #111418); color: var(--text, #eaeaea); border-radius: 16px; padding: 16px; }
      .list-modal header { display:flex; align-items:center; justify-content:space-between; gap:12px; position: sticky; top: 0; background: inherit; padding-bottom: 8px; margin-bottom: 8px; }
      .list-modal .tx-row { display:flex; align-items:center; justify-content:space-between; gap: 10px; padding: 10px 6px; border-bottom: 1px solid rgba(255,255,255,.06); }
      .tx-info { display:flex; flex-direction: column; gap:2px; }
      .tx-actions { display:flex; gap: 8px; }
      .btn { cursor:pointer; border: 0; padding: 8px 12px; border-radius: 10px; font-weight: 600; }
      .btn-primary { background: #4f46e5; color: #fff; }
      .btn-danger { background: #ef4444; color: #fff; }
      .btn-ghost { background: transparent; color: inherit; }

      /* Esconde a lista padrão para cumprir pedido "somente o gráfico" */
      #transaction-list { display: none; }
    `;
    document.head.appendChild(style);
  }

  // --------------------------
  // ELEMENTOS DA UI
  // --------------------------
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

  // cartões/valores para abrir listagem por tipo
  const monthExpenseTap = document.getElementById('card-expense') || document.getElementById('month-expense');
  const monthIncomeTap = document.getElementById('card-income') || document.getElementById('month-income');

  // --------------------------
  // INICIALIZAÇÃO
  // --------------------------
  injectStylesOnce();
  createExpenseChart();
  setCurrentDate();
  updateAll();
  makeFAB();

  // --------------------------
  // NAVEGAÇÃO DE MÊS
  // --------------------------
  const prevBtn = document.getElementById('prev-month');
  const nextBtn = document.getElementById('next-month');
  if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

  function changeMonth(direction) {
    state.currentDate.setMonth(state.currentDate.getMonth() + direction);
    updateAll();
  }

  function setCurrentDate() {
    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.value = formatDateLocalISO(new Date()); // data local correta
  }

  // --------------------------
  // NAVEGAÇÃO ENTRE PÁGINAS
  // --------------------------
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.getAttribute('data-page');
      if (!pageId) return;
      pages.forEach((p) => p.classList.remove('active'));
      document.getElementById(pageId)?.classList.add('active');
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // --------------------------
  // MODAIS BÁSICOS
  // --------------------------
  function openModal(modal) { modal?.classList.add('active'); }
  function closeModal(modal) { modal?.classList.remove('active'); }

  if (addTransactionBtn) {
    // Garante estilo flutuante
    addTransactionBtn.classList.add('fab');
    addTransactionBtn.addEventListener('click', openFABMenu);
  }

  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(transactionModal));

  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', () => {
      goalForm?.reset();
      openModal(goalModal);
    });
  }
  if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', () => closeModal(goalModal));

  // --------------------------
  // FORM DE TRANSAÇÃO
  // --------------------------
  if (typeExpenseBtn) typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
  if (typeIncomeBtn) typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));

  // Tipo padrão ao abrir o app
  setTransactionType('expense');

  function setTransactionType(type) {
    if (!transactionTypeInput) return;
    transactionTypeInput.value = type;
    typeExpenseBtn?.classList.toggle('active', type === 'expense');
    typeIncomeBtn?.classList.toggle('active', type === 'income');
    updateCategoryOptions(type);
  }

  function updateCategoryOptions(type) {
    if (!categorySelect) return;
    categorySelect.innerHTML = '';
    const categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }

  if (transactionForm) {
    ensureHiddenIdInput();
    transactionForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const idHidden = document.getElementById('transaction-id');
      const editingId = idHidden?.value || '';

      const tx = {
        id: editingId || Date.now().toString(),
        type: transactionTypeInput?.value || 'expense',
        amount: parseFloat(document.getElementById('amount')?.value || '0') || 0,
        description: (document.getElementById('description')?.value || '').trim(),
        category: categorySelect?.value || '',
        date: document.getElementById('date')?.value || formatDateLocalISO(new Date()),
        user: state.currentUser,
      };

      if (!tx.category || !tx.date || !tx.type || isNaN(tx.amount)) {
        alert('Preencha os campos corretamente.');
        return;
      }

      if (editingId) {
        const idx = state.transactions.findIndex((t) => t.id === editingId);
        if (idx !== -1) state.transactions[idx] = tx;
      } else {
        state.transactions.push(tx);
      }

      // limpa edição
      if (idHidden) idHidden.value = '';

      saveAndRerender();
      closeModal(transactionModal);
      this.reset();
      setCurrentDate();
    });
  }

  // --------------------------
  // METAS (GOALS)
  // --------------------------
  if (goalForm) {
    goalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const goal = {
        id: document.getElementById('goal-id')?.value || Date.now().toString(),
        name: document.getElementById('goal-name')?.value || '',
        target: parseFloat(document.getElementById('goal-target')?.value || '0') || 0,
        current: parseFloat(document.getElementById('goal-current')?.value || '0') || 0,
      };

      if (!goal.name) {
        alert('Informe o nome da meta.');
        return;
      }

      const existsIdx = state.goals.findIndex((g) => g.id === goal.id);
      if (existsIdx !== -1) state.goals[existsIdx] = goal; else state.goals.push(goal);

      saveAndRerender();
      closeGoalModal();
    });
  }

  window.editGoal = function (goalId) {
    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal) return;
    document.getElementById('goal-id').value = goal.id;
    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-target').value = goal.target;
    document.getElementById('goal-current').value = goal.current;
    document.getElementById('goal-modal-title').textContent = 'Editar Meta';
    document.getElementById('delete-goal-btn').style.display = 'block';
    openModal(goalModal);
  };

  const deleteGoalBtn = document.getElementById('delete-goal-btn');
  if (deleteGoalBtn) {
    deleteGoalBtn.addEventListener('click', function () {
      const id = document.getElementById('goal-id')?.value;
      if (!id) return;
      if (confirm('Tem certeza que deseja excluir esta meta?')) {
        state.goals = state.goals.filter((g) => g.id !== id);
        saveAndRerender();
        closeGoalModal();
      }
    });
  }

  function closeGoalModal() {
    closeModal(goalModal);
    goalForm?.reset();
    const goalIdEl = document.getElementById('goal-id');
    if (goalIdEl) goalIdEl.value = '';
    const title = document.getElementById('goal-modal-title');
    if (title) title.textContent = 'Nova Meta Financeira';
    const del = document.getElementById('delete-goal-btn');
    if (del) del.style.display = 'none';
  }

  // --------------------------
  // AÇÕES: USUÁRIOS, EXPORTAR
  // --------------------------
  userButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.currentUser = button.dataset.user;
      localStorage.setItem('currentUser', state.currentUser);
      updateAll();
    });
  });

  exportDataBtn?.addEventListener('click', exportData);
  function exportData() {
    const data = { transactions: state.transactions, goals: state.goals };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dados_financeiros.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // --------------------------
  // RENDERIZAÇÃO / ATUALIZAÇÃO
  // --------------------------
  function saveAndRerender() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('goals', JSON.stringify(state.goals));
    updateAll();
  }

  function updateAll() {
    const filtered = filterTransactionsByMonth(state.transactions, state.currentDate);
    renderSummary(filtered);
    // Lista removida da tela inicial para manter apenas gráfico (pedido do usuário)
    // renderTransactionList(filtered);
    updateExpenseChart(filtered, state.expenseCategories);
    renderGoals();
    updateMonthDisplay();
    updateUserUI();
  }

  function filterTransactionsByMonth(transactions, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return transactions.filter((t) => {
      const tDate = new Date(t.date + 'T00:00:00'); // força parsing local e evita fuso
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  }

  function updateMonthDisplay() {
    const el = document.getElementById('current-month-year');
    if (el) el.textContent = state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function renderSummary(transactions) {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
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

  function renderGoals() {
    const list = document.getElementById('goal-list');
    if (!list) return;
    list.innerHTML = '';
    if (state.goals.length === 0) {
      list.innerHTML = '<li>Nenhuma meta definida.</li>';
      return;
    }
    state.goals.forEach((goal) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${goal.name}</strong> - ${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}
        <button class="btn btn-ghost" onclick="editGoal('${goal.id}')">Editar</button>
      `;
      list.appendChild(li);
    });
  }

  function updateUserUI() {
    if (currentUserNameEl) currentUserNameEl.textContent = state.currentUser;
    userButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.user === state.currentUser);
    });
  }

  // --------------------------
  // LISTA POR TIPO (abrindo ao tocar em Despesas/Receitas)
  // --------------------------
  monthExpenseTap?.addEventListener('click', () => openListModal('expense'));
  monthIncomeTap?.addEventListener('click', () => openListModal('income'));

  function openListModal(type) {
    const overlay = document.createElement('div');
    overlay.className = 'list-modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'list-modal';

    const title = type === 'expense' ? 'Despesas do mês' : 'Receitas do mês';
    const header = document.createElement('header');
    header.innerHTML = `<h3>${title}</h3>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-ghost';
    closeBtn.textContent = 'Fechar';
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);

    const content = document.createElement('div');

    const list = filterTransactionsByMonth(state.transactions, state.currentDate)
      .filter((t) => t.type === type)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Nenhum lançamento.';
      content.appendChild(empty);
    } else {
      list.forEach((t) => {
        const row = document.createElement('div');
        row.className = 'tx-row';
        const info = document.createElement('div');
        info.className = 'tx-info';
        const top = document.createElement('div');
        top.textContent = `${t.category} • ${t.user}`;
        const bottom = document.createElement('small');
        const d = new Date(t.date + 'T00:00:00');
        bottom.textContent = `${d.toLocaleDateString('pt-BR')} • ${formatCurrency(t.amount)}`;
        info.appendChild(top);
        info.appendChild(bottom);

        const actions = document.createElement('div');
        actions.className = 'tx-actions';
        const edit = document.createElement('button');
        edit.className = 'btn btn-primary';
        edit.textContent = 'Editar';
        edit.addEventListener('click', () => editTransaction(t, overlay));
        const del = document.createElement('button');
        del.className = 'btn btn-danger';
        del.textContent = 'Excluir';
        del.addEventListener('click', () => deleteTransaction(t.id, overlay));
        actions.appendChild(edit);
        actions.appendChild(del);

        row.appendChild(info);
        row.appendChild(actions);
        content.appendChild(row);
      });
    }

    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function editTransaction(t, overlayToKeepOpen) {
    // Preenche modal de transação
    openModal(transactionModal);
    ensureHiddenIdInput();
    document.getElementById('transaction-id').value = t.id;
    setTransactionType(t.type);
    document.getElementById('amount').value = t.amount;
    document.getElementById('description').value = t.description || '';
    categorySelect.value = t.category;
    document.getElementById('date').value = t.date; // já está em YYYY-MM-DD
  }

  function deleteTransaction(id, overlay) {
    if (!confirm('Excluir este lançamento?')) return;
    state.transactions = state.transactions.filter((x) => x.id !== id);
    saveAndRerender();
    // Reabre a listagem atualizada (fechamos e abrimos pela UX simples)
    overlay?.remove();
  }

  // --------------------------
  // FLOATING ACTION BUTTON (menu rápido)
  // --------------------------
  let fabMenuEl = null;
  function makeFAB() {
    if (!addTransactionBtn) return;
    addTransactionBtn.title = 'Novo lançamento';
  }

  function openFABMenu() {
    if (fabMenuEl) { closeFABMenu(); return; }
    fabMenuEl = document.createElement('div');
    fabMenuEl.className = 'fab-menu';

    const btnDespesa = document.createElement('button');
    btnDespesa.className = 'btn';
    btnDespesa.textContent = '+ Despesa';
    btnDespesa.addEventListener('click', () => {
      openModal(transactionModal);
      setTransactionType('expense');
      transactionForm?.reset();
      ensureHiddenIdInput();
      document.getElementById('transaction-id').value = '';
      setCurrentDate();
      closeFABMenu();
    });

    const btnReceita = document.createElement('button');
    btnReceita.className = 'btn';
    btnReceita.textContent = '+ Receita';
    btnReceita.addEventListener('click', () => {
      openModal(transactionModal);
      setTransactionType('income');
      transactionForm?.reset();
      ensureHiddenIdInput();
      document.getElementById('transaction-id').value = '';
      setCurrentDate();
      closeFABMenu();
    });

    fabMenuEl.appendChild(btnDespesa);
    fabMenuEl.appendChild(btnReceita);
    document.body.appendChild(fabMenuEl);
  }
  function closeFABMenu() {
    fabMenuEl?.remove();
    fabMenuEl = null;
  }

  // --------------------------
  // PLACEHOLDER BANCO
  // --------------------------
  window.connectBank = async function (bankName) {
    try {
      alert(`Integração com ${bankName} em desenvolvimento. Em breve estará disponível.`);
    } catch (error) {
      console.error('Erro na conexão:', error);
      alert(`Não foi possível conectar ao ${bankName}. Tente novamente mais tarde.`);
    }
  };
});

  render();

  function render() {
    const total = state.transactions.reduce((s,t) => s+t.amount,0);
    document.getElementById('month-balance').textContent = formatCurrency(total);
    const income = state.transactions.filter(t => t.type === 'income')
                 .reduce((s,t)=>s+t.amount,0);
      const expense = state.transactions.filter(t => t.type === 'expense')
                       .reduce((s,t)=>s+t.amount,0);
      const balance = income - expense;
      
      document.getElementById('month-balance').textContent = formatCurrency(balance);
      document.getElementById('month-income').textContent = formatCurrency(income);
      document.getElementById('month-expense').textContent = formatCurrency(expense);


    const grouped = {};
    state.transactions.forEach(t=>{
      grouped[t.category] = (grouped[t.category]||0)+t.amount;
    });

    const categories = Object.keys(grouped);
    const values = Object.values(grouped);
    updateExpenseChart(categories, values);
    renderCategories(grouped);
  }

  function renderCategories(grouped) {
    const list = document.getElementById('categories-list');
    list.innerHTML = '';
    Object.entries(grouped).forEach(([cat,val],i)=>{
      const div = document.createElement('div');
      div.className = 'category-card';
      div.innerHTML = `
        <div class="category-icon" style="background:${pickColor(i)}">
          <span class="material-icons-round">category</span>
        </div>
        <h4>${cat}</h4>
        <p>${formatCurrency(val)}</p>
      `;
      list.appendChild(div);
    });
  }

  function pickColor(i) {
    const colors = ['#4A90E2','#50E3C2','#F5A623','#F8E71C','#BD10E0','#7ED321','#FF6B6B','#6C5CE7'];
    return colors[i % colors.length];
  }

  function formatCurrency(v) {
    return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
});
