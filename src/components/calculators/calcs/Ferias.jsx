import React, { useState } from "react";
import { CalcField, CalcResult, CalcButton } from "../CalcCard";
import CalcLayout from "../CalcLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button"; // Importando o botão padrão

export default function Ferias() {
  const [salario, setSalario] = useState("");
  const [horasExtras, setHorasExtras] = useState("");
  const [dependentes, setDependentes] = useState("0");
  const [diasFerias, setDiasFerias] = useState("30");
  const [abono, setAbono] = useState("nao");
  const [adiantar13, setAdiantar13] = useState("nao");
  const [result, setResult] = useState(null);

  const calc = () => {
    const s = parseFloat(salario) || 0;
    const h = parseFloat(horasExtras) || 0;
    const d = parseInt(dependentes, 10) || 0;
    let dias = parseInt(diasFerias, 10) || 30;

    // Ajuste de segurança: férias não podem exceder 30 dias
    if (dias > 30) dias = 30;

    let diasTrabalhados = dias;
    let valorAbono = 0;
    let umTercoAbono = 0;

    // Lógica correta do Abono Pecuniário (venda de 1/3, geralmente 10 dias)
    if (abono === "sim" && dias >= 10) {
      diasTrabalhados = dias - 10;
      valorAbono = (s / 30) * 10;
      umTercoAbono = valorAbono / 3;
    }

    // Cálculo das férias sobre os dias gozados
    const baseFerias = (s / 30) * diasTrabalhados + h;
    const umTercoFerias = baseFerias / 3;
    const brutoTributavel = baseFerias + umTercoFerias;

    // INSS (Tabela progressiva simplificada 2024)
    let inss = 0;
    if (brutoTributavel <= 1412) inss = brutoTributavel * 0.075;
    else if (brutoTributavel <= 2666.68) inss = brutoTributavel * 0.09 - 21.18;
    else if (brutoTributavel <= 4000.03) inss = brutoTributavel * 0.12 - 101.18;
    else inss = Math.min(brutoTributavel * 0.14 - 181.18, 908.85);

    // IRRF (Tabela simplificada 2024)
    const baseIR = brutoTributavel - inss - d * 189.59;
    let ir = 0;
    if (baseIR > 4664.68) ir = baseIR * 0.275 - 896.00;
    else if (baseIR > 3751.05) ir = baseIR * 0.225 - 662.77;
    else if (baseIR > 2826.65) ir = baseIR * 0.15 - 381.44;
    else if (baseIR > 2259.2) ir = baseIR * 0.075 - 169.44;
    ir = Math.max(0, ir);

    // Cálculo do Líquido: Férias gozadas (-) descontos (+) Abono indenizatório
    let liquido = brutoTributavel - inss - ir + valorAbono + umTercoAbono;

    if (adiantar13 === "sim") {
      liquido += s / 2;
    }

    const totalBrutoRecebido = brutoTributavel + valorAbono + umTercoAbono;

    setResult([
      { label: `Férias Gozadas (${diasTrabalhados} dias)`, value: `R$ ${baseFerias.toFixed(2)}` },
      { label: "1/3 sobre Férias Gozadas", value: `R$ ${umTercoFerias.toFixed(2)}` },
      { label: "Abono Pecuniário (10 dias)", value: `R$ ${valorAbono.toFixed(2)}` },
      { label: "1/3 sobre Abono", value: `R$ ${umTercoAbono.toFixed(2)}` },
      { label: "Total Bruto Recebido", value: `R$ ${totalBrutoRecebido.toFixed(2)}`, color: "font-semibold" },
      { label: "Desconto INSS (sobre férias)", value: `- R$ ${inss.toFixed(2)}`, color: "text-red-500" },
      { label: "Desconto IRRF (sobre férias)", value: `- R$ ${ir.toFixed(2)}`, color: "text-red-500" },
      { label: "Total Líquido a Receber", value: `R$ ${liquido.toFixed(2)}`, color: "text-green-600 font-bold text-base" },
    ]);
  };

  const limpar = () => {
    setSalario("");
    setHorasExtras("");
    setDependentes("0");
    setDiasFerias("30");
    setAbono("nao");
    setAdiantar13("nao");
    setResult(null);
  };

  return (
    <CalcLayout title="Férias">
      <div className="space-y-4">
        <CalcField label="Salário Bruto (R$)" value={salario} onChange={setSalario} placeholder="Ex: 2100" />
        <CalcField label="Horas Extras (R$)" value={horasExtras} onChange={setHorasExtras} placeholder="Ex: 0" />
        <CalcField label="Número de Dependentes" value={dependentes} onChange={setDependentes} type="number" min="0" />
        <CalcField label="Dias de Férias (max 30)" value={diasFerias} onChange={setDiasFerias} type="number" min="1" max="30" />

        <div className="w-full">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1.5">
            Abono Pecuniário (Vender 10 dias?)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle size={14} className="text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Venda de 1/3 das férias (indenizatório, sem impostos).</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </label>
          <Select value={abono} onValueChange={setAbono}>
            <SelectTrigger className="w-full h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nao">Não</SelectItem>
              <SelectItem value="sim">Sim</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full">
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Adiantar 1ª parcela 13º?</label>
          <Select value={adiantar13} onValueChange={setAdiantar13}>
            <SelectTrigger className="w-full h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nao">Não</SelectItem>
              <SelectItem value="sim">Sim</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Container flex para padronizar os botões lado a lado */}
        <div className="flex gap-3 pt-3">
          <div className="flex-1">
            {/* O CalcButton interno é w-full, então ele preencherá o flex-1 */}
            <CalcButton onClick={calc} />
          </div>
          {/* Usando o componente Button base e forçando w-full e h-10 para igualar ao CalcField/Input */}
          <Button 
            variant="outline" 
            onClick={limpar} 
            className="flex-1 h-10 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          >
            Limpar
          </Button>
        </div>

        <CalcResult results={result} />
      </div>
    </CalcLayout>
  );
}