// src/pages/reports/Summary.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area, Cell
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { FileDown, TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function Summary() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState("anual"); 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const txRef = collection(db, "users", user.uid, "transactions");
    const q = query(txRef, orderBy("date", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(arr);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const stats = useMemo(() => {
    // Dados Anuais
    const yearMonths = Array.from({ length: 12 }, (_, i) => ({
      name: MONTHS_SHORT[i], receita: 0, despesa: 0, saldo: 0,
    }));

    // Dados Mensais (Movimentação Diária)
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1, valor: 0,
    }));

    const catMap = new Map();
    let totalIncome = 0;
    let totalExpense = 0;
    let monthIncome = 0;
    let monthExpense = 0;

    const filteredTransactions = transactions.filter(tx => {
      if (!tx.date) return false;
      const [y, m, d] = tx.date.split("-").map(Number);
      
      // Lógica Anual
      if (y === selectedYear) {
        const amount = Number(tx.amount || 0);
        if (tx.type === "income") {
          yearMonths[m-1].receita += amount;
          yearMonths[m-1].saldo += amount;
          totalIncome += amount;
        } else {
          yearMonths[m-1].despesa += amount;
          yearMonths[m-1].saldo -= amount;
          totalExpense += amount;
          const key = tx.category || "Sem categoria";
          catMap.set(key, (catMap.get(key) || 0) + amount);
        }
      }

      // Lógica Mensal
      if (y === selectedYear && m === selectedMonth) {
        const amount = Number(tx.amount || 0);
        if (tx.type === "income") {
          monthIncome += amount;
          dailyData[d-1].valor += amount;
        } else {
          monthExpense += amount;
          dailyData[d-1].valor -= amount;
        }
        return true;
      }
      return false;
    });

    const categories = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      yearMonths,
      dailyData,
      categories,
      filteredTransactions,
      annual: { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense },
      monthly: { income: monthIncome, expense: monthExpense, balance: monthIncome - monthExpense }
    };
  }, [transactions, selectedYear, selectedMonth]);

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 bg-[#f8fafc] min-h-screen">
      {/* Header Estilo Imagem */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
          <p className="text-slate-500 text-sm">Análise detalhada das suas finanças</p>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border w-fit shadow-sm">
            <button
              onClick={() => setViewMode("mensal")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "mensal" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setViewMode("anual")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "anual" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Anual
            </button>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === "mensal" && (
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[140px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_FULL.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 bg-white border-slate-200 shadow-sm">
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo - Cores baseadas na Imagem 1 e 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp size={18}/></div>
              <span className="text-sm font-medium text-slate-500">Receitas</span>
            </div>
            <h3 className="text-2xl font-bold text-emerald-600">
              {formatCurrency(viewMode === "anual" ? stats.annual.income : stats.monthly.income)}
            </h3>
            {viewMode === "anual" && <p className="text-xs text-slate-400 mt-1">Maior mês: Fev</p>}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><TrendingDown size={18}/></div>
              <span className="text-sm font-medium text-slate-500">Despesas</span>
            </div>
            <h3 className="text-2xl font-bold text-rose-600">
              {formatCurrency(viewMode === "anual" ? stats.annual.expense : stats.monthly.expense)}
            </h3>
            {viewMode === "anual" && <p className="text-xs text-slate-400 mt-1">Maior mês: Fev</p>}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Wallet size={18}/></div>
              <span className="text-sm font-medium text-slate-500">Saldo</span>
            </div>
            <h3 className="text-2xl font-bold text-blue-600">
              {formatCurrency(viewMode === "anual" ? stats.annual.balance : stats.monthly.balance)}
            </h3>
            {viewMode === "anual" && <p className="text-xs text-slate-400 mt-1">Taxa de poupança: 78.2%</p>}
          </CardContent>
        </Card>
      </div>

      {/* Área de Gráficos Dinâmica */}
      {viewMode === "anual" ? (
        <div className="space-y-6">
          <Card className="border-none shadow-sm p-6 bg-white">
            <h4 className="text-sm font-bold text-slate-700 mb-6">Receitas vs Despesas por Mês</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.yearMonths}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-none shadow-sm p-6 bg-white">
            <h4 className="text-sm font-bold text-slate-700 mb-6">Evolução do Saldo Mensal</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.yearMonths}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={3} fill="url(#colorSaldo)" dot={{ r: 4, fill: "#6366f1" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Gráfico Mensal - Estilo Imagem 1 */}
          <Card className="border-none shadow-sm p-6 bg-white">
            <h4 className="text-sm font-bold text-slate-700 mb-6">Movimentação Diária</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="valor" radius={[2, 2, 0, 0]}>
                    {stats.dailyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.valor >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Lista de Transações - Estilo Imagem 1 */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-white">
              <h4 className="text-sm font-bold text-slate-700">Todas as Transações do Mês</h4>
            </div>
            <CardContent className="p-0 bg-white">
              {stats.filteredTransactions.length > 0 ? (
                <div className="divide-y">
                  {stats.filteredTransactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {tx.type === 'income' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 uppercase">{tx.description}</p>
                          <p className="text-xs text-slate-400">{tx.category} • {tx.date.split('-').reverse().join('/')}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">Nenhuma transação neste período.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rodapé Maiores Gastos (Aparece em ambos) */}
      <Card className="border-none shadow-sm p-6 bg-white">
        <h4 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider">Maiores Gastos por Categoria ({selectedYear})</h4>
        <div className="space-y-4">
          {stats.categories.slice(0, 5).map((cat, idx) => (
            <div key={cat.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-indigo-500' : 'bg-emerald-400'}`} />
                <span className="text-sm font-medium text-slate-600">{cat.name}</span>
              </div>
              <div className="flex items-center gap-4 flex-1 max-w-[300px] ml-4">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${idx === 0 ? 'bg-indigo-500' : 'bg-emerald-400'}`}
                    style={{ width: `${(cat.value / (stats.annual.expense || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-800 min-w-[80px] text-right">{formatCurrency(cat.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}