import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function RecentTransactions({ transactions }) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Transações Recentes</CardTitle>
        <Link to="/Transactions" className="text-xs text-primary font-medium hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma transação registrada
          </p>
        )}
        {transactions.slice(0, 5).map((tx) => (
          <div key={tx.id} className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
              }`}
            >
              {tx.type === "income" ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
			  <p className="text-sm font-medium truncate">{tx.description}</p>
			  <p className="text-xs text-muted-foreground">
				{/* tx.category_name agora virá preenchido pelo Dashboard */}
				{tx.category_name} • {tx.date ? tx.date.split("-").reverse().join("/") : ""}
			  </p>
			</div>

            <span
              className={`text-sm font-semibold whitespace-nowrap ${
                tx.type === "income" ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {tx.type === "income" ? "+" : "-"}R$ {Math.abs(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
