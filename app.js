import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    transactions: JSON.parse(localStorage.getItem('transactions')) || []
  };

  createExpenseChart();
  render();

  function render() {
    const total = state.transactions.reduce((s,t) => s+t.amount,0);
    document.getElementById('month-balance').textContent = formatCurrency(total);

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
