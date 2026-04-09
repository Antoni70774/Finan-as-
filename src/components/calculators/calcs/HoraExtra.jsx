import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button"; // Importando o botão padrão para o "Limpar"

export default function HoraExtra() {
  const [salario, setSalario] = useState("");
  const [horasMes, setHorasMes] = useState("220");
  const [horasNormais, setHorasNormais] = useState("");
  const [horasNoturnas, setHorasNoturnas] = useState("");
  const [horasFeriados, setHorasFeriados] = useState("");
  const [result, setResult] = useState(null);

  const calcular = () => {
    const s = parseFloat(salario) || 0;
    const hMes = parseFloat(horasMes) || 1;
    const hNormais = parseFloat(horasNormais) || 0;
    const hNoturnas = parseFloat(horasNoturnas) || 0;
    const hFeriados = parseFloat(horasFeriados) || 0;

    const valorHora = s / hMes;

    // Cálculo dos adicionais
    const valorNormais = valorHora * 1.5 * hNormais; // 50%
    const valorNoturnas = (valorHora * 1.2) * 0.2 * hNoturnas; // Adicional Noturno (simplificado)
    const valorFeriados = valorHora * 2 * hFeriados; // 100%

    const totalExtras = valorNormais + valorNoturnas + valorFeriados;

    setResult([
      { label: "Valor da Hora Comum", value: `R$ ${valorHora.toFixed(2)}` },
      { label: "Subtotal Extras 50%", value: `R$ ${valorNormais.toFixed(2)}` },
      { label: "Subtotal Adic. Noturno", value: `R$ ${valorNoturnas.toFixed(2)}` },
      { label: "Subtotal 100% (Feriados)", value: `R$ ${valorFeriados.toFixed(2)}` },
      { label: "Total Bruto a Receber", value: `R$ ${totalExtras.toFixed(2)}`, color: "text-green-600 font-bold" },
    ]);
  };

  const limpar = () => {
    setSalario("");
    setHorasMes("220");
    setHorasNormais("");
    setHorasNoturnas("");
    setHorasFeriados("");
    setResult(null);
  };

  return (
    <CalcLayout title="Horas Extras">
      <div className="space-y-4">
        <CalcField label="Salário Base (R$)" value={salario} onChange={setSalario} placeholder="Ex: 2100" />
        <CalcField label="Jornada Mensal (Padrão 220h)" value={horasMes} onChange={setHorasMes} placeholder="Ex: 220" />
        <CalcField label="Qtd. Horas Extras (50%)" value={horasNormais} onChange={setHorasNormais} placeholder="Ex: 10" />
        <CalcField label="Qtd. Horas Extras (100%)" value={horasFeriados} onChange={setHorasFeriados} placeholder="Ex: 5" />
        <CalcField label="Qtd. Horas Adic. Noturno" value={horasNoturnas} onChange={setHorasNoturnas} placeholder="Ex: 0" />

        {/* Container Flex para botões padronizados */}
        <div className="flex gap-3 pt-3">
          <div className="flex-1">
            {/* CalcButton sem label para evitar duplicidade */}
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