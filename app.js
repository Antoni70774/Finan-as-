import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    currentUser: localStorage.getItem('currentUser') || 'Esposo',
    users: ['Esposo', 'Esposa'],
    currentDate: new Date(),
    expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros', 'Agua', 'Energia', 'Emprestimo'],
    incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
  };

  // Funções utilitárias
  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDateLocalISO(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
      #transaction-list { display: none; }
    `;
    document.head.appendChild(style);
  }

  // Elementos da UI
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
  const monthExpenseTap = document.getElementById('card-expense') || document.getElementById('month-expense');
  const monthIncomeTap = document.getElementById('card-income') || document.getElementById('month-income');

  // Inicialização
  injectStylesOnce();
  createExpenseChart();
  setCurrentDate();
  updateAll();
  makeFAB();

  // Navegação de mês
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
    if (dateEl) dateEl.value = formatDateLocalISO(new Date());
  }

  // Navegação entre páginas
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

  // Modais
  function openModal(modal) { modal?.classList.add('active'); }
  function closeModal(modal) { modal?.classList.remove('active'); }

  if (addTransactionBtn) {
    addTransactionBtn.classList.add('fab');
    addTransactionBtn.addEventListener('click', openFABMenu);
  }

  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(transactionModal));
  if (addGoalBtn) addGoalBtn.addEventListener('click', () => { goalForm?.reset(); openModal(goalModal); });
  if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', () => closeModal(goalModal));

  // Tipo de transação
  if (typeExpenseBtn) typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
  if (typeIncomeBtn) typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));
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

  // Formulário de transação
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

      if (idHidden) idHidden.value = '';
      saveAndRerender();
      closeModal(transactionModal);
      this.reset();
      setCurrentDate();
    });
  }

  // Metas
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
      if (existsIdx !== -1) state.goals[existsIdx] = goal;
      else state.goals.push(goal);

      saveAndRerender();
      closeGoalModal();
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
    openModal(transactionModal);
    ensureHiddenIdInput();
    document.getElementById('transaction-id').value = t.id;
    setTransactionType(t.type);
    document.getElementById('amount').value = t.amount;
    document.getElementById('description').value = t.description || '';
    categorySelect.value = t.category;
    document.getElementById('date').value = t.date;
  }

  function deleteTransaction(id, overlay) {
    if (!confirm('Excluir este lançamento?')) return;
    state.transactions = state.transactions.filter((x) => x.id !== id);
    saveAndRerender();
    overlay?.remove();
  }

  // --------------------------
  // FLOATING ACTION BUTTON
  // --------------------------
  let fabMenuEl = null;
  function makeFAB() {
    if (!addTransactionBtn) return;
    addTransactionBtn.title = 'Novo lançamento';
  }

  function openFABMenu() {
    if (fabMenuEl) {
      closeFABMenu();
      return;
    }
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
