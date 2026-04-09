import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TaxaEquivalente() {
  const [taxa, setTaxa] = useState("");
  const [origem, setOrigem] = useState("mensal");
  const [destino, setDestino] = useState("anual");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const i = parseFloat(taxa) / 100 || 0;

    // Definição dos períodos em meses
    const periodos = {
      diario: 30,
      mensal: 1,
      bimestral: 2,
      trimestral: 3,
      semestral: 6,
      anual: 12,
    };

    const po = periodos[origem];
    const pd = periodos[destino];

    // Fórmula da taxa equivalente
    const equivalente = Math.pow(1 + i, pd / po) - 1;

    setResult([
      { label: "Taxa informada", value: `${taxa}% (${origem})` },
      { label: "Taxa equivalente", value: `${(equivalente * 100).toFixed(4)}% (${destino})` },
    ]);
  };

  const limpar = () => {
    setTaxa("");
    setOrigem("mensal");
    setDestino("anual");
    setResult(null);
  };

  return (
    <CalcLayout title="Taxa Equivalente">
      <div className="space-y-4">
        <CalcField
          label="Taxa (%)"
          value={taxa}
          onChange={setTaxa}
          placeholder="Ex: 2.5"
        />

        {/* Origem */}
        <div className="space-y-1.5">
          <Label className="text-sm">Período de Origem</Label>
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diário</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="bimestral">Bimestral</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Destino */}
        <div className="space-y-1.5">
          <Label className="text-sm">Período de Destino</Label>
          <Select value={destino} onValueChange={setDestino}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diário</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="bimestral">Bimestral</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
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
