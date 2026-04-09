// src/pages/Bills.jsx
import React, { useState, useMemo, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CalendarClock, Check, AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import MonthFilter from "../components/shared/MonthFilter";
import { useToast } from "@/components/ui/use-toast";

export default function Bills() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    due_date: "",
    category_name: "",
    is_recurring: false,
    notes: ""
  });
  const { toast } = useToast();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users", user.uid, "bills"));
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        amount: Number(d.data().amount) || 0,
        status: d.data().status || "pending",
      }));
      setBills(lista);
    } catch (err) {
      console.error("Erro ao carregar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [user]);

  const salvar = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "bills"), {
        ...form,
        amount: Number(form.amount) || 0,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      // toast com duração de 1 segundo
      toast({ title: "Conta adicionada!", duration: 1000 });

      setDialogOpen(false);
      setForm({
        title: "",
        amount: "",
        due_date: "",
        category_name: "",
        is_recurring: false,
        notes: ""
      });
      carregar();
    } catch (err) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const markAsPaid = async (bill) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "bills", bill.id), { status: "paid" });
      toast({ title: "Conta paga!", duration: 1000 });
      carregar();
    } catch (err) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    return bills.filter(b => {
      if (!b.due_date) return false;
      const d = parseISO(b.due_date);
      if (!isValid(d)) return false;

      const matchesDate = d.getMonth() === month && d.getFullYear() === year;
      
      // Lógica de Vencidos (Overdue)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = d < today && b.status !== "paid";

      if (statusFilter === "overdue") return matchesDate && isOverdue;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      
      return matchesDate;
    });
  }, [bills, month, year, statusFilter]);

  const totalPending = filtered.filter(b => b.status === "pending").reduce((s, b) => s + b.amount, 0);
  const totalPaid = filtered.filter(b => b.status === "paid").reduce((s, b) => s + b.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus compromissos financeiros</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
              <form onSubmit={salvar} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Ex: Aluguel" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={form.category_name} onChange={e => setForm({ ...form, category_name: e.target.value })} placeholder="Ex: Moradia" />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="rec" checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
                  <Label htmlFor="rec" className="cursor-pointer">Conta recorrente mensal</Label>
                </div>
                <Button type="submit" className="w-full">Salvar Conta</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-orange-600 uppercase">Pendente</p>
            <p className="text-2xl font-bold text-orange-700">
              R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-600 uppercase">Pago</p>
            <p className="text-2xl font-bold text-emerald-700">
              R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-start">
        {/* A KEY AQUI É VITAL PARA NÃO QUEBRAR O SELECT NO REACT */}
        <Select 
          key={`filter-${month}-${year}`} 
          value={statusFilter} 
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-44 bg-background">
            <SelectValue placeholder="Filtrar Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Apenas Pendentes</SelectItem>
            <SelectItem value="paid">Apenas Pagos</SelectItem>
            <SelectItem value="overdue">Vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0 divide-y divide-border">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground italic">Nenhum compromisso encontrado para este filtro.</div>
          ) : (
            filtered.map(bill => {
              const dueDate = parseISO(bill.due_date);
              const today = new Date();
              today.setHours(0,0,0,0);
              const isOverdue = dueDate < today && bill.status !== "paid";

              return (
                <div key={bill.id} className="flex items-center gap-4 px-4 py-4 hover:bg-accent/30 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    bill.status === "paid" ? "bg-emerald-100 text-emerald-600" :
                    isOverdue ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                  }`}>
                    {bill.status === "paid" ? <Check size={20}/> : 
                     isOverdue ? <AlertTriangle size={20}/> : <CalendarClock size={20}/>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate uppercase">{bill.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
                      </span>
                      {bill.category_name && <Badge variant="outline" className="text-[10px] py-0">{bill.category_name}</Badge>}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <span className="text-sm font-bold">
                      R$ {bill.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    {bill.status !== "paid" ? (
                      <Button size="sm" onClick={() => markAsPaid(bill)} variant="outline" className="h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                        Pagar
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-500 text-white border-none">OK</Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
