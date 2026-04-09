import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import { differenceInDays, differenceInMonths, differenceInYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react"; // ícone de seta

export default function ContadorDias() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const calc = () => {
    const d1 = new Date(dataInicio + "T00:00:00");
    const d2 = new Date(dataFim + "T00:00:00");
    const dias = Math.abs(differenceInDays(d2, d1));
    const meses = Math.abs(differenceInMonths(d2, d1));
    const anos = Math.abs(differenceInYears(d2, d1));
    const semanas = Math.floor(dias / 7);

    setResult([
      { label: "Dias", value: `${dias} dias` },
      { label: "Semanas", value: `${semanas} semanas` },
      { label: "Meses", value: `${meses} meses` },
      { label: "Anos", value: `${anos} anos` },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Botão voltar igual à imagem */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 font-medium mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Calculadoras
      </button>

      <CalcField label="Data Inicial" value={dataInicio} onChange={setDataInicio} type="date" />
      <CalcField label="Data Final" value={dataFim} onChange={setDataFim} type="date" />
      <CalcButton onClick={calc} />
      <CalcResult results={result} />
    </div>
  );
}
