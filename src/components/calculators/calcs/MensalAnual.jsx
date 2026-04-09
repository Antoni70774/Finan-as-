import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";

export default function MensalAnual() {
  const [taxaMensal, setTaxaMensal] = useState("");
  const [taxaAnual, setTaxaAnual] = useState("");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const m = parseFloat(taxaMensal) / 100 || 0;
    const anual = (Math.pow(1 + m, 12) - 1) * 100;

    setTaxaAnual(anual.toFixed(4));

    setResult([
      { label: "Taxa de Juros Mensal", value: `${parseFloat(taxaMensal || 0).toFixed(4)} %` },
      { label: "Taxa de Juros Anual Equivalente", value: `${anual.toFixed(4)} %` },
    ]);
  };

  const limpar = () => {
    setTaxaMensal("");
    setTaxaAnual("");
    setResult(null);
  };

  return (
    <CalcLayout title="Converter Taxa de Juros Mensal em Anual">
      <div className="space-y-4">
        {/* Onde inserir os valores */}
        <CalcField
          label="Taxa de Juros Mensal (%)"
          value={taxaMensal}
          onChange={setTaxaMensal}
          placeholder="Digite a taxa mensal, ex: 1.5"
        />

        <CalcField
          label="Taxa de Juros Anual (%)"
          value={taxaAnual}
          onChange={setTaxaAnual}
          placeholder="Resultado aparecerá aqui"
          disabled
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
