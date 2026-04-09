import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Emprestimo() {
  const [tipo, setTipo] = useState("pessoal");
  const [valor, setValor] = useState("");
  const [taxa, setTaxa] = useState("");
  const [periodo, setPeriodo] = useState("mensal");
  const [parcelas, setParcelas] = useState("");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const P = parseFloat(valor) || 0;
    let r = parseFloat(taxa) / 100 || 0;
    const n = parseFloat(parcelas) || 0;

    // Ajusta taxa se for anual
    if (periodo === "anual") {
      r = Math.pow(1 + r, 1 / 12) - 1;
    }

    // Sistema Price
    const parcela = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPago = parcela * n;
    const totalJuros = totalPago - P;
    const cet = ((totalPago / P - 1) / (n / 12)) * 100;

    setResult([
      { label: "Tipo de Empréstimo", value: tipo },
      { label: "Valor do Empréstimo", value: P.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Parcela Mensal", value: parcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Total a Pagar", value: totalPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Total de Juros", value: totalJuros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "CET Estimado ao Ano", value: `${cet.toFixed(2)} %` },
    ]);
  };

  const limpar = () => {
    setTipo("pessoal");
    setValor("");
    setTaxa("");
    setPeriodo("mensal");
    setParcelas("");
    setResult(null);
  };

  return (
    <CalcLayout title="Simulador de Empréstimo">
      <div className="space-y-4">
        {/* Tipo de empréstimo */}
        <div className="space-y-1.5">
          <Label className="text-sm">Qual o tipo de empréstimo desejado?</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pessoal">Pessoal</SelectItem>
              <SelectItem value="fgts">FGTS</SelectItem>
              <SelectItem value="consignado">Consignado</SelectItem>
              <SelectItem value="garantia">Com Garantia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CalcField label="Valor do Empréstimo (R$)" value={valor} onChange={setValor} placeholder="Ex: 10000" />

        {/* Taxa de juros + período */}
        <div className="flex gap-3">
          <div className="flex-1">
            <CalcField label="Taxa de Juros" value={taxa} onChange={setTaxa} placeholder="Ex: 2.5" />
          </div>
          <div className="w-32">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CalcField label="Número de Parcelas" value={parcelas} onChange={setParcelas} placeholder="Ex: 24" step="1" />

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
