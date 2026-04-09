import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";

export default function FinanciamentoVeiculo() {
  const [valorVeiculo, setValorVeiculo] = useState("");
  const [entrada, setEntrada] = useState("");
  const [taxa, setTaxa] = useState("");
  const [parcelas, setParcelas] = useState("");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const V = parseFloat(valorVeiculo) || 0;
    const E = parseFloat(entrada) || 0;
    const P = V - E; // valor financiado
    const r = (parseFloat(taxa) || 0) / 100;
    const n = parseFloat(parcelas) || 0;

    // Sistema Price
    const parcela = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPago = parcela * n + E;
    const totalJuros = totalPago - V;

    setResult([
      { label: "Valor do Veículo", value: V.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Entrada", value: E.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Valor Financiado", value: P.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Parcela Mensal", value: parcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Total a Pagar", value: totalPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Total de Juros", value: totalJuros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
    ]);
  };

  const limpar = () => {
    setValorVeiculo("");
    setEntrada("");
    setTaxa("");
    setParcelas("");
    setResult(null);
  };

  return (
    <CalcLayout title="Financiamento de Veículo">
      <div className="space-y-4">
        <CalcField
          label="Valor do Veículo (R$)"
          value={valorVeiculo}
          onChange={setValorVeiculo}
          placeholder="Ex: 50000"
        />
        <CalcField
          label="Entrada (R$)"
          value={entrada}
          onChange={setEntrada}
          placeholder="Ex: 10000"
        />
        <CalcField
          label="Taxa de Juros Mensal (%)"
          value={taxa}
          onChange={setTaxa}
          placeholder="Ex: 1.5"
        />
        <CalcField
          label="Número de Parcelas"
          value={parcelas}
          onChange={setParcelas}
          placeholder="Ex: 48"
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
