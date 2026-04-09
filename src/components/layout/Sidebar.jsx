import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart, // Ícone para o Resumo
  Receipt,
  Target,
  Tags,
  Landmark,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  LogOut,
  Plus,
  Calculator,
} from "lucide-react";
import AddTransactionModal from "../shared/AddTransactionModal";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { path: "/transactions", icon: ArrowLeftRight, label: "Transações" },
  { path: "/summary", icon: PieChart, label: "Resumo" },
  { path: "/bills", icon: Receipt, label: "Contas a Pagar" },
  { path: "/goals", icon: Target, label: "Metas" },
  { path: "/categories", icon: Tags, label: "Categorias" },
  { path: "/openfinance", icon: Landmark, label: "Open Finance" },
  { path: "/calculadora", icon: Calculator, label: "Calculadoras" },
  { path: "/profile", icon: User, label: "Perfil" },
  { path: "/settings", icon: Settings, label: "Configurações" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const location = useLocation();
  const auth = useAuth();
  const logout = auth?.logout;

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden md:flex flex-col bg-card border-r border-border h-screen sticky top-0 z-30 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-lg whitespace-nowrap"
              >
                FinanceApp
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.toLowerCase() === item.path.toLowerCase();
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"
                  />
                )}

                {collapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout e Collapse */}
        <div className="p-2 border-t border-border space-y-1 flex-shrink-0">
          <button
            onClick={() => logout && logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all w-full"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!collapsed && <span className="text-sm font-medium">Recolher</span>}
          </button>
        </div>
      </motion.aside>

      <AddTransactionModal 
        open={addOpen} 
        onOpenChange={setAddOpen} 
        categories={[]} 
      />
    </>
  );
}