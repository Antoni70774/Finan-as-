import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

export default function Categories() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", type: "expense", color: "#7c3aed", budget_limit: "" });
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔎 Carregar categorias
  const carregar = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "users", user.uid, "categories"));
      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(lista);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ➕ Criar Categoria
  const criarCategoria = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "categories"), {
        name: form.name || "",
        type: form.type || "expense",
        color: form.color || "#7c3aed",
        budget_limit: form.budget_limit ? parseFloat(form.budget_limit) : null,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });
      toast({ title: "Categoria criada!" });
      setDialogOpen(false);
      resetForm();
      carregar();
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      toast({ title: "Erro ao criar categoria", variant: "destructive" });
    }
  };

  // ✏️ Atualizar categoria
  const atualizarCategoria = async (id) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "categories", id), {
        name: form.name || "",
        type: form.type || "expense",
        color: form.color || "#7c3aed",
        budget_limit: form.budget_limit ? parseFloat(form.budget_limit) : null,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Categoria atualizada!" });
      setDialogOpen(false);
      resetForm();
      carregar();
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      toast({ title: "Erro ao atualizar categoria", variant: "destructive" });
    }
  };

  // 🗑️ Deletar categoria
  const deletarCategoria = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "categories", id));
      toast({ title: "Categoria excluída!" });
      carregar();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast({ title: "Erro ao excluir categoria", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setForm({ name: "", type: "expense", color: "#7c3aed", budget_limit: "" });
    setEditing(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      atualizarCategoria(editing.id);
    } else {
      criarCategoria();
    }
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      name: cat.name || "",
      type: cat.type || "expense",
      color: cat.color || "#7c3aed",
      budget_limit: cat.budget_limit ? String(cat.budget_limit) : "",
    });
    setDialogOpen(true);
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const CategoryCard = ({ cat, index = 0 }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group rounded-lg">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${cat.color}20` }}
        >
          <Tags className="w-4 h-4" style={{ color: cat.color || "#7c3aed" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{cat.name}</p>
          {cat.budget_limit != null && cat.budget_limit !== "" && (
            <p className="text-xs text-muted-foreground">
              Limite: R$ {Number(cat.budget_limit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
            </p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => deletarCategoria(cat.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 notranslate">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organize suas despesas e receitas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={String(form.type)} onValueChange={(v) => setForm({ ...form, type: String(v) })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Limite Mensal (R$) - Opcional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.budget_limit}
                  onChange={(e) => setForm({ ...form, budget_limit: e.target.value })}
                  placeholder="Ex: 500.00"
                />
              </div>
              <Button type="submit" className="w-full">
                {editing ? "Salvar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="expense">
        <TabsList className="w-full">
          <TabsTrigger value="expense" className="flex-1">
            Despesas ({expenseCategories.length})
          </TabsTrigger>
          <TabsTrigger value="income" className="flex-1">
            Receitas ({incomeCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense">
          <Card>
            <CardContent className="p-2">
              {expenseCategories.length === 0 && (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma categoria de despesa
                </p>
              )}
              {expenseCategories.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card>
            <CardContent className="p-2">
              {incomeCategories.length === 0 && (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma categoria de receita
                </p>
              )}
              {incomeCategories.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
