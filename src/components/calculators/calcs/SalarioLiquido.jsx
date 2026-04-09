import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";

export default function SalarioLiquido() {
  const [salarioBruto, setSalarioBruto] = useState("");
  const [dependentes, setDependentes] = useState("0");
  const [outrosDescontos, setOutrosDescontos] = useState("0");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const bruto = parseFloat(salarioBruto) || 0;
    const dep = parseInt(dependentes) || 0;
    const desc = parseFloat(outrosDescontos) || 0;

    // Cálculo INSS (Simplificado para o exemplo)
    let inss = 0;
    if (bruto <= 1412) inss = bruto * 0.075;
    else if (bruto <= 2666.68) inss = bruto * 0.09 - 21.18;
    else if (bruto <= 4000.03) inss = bruto * 0.12 - 101.18;
    else inss = Math.min(bruto * 0.14 - 181.18, 908.85);

    // Cálculo IRRF
    const baseIRRF = bruto - inss - (dep * 189.59);
    let irrf = 0;
    if (baseIRRF > 2259.20 && baseIRRF <= 2826.65) irrf = baseIRRF * 0.075 - 169.44;
    else if (baseIRRF > 2826.65 && baseIRRF <= 3751.05) irrf = baseIRRF * 0.15 - 381.44;
    else if (baseIRRF > 3751.05 && baseIRRF <= 4664.68) irrf = baseIRRF * 0.225 - 662.77;
    else if (baseIRRF > 4664.68) irrf = baseIRRF * 0.275 - 896.00;

    const liquido = bruto - inss - irrf - desc;

    setResult([
      { label: "Salário Bruto", value: `R$ ${bruto.toFixed(2)}` },
      { label: "Desconto INSS", value: `- R$ ${inss.toFixed(2)}`, color: "text-red-500" },
      { label: "Desconto IRRF", value: `- R$ ${irrf.toFixed(2)}`, color: "text-red-500" },
      { label: "Salário Líquido", value: `R$ ${liquido.toFixed(2)}`, color: "text-green-600 font-bold" },
    ]);
  };

  return (
    <CalcLayout title="Salário Líquido">
      <div className="space-y-4">
        <CalcField label="Salário Bruto (R$)" value={salarioBruto} onChange={setSalarioBruto} placeholder="Ex: 3500" />
        <CalcField label="Nº de Dependentes" value={dependentes} onChange={setDependentes} type="number" />
        <CalcField label="Outros Descontos (R$)" value={outrosDescontos} onChange={setOutrosDescontos} />
        <CalcButton onClick={calcular} />
        <CalcResult results={result} />
      </div>
    </CalcLayout>
  );
}