import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";

export default function AnualMensal() {
  const [taxaAnual, setTaxaAnual] = useState("");
  const [taxaMensal, setTaxaMensal] = useState("");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const a = parseFloat(taxaAnual) / 100 || 0;
    const mensal = (Math.pow(1 + a, 1 / 12) - 1) * 100;

    setTaxaMensal(mensal.toFixed(4));

    setResult([
      { label: "Taxa de Juros Anual", value: `${parseFloat(taxaAnual || 0).toFixed(4)} %` },
      { label: "Taxa de Juros Mensal Equivalente", value: `${mensal.toFixed(4)} %` },
    ]);
  };

  const limpar = () => {
    setTaxaAnual("");
    setTaxaMensal("");
    setResult(null);
  };

  return (
    <CalcLayout title="Converter Taxa de Juros Anual em Mensal">
      <div className="space-y-4">
        {/* Onde inserir os valores */}
        <CalcField
          label="Taxa de Juros Anual (%)"
          value={taxaAnual}
          onChange={setTaxaAnual}
          placeholder="Digite a taxa anual, ex: 12"
        />

        <CalcField
          label="Taxa de Juros Mensal (%)"
          value={taxaMensal}
          onChange={setTaxaMensal}
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
