import React from "react";
import { Link } from "react-router-dom";
import {
  Calculator,
  Briefcase,
  DollarSign,
  ChevronRight,
  TrendingUp,
  ArrowLeft,
  LayoutGrid
} from "lucide-react";

const categorias = [
  {
    titulo: "Financeiro",
    icon: <DollarSign className="w-5 h-5 text-green-600" />,
    color: "bg-green-600",
    border: "border-green-100",
    bg: "bg-green-50/30",
    items: [
      { nome: "Juros Simples", path: "/calculadora/juros-simples" },
      { nome: "Juros Composto", path: "/calculadora/juros-composto" },
      { nome: "Investimento", path: "/calculadora/investimento" },
      { nome: "Poupança", path: "/calculadora/poupanca" },
      { nome: "Mensal → Anual", path: "/calculadora/mensal-anual" },
      { nome: "Anual → Mensal", path: "/calculadora/anual-mensal" },
      { nome: "Porcentagem", path: "/calculadora/porcentagem" },
    ],
  },
  {
    titulo: "Trabalhista",
    icon: <Briefcase className="w-5 h-5 text-blue-600" />,
    color: "bg-blue-600",
    border: "border-blue-100",
    bg: "bg-blue-50/30",
    items: [
      { nome: "Salário Líquido", path: "/calculadora/salario-liquido" },
      { nome: "Décimo Terceiro", path: "/calculadora/decimo-terceiro" },
      { nome: "Férias", path: "/calculadora/ferias" },
      { nome: "Férias Proporcionais", path: "/calculadora/ferias-proporcionais" },
      { nome: "FGTS", path: "/calculadora/fgts" },
      { nome: "Rescisão", path: "/calculadora/rescisao" },
      { nome: "Hora Extra", path: "/calculadora/hora-extra" },
    ],
  },
  {
    titulo: "Crédito e Financiamento",
    icon: <Calculator className="w-5 h-5 text-violet-600" />,
    color: "bg-violet-600",
    border: "border-violet-100",
    bg: "bg-violet-50/30",
    items: [
      { nome: "Empréstimo", path: "/calculadora/emprestimo" },
      { nome: "Financiamento Veículo", path: "/calculadora/financiamento-veiculo" },
      { nome: "Taxa Equivalente", path: "/calculadora/taxa-equivalente" },
    ],
  },
  {
    titulo: "Utilidades",
    icon: <Calculator className="w-5 h-5 text-slate-600" />,
    color: "bg-slate-600",
    border: "border-slate-100",
    bg: "bg-slate-50/30",
    items: [
      { nome: "Regra de Três", path: "/calculadora/regra-tres" },
      { nome: "Contador de Dias", path: "/calculadora/contador-dias" },
      { nome: "Dias que Faltam", path: "/calculadora/dias-faltam" },
    ],
  },
];

export default function CalculadoraMenu() {
  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Cabeçalho com Botão Arrojado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Calculadoras</h1>
          <p className="text-slate-500 mt-1">Ferramentas para facilitar seus cálculos diários</p>
        </div>

        {/* Botão de Voltar para o Menu de Blocos (MobileNav) */}
        <Link
          to="/" 
          className="flex items-center gap-3 px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg text-white hover:bg-primary transition-all group active:scale-95 w-fit"
        >
          <div className="bg-white/10 p-1.5 rounded-lg">
            <LayoutGrid size={20} className="text-white" />
          </div>
          <span className="font-bold text-sm">Menu Principal</span>
          <ArrowLeft size={18} className="ml-1 opacity-50 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Grid de Categorias - Layout Original */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {categorias.map((cat, idx) => (
          <div key={idx} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 font-bold text-lg border-b border-slate-200 pb-2">
              {cat.icon}
              <span className="text-slate-800">{cat.titulo}</span>
            </div>

            <div className="grid gap-3">
              {cat.items.map((item, i) => (
                <Link
                  key={i}
                  to={item.path}
                  className={`flex justify-between items-center p-4 rounded-xl border ${cat.border} ${cat.bg} hover:bg-white hover:shadow-md transition-all group active:scale-[0.98]`}
                >
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                    {item.nome}
                  </span>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}