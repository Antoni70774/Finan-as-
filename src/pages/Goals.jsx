import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Pencil, Trash2 } from "lucide-react";
import { differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

export default function Goals() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [depositDialog, setDepositDialog] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [form, setForm] = useState({
    title: "",
    target_amount: "",
    current_amount: "0",
    deadline: "",
    icon: "Target",
    color: "#7c3aed"
  });
  const { toast } = useToast();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔎 Carregar metas
  const carregar = async () => {
    if (!user) return;
    setLoading(true);
    const snap = await getDocs(collection(db, "users", user.uid, "goals"));
    const lista = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      target_amount: Number(d.data().target_amount) || 0,
      current_amount: Number(d.data().current_amount) || 0,
      status: d.data().status || "active",
    }));
    setGoals(lista);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [user]);

  // ➕ Criar ou atualizar meta
  const salvar = async (e) => {
    e.preventDefault();
    if (!user) return;
    const data = {
      ...form,
      target_amount: Number(form.target_amount) || 0,
      current_amount: Number(form.current_amount) || 0,
      status: "active",
    };
    try {
      if (editing) {
        await updateDoc(doc(db, "users", user.uid, "goals", editing.id), data);
        toast({ title: "Meta atualizada!", duration: 1000 });
      } else {
        await addDoc(collection(db, "users", user.uid, "goals"), data);
        toast({ title: "Meta criada!", duration: 1000 });
      }
      setDialogOpen(false);
      resetForm();
      carregar();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      toast({ title: "Erro ao salvar", variant: "destructive", duration: 2000 });
    }
  };

  // ➕ Depósito
  const handleDeposit = async () => {
    if (!depositDialog || !depositAmount) return;
    const newAmount = (depositDialog.current_amount || 0) + Number(depositAmount);
    const status = newAmount >= depositDialog.target_amount ? "completed" : "active";
    try {
      await updateDoc(doc(db, "users", user.uid, "goals", depositDialog.id), {
        current_amount: newAmount,
        status,
      });
      toast({ title: "Depósito realizado!", duration: 1000 });
      setDepositAmount("");
      setDepositDialog(null);
      carregar();
    } catch (err) {
      console.error("Erro ao depositar:", err);
      toast({ title: "Erro ao depositar", variant: "destructive", duration: 2000 });
    }
  };

  // ❌ Excluir meta
  const excluir = async (goal) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "goals", goal.id));
      toast({ title: "Meta excluída!", duration: 1000 });
      carregar();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      toast({ title: "Erro ao excluir", variant: "destructive", duration: 2000 });
    }
  };

  const resetForm = () => {
    setForm({ title: "", target_amount: "", current_amount: "0", deadline: "", icon: "Target", color: "#7c3aed" });
    setEditing(null);
  };

  const openEdit = (goal) => {
    setEditing(goal);
    setForm({
      title: goal.title || "",
      target_amount: String(goal.target_amount || ""),
      current_amount: String(goal.current_amount || "0"),
      deadline: goal.deadline || "",
      icon: goal.icon || "Target",
      color: goal.color || "#7c3aed",
    });
    setDialogOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Metas Financeiras</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus objetivos de economia</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Meta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar Meta" : "Nova Meta"}</DialogTitle></DialogHeader>
            <form onSubmit={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Alvo (R$)</Label>
                  <Input type="number" step="0.01" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Valor Atual (R$)</Label>
                  <Input type="number" step="0.01" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-10" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editing ? "Salvar" : "Criar Meta"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && goals.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma meta criada ainda</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal, index) => {
          const progress = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
          const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;

          return (
			  <motion.div
				  key={goal.id}
				  initial={{ opacity: 0, y: 20 }}
				  animate={{ opacity: 1, y: 0 }}
				  transition={{ delay: index * 0.05 }}
				>
				  <Card className="shadow-sm border border-border/50 overflow-hidden">
					<div
					  className="h-1.5"
					  style={{ backgroundColor: goal.color || "hsl(252, 56%, 57%)" }}
					/>
					<CardContent className="p-5">
					  {/* Header com título e botões */}
					  <div className="flex items-start justify-between mb-3">
						<div>
						  <h3 className="font-semibold">{goal.title}</h3>
						  <div className="flex items-center gap-2 mt-1">
							<Badge
							  variant={goal.status === "completed" ? "default" : "secondary"}
							  className="text-[10px]"
							>
							  {goal.status === "completed"
								? "Concluída"
								: goal.status === "paused"
								? "Pausada"
								: "Ativa"}
							</Badge>
							{daysLeft !== null && daysLeft > 0 && (
							  <span className="text-xs text-muted-foreground">
								{daysLeft} dias restantes
							  </span>
							)}
						  </div>
						</div>
						<div className="flex gap-1">
						  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(goal)}>
							<Pencil className="w-3.5 h-3.5" />
						  </Button>
						  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => excluir(goal)}>
							<Trash2 className="w-3.5 h-3.5" />
						  </Button>
						</div>
					  </div>

					  {/* Valores e progresso */}
					  <div className="space-y-2">
						<div className="flex justify-between text-sm">
						  <span className="text-muted-foreground">
							R$ {(goal.current_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
						  </span>
						  <span className="font-medium">
							R$ {(goal.target_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
						  </span>
						</div>
						<Progress value={progress} className="h-2" />
						<p className="text-xs text-muted-foreground text-right">{progress.toFixed(1)}%</p>
					  </div>

					  {/* Depósito */}
					  <div className="mt-3 flex gap-2">
						<Input
						  type="number"
						  step="0.01"
						  placeholder="Valor do depósito"
						  value={depositDialog?.id === goal.id ? depositAmount : ""}
						  onChange={(e) => {
							setDepositDialog(goal);
							setDepositAmount(e.target.value);
						  }}
						  className="h-8 text-sm"
						/>
						<Button
						  size="sm"
						  onClick={handleDeposit}
						  disabled={!depositAmount || depositDialog?.id !== goal.id}
						>
						  Depositar
						</Button>
					  </div>
					</CardContent>
				  </Card>
				</motion.div>
						);
					  })}
					  </div>
					</div>
				  );
				}
