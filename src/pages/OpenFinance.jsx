import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Landmark, RefreshCw, Trash2, CreditCard, Wallet, PiggyBank, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

const accountTypeLabels = {
  checking: "Conta Corrente",
  savings: "Poupança",
  credit_card: "Cartão de Crédito",
  investment: "Investimento",
};

const accountTypeIcons = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
};

const bankColors = {
  "Nubank": "#8B5CF6",
  "Itaú": "#F97316",
  "Bradesco": "#EF4444",
  "Banco do Brasil": "#FBBF24",
  "Santander": "#EF4444",
  "Caixa": "#3B82F6",
  "Inter": "#F97316",
  "C6 Bank": "#1F2937",
  "BTG Pactual": "#1E40AF",
  "XP Investimentos": "#059669",
};

export default function OpenFinance() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ bank_name: "", account_type: "checking", balance: "", color: "#7c3aed" });
  const { toast } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔎 Carregar contas
  const carregar = async () => {
    if (!user) return;
    setLoading(true);
    const snap = await getDocs(collection(db, "users", user.uid, "bank_accounts"));
    const lista = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      balance: Number(d.data().balance) || 0,
    }));
    setAccounts(lista);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [user]);

  // ➕ Criar conta
  const salvar = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "bank_accounts"), {
        ...form,
        balance: Number(form.balance) || 0,
        is_connected: true,
        last_sync: new Date().toISOString(),
      });
      toast({ title: "Conta adicionada!", duration: 1000 });
      setDialogOpen(false);
      setForm({ bank_name: "", account_type: "checking", balance: "", color: "#7c3aed" });
      carregar();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      toast({ title: "Erro ao salvar", variant: "destructive", duration: 2000 });
    }
  };

  // ❌ Excluir conta
  const excluir = async (account) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "bank_accounts", account.id));
      toast({ title: "Conta removida!", duration: 1000 });
      carregar();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      toast({ title: "Erro ao excluir", variant: "destructive", duration: 2000 });
    }
  };

  // 🔄 Atualizar sync
  const atualizarSync = async (account) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "bank_accounts", account.id), {
        last_sync: new Date().toISOString(),
      });
      toast({ title: "Saldo atualizado!", duration: 1000 });
      carregar();
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      toast({ title: "Erro ao atualizar", variant: "destructive", duration: 2000 });
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Open Finance</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas contas bancárias em um só lugar</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { 
          setDialogOpen(o); 
          if (!o) setForm({ bank_name: "", account_type: "checking", balance: "", color: "#7c3aed" }); 
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Adicionar Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Conta Bancária</DialogTitle></DialogHeader>
            <form onSubmit={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Select value={form.bank_name} onValueChange={v => setForm({ ...form, bank_name: v, color: bankColors[v] || "#7c3aed" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(bankColors).map(bank => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Conta</Label>
                  <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Conta Corrente</SelectItem>
                      <SelectItem value="savings">Poupança</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="investment">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saldo (R$)</Label>
                  <Input type="number" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full">Conectar Conta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
        <CardContent className="p-6">
          <p className="text-sm opacity-80">Patrimônio Total</p>
          <p className="text-3xl font-bold mt-1">R$ {totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs opacity-60 mt-2">{accounts.length} conta(s) conectada(s)</p>
        </CardContent>
      </Card>
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma conta conectada</p>
          <p className="text-xs mt-1">
            Adicione suas contas bancárias para centralizar suas finanças
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((account, index) => {
          const Icon = accountTypeIcons[account.account_type] || Wallet;
          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="shadow-sm border border-border/50 overflow-hidden">
                <div
                  className="h-1.5"
                  style={{ backgroundColor: account.color || "#7c3aed" }}
                />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: `${account.color || "#7c3aed"}20`,
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: account.color || "#7c3aed" }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold">{account.bank_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {accountTypeLabels[account.account_type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => atualizarSync(account)}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => excluir(account)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-2xl font-bold">
                      R$ {(account.balance || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {account.is_connected ? "Conectado" : "Manual"}
                      </Badge>
                      {account.last_sync && (
                        <span className="text-[10px] text-muted-foreground">
                          Sync:{" "}
                          {new Date(account.last_sync).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      )}
                    </div>
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
