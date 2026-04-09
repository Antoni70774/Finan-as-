import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DecimoTerceiro() {
  const [salario, setSalario] = useState("");
  const [dependentes, setDependentes] = useState("0");
  const [meses, setMeses] = useState("12");
  const [parcela, setParcela] = useState("unica");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const s = parseFloat(salario) || 0;
    const d = parseInt(dependentes, 10) || 0;
    const m = parseInt(meses, 10) || 0;

    const bruto = (s / 12) * m;
    let parcela1 = bruto;
    let parcela2 = 0;

    if (parcela === "duas") {
      parcela1 = bruto / 2; // primeira sem descontos
      parcela2 = bruto / 2; // segunda com descontos
    }

    setResult([
      { label: "Salário Base", value: `R$ ${s.toFixed(2)}` },
      { label: "Meses Trabalhados", value: `${m} meses` },
      { label: "Dependentes", value: `${d}` },
      { label: "Valor Bruto", value: `R$ ${bruto.toFixed(2)}` },
      { label: "Parcela 1", value: `R$ ${parcela1.toFixed(2)}` },
      ...(parcela === "duas"
        ? [{ label: "Parcela 2 (com descontos)", value: `R$ ${parcela2.toFixed(2)}` }]
        : []),
      { label: "Nota", value: "Na 2ª parcela incidem descontos de INSS/IRRF." },
    ]);
  };

  const limpar = () => {
    setSalario("");
    setDependentes("0");
    setMeses("12");
    setParcela("unica");
    setResult(null);
  };

  return (
    <CalcLayout title="13º Salário">
      <div className="space-y-4">
        <CalcField
          label="Salário Bruto (R$)"
          value={salario}
          onChange={setSalario}
          placeholder="Ex: 2100"
        />
        <CalcField
          label="Número de Dependentes"
          value={dependentes}
          onChange={setDependentes}
          type="number"
          min="0"
        />
        <CalcField
          label="Meses Trabalhados"
          value={meses}
          onChange={setMeses}
          type="number"
          min="1"
          max="12"
        />

        <div className="w-full">
          <label className="text-sm font-medium text-slate-700 mb-1 block">Parcela</label>
          <Select value={parcela} onValueChange={setParcela}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unica">Única</SelectItem>
              <SelectItem value="duas">2 Parcelas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botões lado a lado, padronizados */}
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
