import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function JurosComposto() {
  const [capital, setCapital] = useState("");
  const [aporte, setAporte] = useState("");
  const [taxa, setTaxa] = useState("");
  const [tempo, setTempo] = useState("");
  const [tipoTaxa, setTipoTaxa] = useState("mensal"); // mensal ou anual
  const [tipoTempo, setTipoTempo] = useState("meses"); // meses ou anos
  const [result, setResult] = useState(null);

  const calcular = () => {
    const C = parseFloat(capital) || 0;
    const A = parseFloat(aporte) || 0;
    let i = (parseFloat(taxa) || 0) / 100;
    let t = parseFloat(tempo) || 0;

    // Ajusta taxa e tempo conforme seleção
    if (tipoTaxa === "anual") {
      i = i / 12; // converte taxa anual para mensal
    }
    if (tipoTempo === "anos") {
      t = t * 12; // converte anos para meses
    }

    // Fórmula de juros compostos com aportes mensais
    // Montante = C*(1+i)^t + A * [((1+i)^t - 1) / i]
    const montante = C * Math.pow(1 + i, t) + (A > 0 && i > 0 ? A * ((Math.pow(1 + i, t) - 1) / i) : A * t);
    const juros = montante - (C + A * t);

    setResult([
      { label: "Valor Inicial", value: `R$ ${C.toFixed(2)}` },
      { label: "Aporte Mensal", value: `R$ ${A.toFixed(2)}` },
      { label: "Total em Juros", value: `R$ ${juros.toFixed(2)}`, color: "text-blue-600" },
      { label: "Montante Final", value: `R$ ${montante.toFixed(2)}`, color: "text-green-600 font-bold" },
    ]);
  };

  return (
    <CalcLayout title="Juros Compostos">
      <div className="space-y-4">
        <CalcField
          label="Valor Inicial (R$)"
          value={capital}
          onChange={setCapital}
          placeholder="Ex: 1000"
        />

        <CalcField
          label="Valor Mensal (R$)"
          value={aporte}
          onChange={setAporte}
          placeholder="Ex: 200"
        />

        <div className="flex gap-2 items-end">
          <CalcField
            label="Taxa de Juros (%)"
            value={taxa}
            onChange={setTaxa}
            placeholder="Ex: 5"
          />
          <div className="w-32">
            <label className="text-sm text-slate-600">Tipo da Taxa</label>
            <Select value={tipoTaxa} onValueChange={setTipoTaxa}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <CalcField
            label="Período"
            value={tempo}
            onChange={setTempo}
            placeholder="Ex: 12"
          />
          <div className="w-32">
            <label className="text-sm text-slate-600">Período em</label>
            <Select value={tipoTempo} onValueChange={setTipoTempo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meses">Meses</SelectItem>
                <SelectItem value="anos">Anos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CalcButton onClick={calcular} />
        <CalcResult results={result} />
      </div>
    </CalcLayout>
  );
}
