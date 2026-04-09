import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import MonthlyChart from "../components/dashboard/MonthlyChart";
import CategoryPieChart from "../components/dashboard/CategoryPieChart";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import UpcomingBills from "../components/dashboard/UpcomingBills";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 1. 🔎 Buscar Categorias primeiro (Necessário para traduzir o ID em nome)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const snap = await getDocs(collection(db, "users", user.uid, "categories"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
  });

  // 2. 🔎 Buscar transações e cruzar com Categorias
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.uid, categories],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "users", user.uid, "transactions"));
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data() || {};
        // Encontra o nome da categoria comparando o ID
        const catObj = categories.find(c => c.id === data.category || c.name === data.category);
        
        return {
          id: d.id,
          description: data.description || "Sem descrição",
          amount: Number(data.amount) || 0,
          type: data.type || "expense",
          category_name: catObj ? catObj.name : (data.category_name || "Outros"),
          date: data.date || "", 
          account: data.account || "",
        };
      });
    },
    enabled: !!user,
  });

  // 3. 🔎 Buscar contas a pagar (Com correção de data)
  const { data: bills = [] } = useQuery({
    queryKey: ["bills", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "users", user.uid, "bills"));
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          // Formata a data aqui para o UpcomingBills usar corretamente
          formattedDate: data.date ? data.date.split("-").reverse().join("/") : ""
        };
      });
    },
  });

  // 🔎 Buscar metas
  const { data: goals = [] } = useQuery({
    queryKey: ["goals", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "users", user.uid, "goals"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
  });

  // 🔥 Filtro de transações (CORREÇÃO DE DATA)
  const monthlyTx = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const [year, month] = tx.date.split("-").map(Number);
      return (month - 1) === selectedMonth && year === selectedYear;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedMonth, selectedYear]);

  const income = useMemo(
    () => monthlyTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [monthlyTx]
  );

  const expenses = useMemo(
    () => monthlyTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [monthlyTx]
  );

  const balance = income - expenses;
  const savings = goals.reduce((s, g) => s + (Number(g.current_amount) || 0), 0);

  // 🔎 Dados para gráfico mensal
  const chartData = useMemo(() => {
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const refDate = new Date(selectedYear, selectedMonth, 15);
      const d = subMonths(refDate, i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const filtered = transactions.filter(tx => {
        if (!tx.date) return false;
        const [txY, txM] = tx.date.split("-").map(Number);
        return (txM - 1) === m && txY === y;
      });

      last6.push({
        name: format(d, "MMM", { locale: ptBR }),
        receita: filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
        despesa: filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    return last6;
  }, [transactions, selectedMonth, selectedYear]);

  // 🔎 Dados para gráfico de categorias
  const categoryData = useMemo(() => {
    const catMap = {};
    monthlyTx
      .filter(t => t.type === "expense")
      .forEach(t => {
        const cat = t.category_name;
        catMap[cat] = (catMap[cat] || 0) + t.amount;
      });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyTx]);

  const fmt = (v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="max-w-7xl mx-auto space-y-6 notranslate">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-24 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo Geral" value={fmt(balance)} icon={Wallet} variant={balance >= 0 ? "primary" : "danger"} />
        <StatCard title="Receitas" value={fmt(income)} icon={TrendingUp} variant="success" />
        <StatCard title="Despesas" value={fmt(expenses)} icon={TrendingDown} variant="danger" />
        <StatCard title="Economias" value={fmt(savings)} icon={PiggyBank} variant="default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MonthlyChart data={chartData} />
        </div>
        <CategoryPieChart data={categoryData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentTransactions transactions={monthlyTx} />
        <UpcomingBills bills={bills} />
      </div>
    </div>
  );
}