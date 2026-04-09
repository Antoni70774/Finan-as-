import React from "react";
import JurosComposto from "./calcs/JurosComposto";
import JurosSimples from "./calcs/JurosSimples";
import MensalAnual from "./calcs/MensalAnual";
import AnualMensal from "./calcs/AnualMensal";
import Ferias from "./calcs/Ferias";
import FeriasProporcionais from "./calcs/FeriasProporcionais";
import SalarioLiquido from "./calcs/SalarioLiquido";
import HoraExtra from "./calcs/HoraExtra";
import Investimento from "./calcs/Investimento";
import DecimoTerceiro from "./calcs/DecimoTerceiro";
import Fgts from "./calcs/Fgts";
import Rescisao from "./calcs/Rescisao";
import Poupanca from "./calcs/Poupanca";
import TaxaEquivalente from "./calcs/TaxaEquivalente";
import Porcentagem from "./calcs/Porcentagem";
import ContadorDias from "./calcs/ContadorDias";
import RegraTres from "./calcs/RegraTres";
import DiasFaltam from "./calcs/DiasFaltam";
import Emprestimo from "./calcs/Emprestimo";
import FinanciamentoVeiculo from "./calcs/FinanciamentoVeiculo";

const components = {
  juros_composto: JurosComposto,
  juros_simples: JurosSimples,
  mensal_anual: MensalAnual,
  anual_mensal: AnualMensal,
  ferias: Ferias,
  ferias_prop: FeriasProporcionais,
  salario_liquido: SalarioLiquido,
  hora_extra: HoraExtra,
  investimento: Investimento,
  decimo_terceiro: DecimoTerceiro,
  fgts: Fgts,
  rescisao: Rescisao,
  poupanca: Poupanca,
  taxa_equivalente: TaxaEquivalente,
  porcentagem: Porcentagem,
  contador_dias: ContadorDias,
  regra_tres: RegraTres,
  dias_faltam: DiasFaltam,
  emprestimo: Emprestimo,
  financiamento_veiculo: FinanciamentoVeiculo,
};

export default function CalculatorDetail({ calculator }) {
  const Component = components[calculator.id];
  if (!Component) return <div className="text-muted-foreground text-sm">Calculadora não encontrada.</div>;
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{calculator.label}</h2>
      <Component />
    </div>
  );
}