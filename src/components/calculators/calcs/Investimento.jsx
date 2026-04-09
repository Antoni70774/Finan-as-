import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";

export default function Investimento() {
  const [tipo, setTipo] = useState("tesouro");
  const [fixacao, setFixacao] = useState("pre");
  const [aporte, setAporte] = useState("");
  const [aporteMensal, setAporteMensal] = useState("");
  const [prazo, setPrazo] = useState("0");
  const [taxa, setTaxa] = useState("");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const P = parseFloat(aporte) || 0;
    const am = parseFloat(aporteMensal) || 0;
    const r = parseFloat(taxa) / 100;
    const anos = parseInt(prazo) || 0;
    const n = anos * 12;

    let montante = P * Math.pow(1 + r, n);
    for (let i = 1; i <= n; i++) {
      montante += am * Math.pow(1 + r, n - i + 1);
    }

    const totalInvestido = P + am * n;
    const rendimento = montante - totalInvestido;

    setResult([
      { label: "Tipo de Investimento", value: tipo.toUpperCase() },
      { label: "Fixação", value: fixacao.toUpperCase() },
      { label: "Total Investido", value: `R$ ${totalInvestido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { label: "Rendimento", value: `R$ ${rendimento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { label: "Montante Final", value: `R$ ${montante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "text-green-600 font-bold" },
    ]);
  };

  const limpar = () => {
    setTipo("tesouro");
    setFixacao("pre");
    setAporte("");
    setAporteMensal("");
    setPrazo("0");
    setTaxa("");
    setResult(null);
  };

  return (
    <CalcLayout title="Investimento">
      <div className="space-y-4">
        {/* Tipo de investimento */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo de investimento</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          >
            <option value="cdb">CDB/LC/Títulos públicos/Debêntures</option>
            <option value="lci">LCI/LCA</option>
            <option value="tesouro">Tesouro</option>
          </select>
        </div>

        {/* Fixação */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">É PRÉ fixado ou PÓS fixado?</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" value="pre" checked={fixacao === "pre"} onChange={(e) => setFixacao(e.target.value)} />
              PRÉ
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="pos" checked={fixacao === "pos"} onChange={(e) => setFixacao(e.target.value)} />
              PÓS
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="ipca" checked={fixacao === "ipca"} onChange={(e) => setFixacao(e.target.value)} />
              IPCA
            </label>
          </div>
        </div>

        {/* Campos numéricos */}
        <CalcField label="Investimento Inicial (R$)" value={aporte} onChange={setAporte} placeholder="Ex: 5000" />
        <CalcField label="Investimento Mensal (R$)" value={aporteMensal} onChange={setAporteMensal} placeholder="Ex: 500" />
        <CalcField label="Prazo (Anos)" value={prazo} onChange={setPrazo} placeholder="Ex: 2" step="1" />
        <CalcField label="Rentabilidade (% Anual)" value={taxa} onChange={setTaxa} placeholder="Ex: 12" />

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
