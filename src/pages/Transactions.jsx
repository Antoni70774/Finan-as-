import React, { useState, useMemo, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { Plus, Search, ArrowUpCircle, ArrowDownCircle, Wallet, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Transactions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth().toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState("all");

  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    type: "expense",
    category: "",
    account: "",
    notes: ""
  });

  // Listener para o evento disparado pelo MobileNav
  useEffect(() => {
    const handleOpenDialog = (event) => {
      const type = event.detail?.type || "expense";
      setForm(prev => ({ ...prev, type: type }));
      setDialogOpen(true);
    };

    window.addEventListener("open-transaction-dialog", handleOpenDialog);
    return () => window.removeEventListener("open-transaction-dialog", handleOpenDialog);
  }, []);

  const carregarDados = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const transSnap = await getDocs(collection(db, "users", user.uid, "transactions"));
      const listaTrans = transSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        amount: Number(d.data().amount) || 0
      }));
      setTransactions(listaTrans);

      const catSnap = await getDocs(collection(db, "users", user.uid, "categories"));
      const listaCats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(listaCats);
    } catch (err) {
      console.error("Erro ao carregar:", err);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [user]);

  const { filteredTransactions, totals } = useMemo(() => {
    const filtered = transactions.filter(tx => {
      const [year, month, day] = tx.date.split('-').map(Number);
      const txDate = new Date(year, month - 1, day);
      
      const matchesSearch = tx.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = txDate.getMonth().toString() === filterMonth;
      const matchesYear = txDate.getFullYear().toString() === filterYear;
      const matchesType = filterType === "all" || tx.type === filterType;

      return matchesSearch && matchesMonth && matchesYear && matchesType;
    }).sort((a, b) => b.date.localeCompare(a.date));

    const res = filtered.reduce((acc, curr) => {
      if (curr.type === 'income') acc.income += curr.amount;
      else acc.expense += curr.amount;
      return acc;
    }, { income: 0, expense: 0 });

    return { filteredTransactions: filtered, totals: { ...res, balance: res.income - res.expense } };
  }, [transactions, searchTerm, filterMonth, filterYear, filterType]);

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.category) {
      toast({ title: "Selecione uma categoria", variant: "destructive" });
      return;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        ...form,
        amount: Number(form.amount),
        createdAt: new Date().toISOString(),
        userId: user.uid
      });

      toast({ title: form.type === 'income' ? "Receita adicionada!" : "Despesa adicionada!", duration: 1500 });
      setDialogOpen(false);
      setForm({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        type: "expense",
        category: "",
        account: "",
        notes: ""
      });
      carregarDados();
    } catch (err) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const deletar = async (id) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "transactions", id));
      carregarDados();
      toast({ title: "Excluído com sucesso", duration: 1000 });
    } catch (err) {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    }
  };

  const formatarDataExibicao = (dataString) => {
    if (!dataString) return "";
    const [year, month, day] = dataString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
  };

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  if (!user) return <p className="p-4">Autenticando...</p>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6 notranslate pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="flex-1 md:w-[140px] h-10 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
          </Select>

          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[100px] h-10 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 h-10 gap-2">
                <Plus size={18}/> <span className="hidden sm:inline">Nova</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
              <form onSubmit={salvar} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-gray-500">Descrição</label>
                  <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Mercado, Aluguel..." required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-gray-500">Valor (R$)</label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-gray-500">Tipo</label>
                    <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-gray-500">Categoria</label>
                    <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-gray-500">Data</label>
                    <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-gray-500">Conta</label>
                  <Input placeholder="Ex: Nubank, Dinheiro..." value={form.account} onChange={e => setForm({...form, account: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-gray-500">Observações</label>
                  <Textarea className="resize-none" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>

                <Button type="submit" className="w-full bg-violet-600 h-12 text-lg font-bold">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50/50 border-green-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="text-xs text-green-600 font-bold uppercase mb-1">Receitas</p><h3 className="text-2xl font-bold text-green-700">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div>
            <ArrowUpCircle className="text-green-500 opacity-80" size={40} />
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="text-xs text-red-600 font-bold uppercase mb-1">Despesas</p><h3 className="text-2xl font-bold text-red-700">R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div>
            <ArrowDownCircle className="text-red-500 opacity-80" size={40} />
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="text-xs text-slate-600 font-bold uppercase mb-1">Saldo</p><h3 className="text-2xl font-bold text-slate-800">R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div>
            <Wallet className="text-slate-500 opacity-80" size={40} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input className="pl-10 h-11 bg-white" placeholder="Buscar por descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="income">Apenas Receitas</SelectItem>
            <SelectItem value="expense">Apenas Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map(tx => (
              <div key={tx.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {tx.type === 'income' ? <ArrowUpCircle size={22}/> : <ArrowDownCircle size={22}/>}
                  </div>
                  <div>
                    <p className="font-bold text-sm uppercase tracking-tight">{tx.description}</p>
                    <p className="text-[11px] text-muted-foreground uppercase font-medium">
                      {tx.category} • {formatarDataExibicao(tx.date)} {tx.account && `• ${tx.account}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-black text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+ ' : '- '} 
                    {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => deletar(tx.id)} className="md:opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all">
                    <Trash2 size={18}/>
                  </Button>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="p-20 text-center">
                <p className="text-muted-foreground font-medium">Nenhum lançamento encontrado para os filtros aplicados.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}