import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";

export default function Poupanca() {
  const [valorInicial, setValorInicial] = useState("");
  const [valorMensal, setValorMensal] = useState("");
  const [anos, setAnos] = useState("");
  const [taxa, setTaxa] = useState("6.167"); // taxa anual fixa exibida
  const [result, setResult] = useState(null);

  const calcular = () => {
    const v = parseFloat(valorInicial) || 0;
    const vm = parseFloat(valorMensal) || 0;
    const a = parseInt(anos) || 0;

    const meses = a * 12;
    const taxaMensal = 0.005; // 0,5% ao mês
    let montante = v * Math.pow(1 + taxaMensal, meses);

    for (let i = 1; i <= meses; i++) {
      montante += vm * Math.pow(1 + taxaMensal, meses - i + 1);
    }

    const totalInvestido = v + vm * meses;
    const rendimento = montante - totalInvestido;

    setResult([
      { label: "Valor Inicial", value: v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Valor Mensal", value: vm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Período", value: `${a} anos (${meses} meses)` },
      { label: "Total Investido", value: totalInvestido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Rendimento Bruto", value: rendimento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Montante Final", value: montante.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), color: "text-green-600 font-bold" },
      { label: "Rendimento da Poupança", value: `${taxa}% ao ano (0,5% ao mês)` },
    ]);
  };

  const limpar = () => {
    setValorInicial("");
    setValorMensal("");
    setAnos("");
    setTaxa("6.167");
    setResult(null);
  };

  return (
    <CalcLayout title="Simulador da Poupança">
      <div className="space-y-4">
        {/* Onde inserir os valores */}
        <CalcField 
          label="Valor Inicial (R$)" 
          value={valorInicial} 
          onChange={setValorInicial} 
          placeholder="Digite o valor inicial em reais, ex: 40000" 
        />

        <CalcField 
          label="Valor Mensal (R$)" 
          value={valorMensal} 
          onChange={setValorMensal} 
          placeholder="Digite o valor mensal em reais, ex: 200" 
        />

        <CalcField 
          label="Rendimento da Poupança (% Anual)" 
          value={taxa} 
          onChange={setTaxa} 
          placeholder="6,167" 
          disabled 
        />
        <p className="text-xs text-slate-500">Poupança rende 0,5% ao mês</p>

        <CalcField 
          label="Período (anos)" 
          value={anos} 
          onChange={setAnos} 
          placeholder="Digite o período em anos, ex: 1" 
          step="1" 
        />

        {/* Botões lado a lado */}
        <div className="flex gap-3 pt-3">
          <div className="flex-1">
            <CalcButton onClick={calcular} />
          </div>
          <Button
            variant="outline"
            onClick={limpar}
            className="flex-1 h-10 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Limpar
          </Button>
        </div>

        <CalcResult results={result} />
      </div>
    </CalcLayout>
  );
}
