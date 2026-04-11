import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "./lib/query-client";
import { Toaster } from "./components/ui/toaster";

import { AuthProvider, useAuth } from "./lib/AuthContext";
import PageNotFound from "./lib/PageNotFound";
import { registerNotificationToken } from "./lib/firebase"; // Importação vital

import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Bills from "./pages/Bills";
import Goals from "./pages/Goals";
import Categories from "./pages/Categories";
import OpenFinance from "./pages/OpenFinance";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Summary from './pages/Summary';

/* Import das Calculadoras */
import CalculadoraMenu from "./components/calculators/CalculadoraMenu";
import AnualMensal from "./components/calculators/calcs/AnualMensal";
import ContadorDias from "./components/calculators/calcs/ContadorDias";
import DecimoTerceiro from "./components/calculators/calcs/DecimoTerceiro";
import DiasFaltam from "./components/calculators/calcs/DiasFaltam";
import Emprestimo from "./components/calculators/calcs/Emprestimo";
import Ferias from "./components/calculators/calcs/Ferias";
import FeriasProporcionais from "./components/calculators/calcs/FeriasProporcionais";
import Fgts from "./components/calculators/calcs/Fgts";
import FinanciamentoVeiculo from "./components/calculators/calcs/FinanciamentoVeiculo";
import HoraExtra from "./components/calculators/calcs/HoraExtra";
import Investimento from "./components/calculators/calcs/Investimento";
import JurosComposto from "./components/calculators/calcs/JurosComposto";
import JurosSimples from "./components/calculators/calcs/JurosSimples";
import MensalAnual from "./components/calculators/calcs/MensalAnual";
import Porcentagem from "./components/calculators/calcs/Porcentagem";
import Poupanca from "./components/calculators/calcs/Poupanca";
import RegraTres from "./components/calculators/calcs/RegraTres";
import Rescisao from "./components/calculators/calcs/Rescisao";
import SalarioLiquido from "./components/calculators/calcs/SalarioLiquido";
import TaxaEquivalente from "./components/calculators/calcs/TaxaEquivalente";

// Componente de Proteção de Rota + Registro de Notificação
function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Se o usuário logar, registra o token de notificação
    if (user && !loading) {
      registerNotificationToken(user);
    }
  }, [user, loading]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Toaster />
          <Routes>
            {/* Rota pública */}
            <Route path="/login" element={<Login />} />

            {/* Redirecionamento inicial */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Rotas protegidas com layout centralizado */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              {/* Áreas Principais Financeiras */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="summary" element={<Summary />} />
              <Route path="bills" element={<Bills />} />
              <Route path="goals" element={<Goals />} />
              <Route path="categories" element={<Categories />} />
              
              {/* Utilidades e Perfil */}
              <Route path="openfinance" element={<OpenFinance />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />

              {/* Ajuste de Segurança: Normalização de Caminhos */}
              <Route path="Calculadora" element={<Navigate to="/calculadora" replace />} />
              <Route path="Calculators" element={<Navigate to="/calculadora" replace />} />
              <Route path="calculators" element={<Navigate to="/calculadora" replace />} />

              {/* Sub-rotas de Calculadoras */}
              <Route path="calculadora">
                <Route index element={<CalculadoraMenu />} />
                <Route path="anual-mensal" element={<AnualMensal />} />
                <Route path="mensal-anual" element={<MensalAnual />} />
                <Route path="contador-dias" element={<ContadorDias />} />
                <Route path="dias-faltam" element={<DiasFaltam />} />
                <Route path="decimo-terceiro" element={<DecimoTerceiro />} />
                <Route path="ferias" element={<Ferias />} />
                <Route path="ferias-proporcionais" element={<FeriasProporcionais />} />
                <Route path="fgts" element={<Fgts />} />
                <Route path="financiamento-veiculo" element={<FinanciamentoVeiculo />} />
                <Route path="emprestimo" element={<Emprestimo />} />
                <Route path="hora-extra" element={<HoraExtra />} />
                <Route path="investimento" element={<Investimento />} />
                <Route path="juros-simples" element={<JurosSimples />} />
                <Route path="juros-composto" element={<JurosComposto />} />
                <Route path="porcentagem" element={<Porcentagem />} />
                <Route path="poupanca" element={<Poupanca />} />
                <Route path="regra-tres" element={<RegraTres />} />
                <Route path="rescisao" element={<Rescisao />} />
                <Route path="salario-liquido" element={<SalarioLiquido />} />
                <Route path="taxa-equivalente" element={<TaxaEquivalente />} />
                <Route path="*" element={<Navigate to="/calculadora" replace />} />
              </Route>

              {/* Erro 404 dentro do Layout */}
              <Route path="*" element={<PageNotFound />} />
            </Route>

            {/* Erro 404 Global fora do Layout */}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}