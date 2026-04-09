// src/components/shared/AddTransactionModal.jsx
import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AddTransactionModal({ open, onOpenChange }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "expense",
    category_name: "",
    date: new Date().toISOString().split("T")[0],
    account: "",
    notes: "",
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const carregarCategorias = async () => {
      if (!user) return;
      try {
        // Carrega categorias do nó do usuário: users/{uid}/categories
        const snap = await getDocs(collection(db, "users", user.uid, "categories"));
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCategories(lista);
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
        toast({ title: "Erro ao carregar categorias", variant: "destructive" });
      }
    };
    carregarCategorias();
  }, [user, toast]);

  const criarTransacao = async () => {
    if (!user) return;
    try {
      // Salva a transação dentro do nó do usuário: users/{uid}/transactions
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        ...form,
        amount: parseFloat(form.amount) || 0,
        createdAt: new Date().toISOString(),
      });

      onOpenChange(false);
      setForm({
        description: "",
        amount: "",
        type: "expense",
        category_name: "",
        date: new Date().toISOString().split("T")[0],
        account: "",
        notes: "",
      });

      toast({
        title: form.type === "income" ? "Receita adicionada!" : "Despesa adicionada!",
        duration: 1000,
      });
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      toast({ title: "Erro ao criar transação", variant: "destructive" });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    criarTransacao();
  };

  const filteredCategories = categories.filter((c) => c.type === form.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <Tabs value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category_name: "" })}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1 gap-1.5">
                <TrendingDown className="w-4 h-4 text-red-500" /> Despesa
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1 gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Receita
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Supermercado, Salário..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.category_name}
                onValueChange={(v) => setForm({ ...form, category_name: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent forceMount>
                  {filteredCategories.length === 0 ? (
                    <SelectItem disabled value="none">Nenhuma categoria</SelectItem>
                  ) : (
                    filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
                placeholder="Nubank, Itaú..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Alguma nota sobre esta transação"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`flex-1 ${form.type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            >
              {form.type === "income" ? "Adicionar Receita" : "Adicionar Despesa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
