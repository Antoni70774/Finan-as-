import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { format, differenceInDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function UpcomingBills({ bills }) {
  // Função para tratar a data sem erro de fuso horário
  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const upcoming = bills
    .filter(b => b.status === "pending")
    .sort((a, b) => a.due_date.localeCompare(b.due_date)) // Ordenação por string é mais segura
    .slice(0, 4);

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Próximas Contas</CardTitle>
        <Link to="/Bills" className="text-xs text-primary font-medium hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma conta pendente
          </p>
        )}
        {upcoming.map((bill) => {
          const dueDate = parseDate(bill.due_date);
          const today = startOfDay(new Date());
          const daysUntil = differenceInDays(dueDate, today);
          const isUrgent = daysUntil <= 3;

          return (
            <div key={bill.id} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isUrgent ? "bg-red-500/10" : "bg-orange-500/10"
              }`}>
                <CalendarClock className={`w-4 h-4 ${isUrgent ? "text-red-500" : "text-orange-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{bill.title}</p>
                <p className="text-xs text-muted-foreground">
                  {/* Exibição formatada corretamente */}
                  {format(dueDate, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  R$ {Number(bill.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-[10px]">
                  {daysUntil < 0 ? "Vencida" : daysUntil === 0 ? "Vence hoje" : `${daysUntil}d`}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}