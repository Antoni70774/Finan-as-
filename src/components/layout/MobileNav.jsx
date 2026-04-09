// src/components/MobileNav.jsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  Target,
  Menu,
  Tags,
  Landmark,
  User,
  Settings,
  Wallet,
  LogOut,
  Calculator,
  PieChart,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { path: "/transactions", icon: ArrowLeftRight, label: "Transações" },
  { path: "/summary", icon: PieChart, label: "Resumo" },
  { path: "/bills", icon: Receipt, label: "Contas" },
  { path: "/goals", icon: Target, label: "Metas" },
  { path: "/categories", icon: Tags, label: "Categorias" },
  { path: "/openfinance", icon: Landmark, label: "Open Finance" },
  { path: "/calculadora", icon: Calculator, label: "Calculadoras" },
  { path: "/profile", icon: User, label: "Perfil" },
  { path: "/settings", icon: Settings, label: "Configurações" },
];

const bottomNavItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { path: "/transactions", icon: ArrowLeftRight, label: "Transações" },
  { path: "/goals", icon: Target, label: "Metas" },
  { path: "/bills", icon: Receipt, label: "Contas" },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const { user, logout } = useAuth();

  // Função para pegar a saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Extrai apenas o primeiro nome ou usa o email/Usuário como fallback
  const firstName = user?.displayName 
    ? user.displayName.split(" ")[0] 
    : user?.email?.split("@")[0] || "Usuário";

  const handleQuick = (type) => {
    setQuickOpen(false);
    const triggerEvent = () => {
      const ev = new CustomEvent("open-transaction-dialog", { detail: { type } });
      window.dispatchEvent(ev);
    };

    if (location.pathname !== "/transactions") {
      navigate("/transactions");
      setTimeout(triggerEvent, 100);
    } else {
      triggerEvent();
    }
  };

  return (
    <>
      {/* Barra de Topo */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary-foreground" />
          </div>
          {/* Alterado para exibir saudação e primeiro nome */}
          <span className="font-bold text-sm tracking-tight italic">
            {getGreeting()}, <span className="text-primary not-italic">{firstName}</span>
          </span>
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-accent transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary-foreground" />
                </div>
                FLOW App
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname.toLowerCase() === item.path.toLowerCase();
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all w-full mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Barra de Navegação Inferior com FAB */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 h-16 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="relative flex items-center justify-around h-full px-2 pb-safe">
          {bottomNavItems.slice(0, 2).map((item) => {
            const isActive = location.pathname.toLowerCase() === item.path.toLowerCase();
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all ${
                  isActive ? "text-primary scale-110" : "text-muted-foreground"
                }`}
              >
                <item.icon className={isActive ? "w-6 h-6" : "w-5 h-5"} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}

          <div className="flex-1" />

          {bottomNavItems.slice(2, 4).map((item) => {
            const isActive = location.pathname.toLowerCase() === item.path.toLowerCase();
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all ${
                  isActive ? "text-primary scale-110" : "text-muted-foreground"
                }`}
              >
                <item.icon className={isActive ? "w-6 h-6" : "w-5 h-5"} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}

          <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col items-center">
              {quickOpen && (
                <div className="mb-2 flex flex-col items-center gap-2">
                  <button
                    onClick={() => handleQuick("income")}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2"
                  >
                    <ArrowUpCircle className="w-5 h-5" />
                    <span className="text-xs font-bold">Receita</span>
                  </button>
                  <button
                    onClick={() => handleQuick("expense")}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-rose-500 text-white shadow-lg animate-in fade-in slide-in-from-bottom-4"
                  >
                    <ArrowDownCircle className="w-5 h-5" />
                    <span className="text-xs font-bold">Despesa</span>
                  </button>
                </div>
              )}
              <button
                onClick={() => setQuickOpen((s) => !s)}
                className={`w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-xl border-4 border-background transition-all ${
                  quickOpen ? "rotate-45 bg-slate-600" : ""
                }`}
              >
                <Plus className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}