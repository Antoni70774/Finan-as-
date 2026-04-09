import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";

export default function FeriasProporcionais() {
  const [salario, setSalario] = useState("");
  const [meses, setMeses] = useState("");
  const [result, setResult] = useState(null);

  const calc = () => {
    const s = parseFloat(salario) || 0;
    const m = parseFloat(meses) || 0;
    const proporcional = (s / 12) * m;
    const umTerco = proporcional / 3;
    const total = proporcional + umTerco;

    setResult([
      { label: "Meses Trabalhados", value: `${m} meses` },
      { label: "Férias Proporcionais", value: proporcional.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "1/3 Constitucional", value: umTerco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Total Bruto", value: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
    ]);
  };

  const limpar = () => {
    setSalario("");
    setMeses("");
    setResult(null);
  };

  return (
    <CalcLayout title="Férias Proporcionais">
      <div className="space-y-4">
        <CalcField
          label="Salário Bruto (R$)"
          value={salario}
          onChange={setSalario}
          placeholder="Ex: 3000"
        />
        <CalcField
          label="Meses Trabalhados"
          value={meses}
          onChange={setMeses}
          placeholder="Ex: 8"
          min="1"
          step="1"
        />

        {/* Botões lado a lado */}
        <div className="flex gap-3 pt-3">
          <div className="flex-1">
            <CalcButton onClick={calc} />
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
