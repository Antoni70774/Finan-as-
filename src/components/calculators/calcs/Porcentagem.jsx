import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";

export default function Porcentagem() {
  // Estados para cada cálculo
  const [pct, setPct] = useState("");
  const [valorPct, setValorPct] = useState("");
  const [resPct, setResPct] = useState(null);

  const [valorA, setValorA] = useState("");
  const [valorB, setValorB] = useState("");
  const [resQuantoPct, setResQuantoPct] = useState(null);

  const [valorOrigAum, setValorOrigAum] = useState("");
  const [valorNovoAum, setValorNovoAum] = useState("");
  const [resAumento, setResAumento] = useState(null);

  const [valorOrigDesc, setValorOrigDesc] = useState("");
  const [valorNovoDesc, setValorNovoDesc] = useState("");
  const [resDesconto, setResDesconto] = useState(null);

  // Funções de cálculo
  const calcPctDe = () => {
    const p = parseFloat(pct) || 0;
    const v = parseFloat(valorPct) || 0;
    const resultado = (p / 100) * v;
    setResPct([{ label: `${p}% de ${v}`, value: resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }]);
  };

  const calcQuantoPct = () => {
    const a = parseFloat(valorA) || 0;
    const b = parseFloat(valorB) || 0;
    const resultado = (a / b) * 100;
    setResQuantoPct([{ label: `${a} é quanto % de ${b}?`, value: `${resultado.toFixed(2)} %` }]);
  };

  const calcAumento = () => {
    const orig = parseFloat(valorOrigAum) || 0;
    const novo = parseFloat(valorNovoAum) || 0;
    const aumento = ((novo - orig) / orig) * 100;
    setResAumento([
      { label: "Valor Original", value: orig.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Valor Novo", value: novo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Aumento Percentual", value: `${aumento.toFixed(2)} %` },
    ]);
  };

  const calcDesconto = () => {
    const orig = parseFloat(valorOrigDesc) || 0;
    const novo = parseFloat(valorNovoDesc) || 0;
    const desconto = ((orig - novo) / orig) * 100;
    setResDesconto([
      { label: "Valor Original", value: orig.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Valor Novo", value: novo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Desconto Percentual", value: `${desconto.toFixed(2)} %` },
    ]);
  };

  return (
    <CalcLayout title="Simulador de Porcentagem">
      <div className="space-y-8">
        
        {/* Cálculo 1: X% de Y */}
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-700">Cálculo 1: Quanto é % de um valor</h2>
          <CalcField label="Quanto é (%)" value={pct} onChange={setPct} placeholder="Ex: 15" />
          <CalcField label="De (valor R$)" value={valorPct} onChange={setValorPct} placeholder="Ex: 200" />
          <div className="flex gap-3">
            <CalcButton onClick={calcPctDe} />
            <Button variant="outline" onClick={() => { setPct(""); setValorPct(""); setResPct(null); }}>Limpar</Button>
          </div>
          <CalcResult results={resPct} />
        </div>

        {/* Cálculo 2: X é quanto % de Y */}
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-700">Cálculo 2: Qual porcentagem</h2>
          <CalcField label="O valor R$" value={valorA} onChange={setValorA} placeholder="Ex: 50" />
          <CalcField label="É qual porcentagem de R$" value={valorB} onChange={setValorB} placeholder="Ex: 200" />
          <div className="flex gap-3">
            <CalcButton onClick={calcQuantoPct} />
            <Button variant="outline" onClick={() => { setValorA(""); setValorB(""); setResQuantoPct(null); }}>Limpar</Button>
          </div>
          <CalcResult results={resQuantoPct} />
        </div>

        {/* Cálculo 3: Aumento percentual */}
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-700">Cálculo 3: Aumento Percentual</h2>
          <CalcField label="Um valor de R$" value={valorOrigAum} onChange={setValorOrigAum} placeholder="Ex: 100" />
          <CalcField label="Que aumentou para R$" value={valorNovoAum} onChange={setValorNovoAum} placeholder="Ex: 120" />
          <div className="flex gap-3">
            <CalcButton onClick={calcAumento} />
            <Button variant="outline" onClick={() => { setValorOrigAum(""); setValorNovoAum(""); setResAumento(null); }}>Limpar</Button>
          </div>
          <CalcResult results={resAumento} />
        </div>

        {/* Cálculo 4: Diminuição percentual */}
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-700">Cálculo 4: Diminuição Percentual</h2>
          <CalcField label="Um valor de R$" value={valorOrigDesc} onChange={setValorOrigDesc} placeholder="Ex: 100" />
          <CalcField label="Que diminuiu para R$" value={valorNovoDesc} onChange={setValorNovoDesc} placeholder="Ex: 80" />
          <div className="flex gap-3">
            <CalcButton onClick={calcDesconto} />
            <Button variant="outline" onClick={() => { setValorOrigDesc(""); setValorNovoDesc(""); setResDesconto(null); }}>Limpar</Button>
          </div>
          <CalcResult results={resDesconto} />
        </div>

      </div>
    </CalcLayout>
  );
}
