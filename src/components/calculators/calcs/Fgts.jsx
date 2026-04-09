import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";

export default function Fgts() {
  const [salario, setSalario] = useState("");
  const [saldoAnterior, setSaldoAnterior] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [corrigido, setCorrigido] = useState(false);
  const [result, setResult] = useState(null);

  const calcular = () => {
    const s = parseFloat(salario) || 0;
    const saldoAnt = parseFloat(saldoAnterior) || 0;

    if (!dataInicial || !dataFinal) return;

    // Usando input type="month" => formato yyyy-mm
    const [anoIni, mesIni] = dataInicial.split("-").map(Number);
    const [anoFim, mesFim] = dataFinal.split("-").map(Number);

    const m = (anoFim - anoIni) * 12 + (mesFim - mesIni) + 1;
    if (m <= 0) return;

    const depositoMensal = s * 0.08;
    const totalFgts = depositoMensal * m;
    const correcao = corrigido ? totalFgts * 0.03 * (m / 12) : 0;
    const saldoFinal = saldoAnt + totalFgts + correcao;

    setResult([
      { label: "Depósito Mensal (8%)", value: `R$ ${depositoMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { label: "Total Depositado", value: `R$ ${totalFgts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { label: "Correção Estimada", value: `R$ ${correcao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { label: "Saldo Final FGTS", value: `R$ ${saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "text-green-600 font-bold" },
    ]);
  };

  const limpar = () => {
    setSalario("");
    setSaldoAnterior("");
    setDataInicial("");
    setDataFinal("");
    setCorrigido(false);
    setResult(null);
  };

  return (
    <CalcLayout title="FGTS">
      <div className="space-y-4">
        <CalcField 
          label="Salário Bruto (R$)" 
          value={salario} 
          onChange={setSalario} 
          placeholder="Ex: 2500" 
        />
        <CalcField 
          label="Saldo Já Existente (R$)" 
          value={saldoAnterior} 
          onChange={setSaldoAnterior} 
          placeholder="Ex: 0" 
        />
        <CalcField 
          label="Início (MM/AAAA)" 
          value={dataInicial} 
          onChange={setDataInicial} 
          type="month" 
        />
        <CalcField 
          label="Fim (MM/AAAA)" 
          value={dataFinal} 
          onChange={setDataFinal} 
          type="month" 
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={corrigido}
            onChange={(e) => setCorrigido(e.target.checked)}
            className="w-4 h-4 border rounded"
          />
          <label className="text-sm text-slate-700">Calcular correção estimada (3% a.a.)</label>
        </div>

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
