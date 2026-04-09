import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CalcLayout({ title, children }) {
  return (
    <div className="p-4 md:p-8 w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Botão de Voltar - Ocupa toda a linha no topo */}
      <div className="mb-6">
        <Link 
          to="/calculadora" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-medium group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Calculadoras</span>
        </Link>
      </div>

      {/* Título da Calculadora Específica */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      </div>

      {/* Onde o conteúdo da calculadora (inputs/botões) vai aparecer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {children}
      </div>
    </div>
  );
}