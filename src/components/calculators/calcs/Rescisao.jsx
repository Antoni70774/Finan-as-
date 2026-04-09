import React, { useState } from "react";
import { CalcResult } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  parseISO, 
  getDaysInMonth, 
  getDate, 
  differenceInDays,
  startOfDay
} from "date-fns";

export default function Rescisao() {
  const [salario, setSalario] = useState("");
  const [dataContratacao, setDataContratacao] = useState("");
  const [dataDemissao, setDataDemissao] = useState("");
  const [motivo, setMotivo] = useState("dispensaSemJustaCausa");
  const [avisoPrevio, setAvisoPrevio] = useState("trabalhado");
  const [saldoFgts, setSaldoFgts] = useState("");
  const [feriasVencidas, setFeriasVencidas] = useState("0");
  const [dependentes, setDependentes] = useState("0"); // Campo incluído
  const [possuiFeriasAdq, setPossuiFeriasAdq] = useState(true);
  const [result, setResult] = useState(null);

  const calcular = () => {
    const s = parseFloat(salario.replace(",", ".")) || 0;
    const fgtsBase = parseFloat(saldoFgts.replace(",", ".")) || 0;
    const diasVencidos = parseInt(feriasVencidas) || 0;
    const numDep = parseInt(dependentes) || 0;
    
    if (!dataContratacao || !dataDemissao) return;

    const inicio = startOfDay(parseISO(dataContratacao));
    const fim = startOfDay(parseISO(dataDemissao));

    // Lógica de Verbas
    const diasNoMes = getDaysInMonth(fim);
    const saldoSalario = (s / diasNoMes) * getDate(fim);
    const totalDias = differenceInDays(fim, inicio);
    const avosFerias = Math.floor(totalDias / 30) + ((totalDias % 30) >= 15 ? 1 : 0);
    
    const temDireito = !["dispensaComJustaCausa"].includes(motivo);
    const valor13 = temDireito ? (s / 12) * (fim.getMonth() + (getDate(fim) >= 15 ? 1 : 0)) : 0;
    const feriasProp = temDireito ? (s / 12) * (avosFerias % 12) : 0;
    const valorVencidas = (s / 30) * diasVencidos;
    const terco = (feriasProp + valorVencidas) / 3;

    // Multa e Aviso
    let multaFgts = (motivo === "dispensaSemJustaCausa") ? fgtsBase * 0.4 : 0;
    if (motivo === "demissaoComumAcordo") multaFgts = fgtsBase * 0.2;

    // Dedução de Dependentes (R$ 189,59 por dependente no IRRF)
    const deducaoIRRF = numDep * 189.59;
    const descontosSimulados = Math.max(0, (saldoSalario + valor13) * 0.09 - (deducaoIRRF * 0.075));

    const total = saldoSalario + valor13 + feriasProp + valorVencidas + terco + multaFgts - descontosSimulados;

    setResult([
      { label: "Saldo de Salário", value: saldoSalario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "13º Salário", value: valor13.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Férias + 1/3", value: (feriasProp + valorVencidas + terco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Multa FGTS", value: multaFgts.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Total Aproximado", value: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), color: "text-[#7C3AED] font-black" },
    ]);
  };

  return (
    <CalcLayout title="Rescisão">
      <div className="bg-[#F9F7FF] p-6 rounded-2xl space-y-4 max-w-md mx-auto">
        
        {/* Salário Bruto */}
        <div className="space-y-1">
          <Label className="text-slate-600 text-sm">Salário bruto</Label>
          <div className="flex h-12 w-full rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-100 px-4 flex items-center text-slate-500 font-bold border-r border-slate-200">R$</div>
            <input 
              className="flex-1 px-4 outline-none" 
              value={salario} 
              onChange={(e) => setSalario(e.target.value)} 
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-slate-600 text-sm">Data de contratação</Label>
          <input type="date" className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white outline-none" value={dataContratacao} onChange={(e) => setDataContratacao(e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label className="text-slate-600 text-sm">Data de demissão</Label>
          <input type="date" className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white outline-none" value={dataDemissao} onChange={(e) => setDataDemissao(e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label className="text-slate-600 text-sm">Motivo</Label>
          <Select value={motivo} onValueChange={setMotivo}>
            <SelectTrigger className="h-12 rounded-lg border-slate-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demissaoComumAcordo">Demissão de comum acordo</SelectItem>
              <SelectItem value="dispensaSemJustaCausa">Dispensa sem justa causa</SelectItem>
              <SelectItem value="dispensaComJustaCausa">Dispensa com justa causa</SelectItem>
              <SelectItem value="pedidoDemissao">Pedido de demissão</SelectItem>
              <SelectItem value="encerramentoPrazo">Encerramento de contrato no prazo</SelectItem>
              <SelectItem value="encerramentoAntesPrazo">Encerramento de contrato antes do prazo</SelectItem>
              <SelectItem value="aposentadoria">Aposentadoria do empregado</SelectItem>
              <SelectItem value="falecimentoEmpregador">Falecimento do empregador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-slate-600 text-sm">Aviso prévio</Label>
          <Select value={avisoPrevio} onValueChange={setAvisoPrevio}>
            <SelectTrigger className="h-12 rounded-lg border-slate-200 bg-slate-50 text-slate-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trabalhado">Trabalhado</SelectItem>
              <SelectItem value="indenizado">Indenizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 py-2">
          <input 
            type="checkbox" 
            className="w-5 h-5 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED]" 
            checked={possuiFeriasAdq}
            onChange={(e) => setPossuiFeriasAdq(e.target.checked)}
          />
          <span className="text-slate-600 text-sm">Possui férias adquiridas no ano anterior?</span>
        </div>

        {/* Campo de Dependentes */}
        <div className="space-y-1">
          <Label className="text-slate-600 text-sm">Número de dependentes</Label>
          <input 
            type="number" 
            className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white outline-none"
            value={dependentes}
            onChange={(e) => setDependentes(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[#7C3AED] text-sm font-semibold">Saldo FGTS antes da contratação <span className="text-xs">?</span></Label>
          <div className="flex h-12 w-full rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-100 px-4 flex items-center text-slate-500 font-bold border-r border-slate-200">R$</div>
            <input className="flex-1 px-4 outline-none" value={saldoFgts} onChange={(e) => setSaldoFgts(e.target.value)} placeholder="0,00" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-slate-600 text-sm">Férias vencidas</Label>
          <div className="flex h-12 w-full rounded-lg border border-slate-200 bg-white overflow-hidden">
            <input className="flex-1 px-4 outline-none" value={feriasVencidas} onChange={(e) => setFeriasVencidas(e.target.value)} />
            <div className="bg-slate-100 px-4 flex items-center text-slate-500 text-sm border-l border-slate-200">Dias</div>
          </div>
        </div>

        <div className="pt-4 space-y-4 text-center">
          <p className="text-[11px] text-slate-400">Assista ao anúncio e veja os resultados.</p>
          <button onClick={calcular} className="w-full bg-[#7C3AED] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
            CALCULAR 🎬
          </button>
          <button onClick={() => setResult(null)} className="text-[#7C3AED] font-black text-sm uppercase tracking-widest">
            LIMPAR
          </button>
        </div>

        <CalcResult results={result} />
      </div>
    </CalcLayout>
  );
}