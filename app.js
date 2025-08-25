// Dados salvos em localStorage
let dados = JSON.parse(localStorage.getItem("financeiro")) || {
  lancamentos: [],
  metas: { valorMeta: 10000, valorGuardado: 0 },
  pagarReceber: []
};

const contasDespesas = ["Empréstimo","Cartão de Débito","Água","Energia","Gás","Vestiário","Investimento"];

// Função troca abas
function mostrarAba(id) {
  document.querySelectorAll(".aba").forEach(el => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");
  atualizarTudo();
}

// Salvar no localStorage
function salvar() {
  localStorage.setItem("financeiro", JSON.stringify(dados));
}

// Adicionar lançamento (receita ou despesa)
function abrirLancamento() {
  const tipo = prompt("Digite tipo: receita ou despesa");
  if (!tipo) return;

  const valor = parseFloat(prompt("Digite o valor:"));
  if (isNaN(valor)) return;

  const categoria = tipo === "despesa" 
    ? prompt("Digite categoria (ex: " + contasDespesas.join(", ") + ")") 
    : prompt("Digite categoria da receita:");

  const conta = prompt("Digite a conta (ex: Banco, Carteira, etc.)");
  const data = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  dados.lancamentos.push({ tipo, valor, categoria, conta, data });
  if (tipo === "receita") dados.metas.valorGuardado += valor;

  salvar();
  atualizarTudo();
}

// Exibir lançamentos
function atualizarLancamentos() {
  const lista = document.getElementById("listaLancamentos");
  lista.innerHTML = "";
  dados.lancamentos.forEach((l, i) => {
    const div = document.createElement("div");
    div.innerHTML = `${l.tipo.toUpperCase()} - R$ ${l.valor.toFixed(2)} (${l.categoria}) <small>${l.data}</small>`;
    div.onclick = () => {
      if (confirm("Deseja excluir este lançamento?")) {
        if (l.tipo === "receita") dados.metas.valorGuardado -= l.valor;
        dados.lancamentos.splice(i, 1);
        salvar();
        atualizarTudo();
      }
    };
    lista.appendChild(div);
  });
}

// Atualizar metas
function atualizarMetas() {
  const { valorMeta, valorGuardado } = dados.metas;
  document.getElementById("metaValor").innerText = `Meta: R$ ${valorGuardado.toFixed(2)} / R$ ${valorMeta.toFixed(2)}`;
  const progresso = (valorGuardado / valorMeta) * 100;
  document.getElementById("progress").style.width = progresso + "%";
  document.getElementById("progress").innerText = progresso.toFixed(1) + "%";

  // previsão
  const receitas = dados.lancamentos.filter(l => l.tipo === "receita");
  const meses = new Set(receitas.map(r => r.data.substring(3,10))).size || 1;
  const media = receitas.reduce((s,r)=>s+r.valor,0) / meses || 0;
  const restante = valorMeta - valorGuardado;
  if (media > 0 && restante > 0) {
    const mesesRestantes = Math.ceil(restante / media);
    const dataPrev = new Date();
    dataPrev.setMonth(dataPrev.getMonth() + mesesRestantes);
    document.getElementById("metaPrevisao").innerText = 
      `Previsão: ${mesesRestantes} meses → ${dataPrev.toLocaleDateString("pt-BR",{month:"short", year:"numeric"})}`;
  } else {
    document.getElementById("metaPrevisao").innerText = "Previsão: --";
  }
}

// A Pagar / A Receber
function atualizarPagarReceber() {
  const lista = document.getElementById("listaPagarReceber");
  lista.innerHTML = "";
  let totalPagar = 0, totalReceber = 0;
  dados.pagarReceber.forEach((p,i)=>{
    const div = document.createElement("div");
    div.innerHTML = `${p.tipo.toUpperCase()} - R$ ${p.valor.toFixed(2)} (${p.descricao})`;
    div.onclick = ()=> {
      if (confirm("Dar baixa neste lançamento?")) {
        dados.pagarReceber.splice(i,1);
        salvar(); atualizarTudo();
      }
    };
    lista.appendChild(div);
    if (p.tipo==="pagar") totalPagar += p.valor;
    else totalReceber += p.valor;
  });
  document.getElementById("totalPagar").innerText = totalPagar.toFixed(2);
  document.getElementById("totalReceber").innerText = totalReceber.toFixed(2);
}

// Gráficos
let graficoGeral, graficoDespesasConta, graficoReceitasConta;

function atualizarGraficos() {
  // Geral
  const ctx = document.getElementById("graficoGeral").getContext("2d");
  if (graficoGeral) graficoGeral.destroy();
  const porCategoria = {};
  dados.lancamentos.forEach(l=>{
    porCategoria[l.categoria] = (porCategoria[l.categoria]||0)+l.valor;
  });
  graficoGeral = new Chart(ctx, {
    type:"pie",
    data:{ labels:Object.keys(porCategoria), datasets:[{ data:Object.values(porCategoria) }] },
  });
  document.getElementById("legendaGeral").innerHTML = Object.entries(porCategoria).map(([c,v])=>`${c}: R$ ${v.toFixed(2)}`).join("<br>");
  document.getElementById("tabelaGeral").innerHTML = "<b>Resumo:</b><br>"+document.getElementById("legendaGeral").innerHTML;

  // Despesas por conta
  const ctxD = document.getElementById("graficoDespesasConta").getContext("2d");
  if (graficoDespesasConta) graficoDespesasConta.destroy();
  const despPorConta = {};
  dados.lancamentos.filter(l=>l.tipo==="despesa").forEach(l=>{
    despPorConta[l.conta]=(despPorConta[l.conta]||0)+l.valor;
  });
  graficoDespesasConta = new Chart(ctxD,{type:"pie",data:{labels:Object.keys(despPorConta),datasets:[{data:Object.values(despPorConta)}]}});
  document.getElementById("tabelaDespesasConta").innerHTML = Object.entries(despPorConta).map(([c,v])=>`${c}: R$ ${v.toFixed(2)}`).join("<br>");

  // Receitas por conta
  const ctxR = document.getElementById("graficoReceitasConta").getContext("2d");
  if (graficoReceitasConta) graficoReceitasConta.destroy();
  const recPorConta = {};
  dados.lancamentos.filter(l=>l.tipo==="receita").forEach(l=>{
    recPorConta[l.conta]=(recPorConta[l.conta]||0)+l.valor;
  });
  graficoReceitasConta = new Chart(ctxR,{type:"pie",data:{labels:Object.keys(recPorConta),datasets:[{data:Object.values(recPorConta)}]}});
  document.getElementById("tabelaReceitasConta").innerHTML = Object.entries(recPorConta).map(([c,v])=>`${c}: R$ ${v.toFixed(2)}`).join("<br>");
}

// Atualizar tudo
function atualizarTudo() {
  atualizarLancamentos();
  atualizarMetas();
  atualizarPagarReceber();
  atualizarGraficos();
}

// Início
atualizarTudo();
