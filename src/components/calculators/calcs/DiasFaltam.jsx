import React, { useState } from "react";
import { CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

export default function DiasFaltam() {
  const [dataCustom, setDataCustom] = useState("");
  const [evento, setEvento] = useState("");
  const [result, setResult] = useState(null);

  // Datas fixas corrigidas (usando new Date com ano, mês, dia)
  const eventosFixos = {
    "Natal": new Date(2026, 11, 25),
    "Ano Novo": new Date(2027, 0, 1),
    "Dia das Mães": new Date(2026, 4, 10),
    "Dia dos Pais": new Date(2026, 7, 9),
    "Carnaval": new Date(2027, 1, 9),
    "Dia da Mulher": new Date(2026, 2, 8),
    "Dia dos Namorados": new Date(2026, 5, 12),
    "Dia das Crianças": new Date(2026, 9, 12),
  };

  const calcular = () => {
    let dataFinal = null;

    if (evento && eventosFixos[evento]) {
      dataFinal = eventosFixos[evento];
    } else if (dataCustom) {
      // Corrige também a data customizada
      dataFinal = new Date(dataCustom + "T00:00:00");
    }

    if (!dataFinal) return;

    const hoje = new Date();
    const dias = differenceInDays(dataFinal, hoje);

    setResult([
      { label: "Evento", value: evento || "Data personalizada" },
      { label: "Data escolhida", value: dataFinal.toLocaleDateString("pt-BR") },
      { label: "Dias que faltam", value: `${dias} dias` },
    ]);
  };

  const limpar = () => {
    setEvento("");
    setDataCustom("");
    setResult(null);
  };

  return (
    <CalcLayout title="Quantos dias faltam">
      <div className="space-y-6">
        {/* Lista de eventos */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Selecione um evento</label>
          <select
            value={evento}
            onChange={(e) => setEvento(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          >
            <option value="">-- Escolha um evento --</option>
            {Object.keys(eventosFixos).map((ev, i) => (
              <option key={i} value={ev}>{ev}</option>
            ))}
          </select>
        </div>

        {/* Inserir data personalizada */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Ou insira uma data</label>
          <input
            type="date"
            value={dataCustom}
            onChange={(e) => setDataCustom(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          />
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
