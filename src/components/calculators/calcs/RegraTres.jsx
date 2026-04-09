import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";

export default function RegraTres() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const va = parseFloat(a);
    const vb = parseFloat(b);
    const vc = parseFloat(c);
    const x = (vb * vc) / va;

    setResult([
      { label: "Valor de X", value: x.toFixed(2), color: "text-blue-600 font-bold" },
      { label: "Sentença", value: `${va} está para ${vb}, assim como ${vc} está para ${x.toFixed(2)}` }
    ]);
  };

  return (
    <CalcLayout title="Regra de Três">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 items-end">
          <CalcField label="Se valor A" value={a} onChange={setA} placeholder="Ex: 100" />
          <CalcField label="está para B" value={b} onChange={setB} placeholder="Ex: 50" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-end">
          <CalcField label="Então C" value={c} onChange={setC} placeholder="Ex: 200" />
          <div className="p-3 text-center font-bold text-slate-400">está para X</div>
        </div>
        <CalcButton onClick={calcular} />
        <CalcResult results={result} />
      </div>
    </CalcLayout>
  );
}