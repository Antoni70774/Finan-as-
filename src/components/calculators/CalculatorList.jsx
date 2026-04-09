import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp, BarChart2, ArrowUpDown, ArrowDownUp,
  Umbrella, Users, DollarSign, Clock, LineChart,
  CalendarCheck, Lock, FileX, PiggyBank, Percent,
  Calendar, Shuffle, CalendarDays, CreditCard, Car, ChevronRight
} from "lucide-react";

const calculators = [
  { id: "juros_composto", label: "Juros Composto", icon: TrendingUp },
  { id: "juros_simples", label: "Juros Simples", icon: BarChart2 },
  { id: "mensal_anual", label: "Juros Mensal em Anual", icon: ArrowUpDown },
  { id: "anual_mensal", label: "Juros Anual em Mensal", icon: ArrowDownUp },
  { id: "ferias", label: "Férias", icon: Umbrella },
  { id: "ferias_prop", label: "Férias Proporcionais", icon: Users },
  { id: "salario_liquido", label: "Salário Líquido", icon: DollarSign },
  { id: "hora_extra", label: "Hora Extra", icon: Clock },
  { id: "investimento", label: "Investimento", icon: LineChart },
  { id: "decimo_terceiro", label: "Décimo Terceiro", icon: CalendarCheck },
  { id: "fgts", label: "FGTS", icon: Lock },
  { id: "rescisao", label: "Rescisão", icon: FileX },
  { id: "poupanca", label: "Rendimento da Poupança", icon: PiggyBank },
  { id: "taxa_equivalente", label: "Taxa Equivalente", icon: Percent },
  { id: "porcentagem", label: "Porcentagem", icon: Percent },
  { id: "contador_dias", label: "Contador de Dias", icon: Calendar },
  { id: "regra_tres", label: "Regra de Três Simples", icon: Shuffle },
  { id: "dias_faltam", label: "Quantos Dias Faltam", icon: CalendarDays },
  { id: "emprestimo", label: "Empréstimo Pessoal", icon: CreditCard },
  { id: "financiamento_veiculo", label: "Financiamento de Veículos", icon: Car },
];

export default function CalculatorList({ onSelect }) {
  return (
    <Card>
      <CardContent className="p-0 divide-y divide-border">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          return (
            <button
              key={calc.id}
              onClick={() => onSelect(calc)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium">{calc.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}