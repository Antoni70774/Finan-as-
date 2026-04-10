import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "./lib/query-client";
import { Toaster } from "./components/ui/toaster";

import { AuthProvider, useAuth } from "./lib/AuthContext";
import { registerNotificationToken } from "./lib/firebase";

import PageNotFound from "./lib/PageNotFound";
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

// 🔥 PROTEÇÃO
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// 🔥 NOTIFICAÇÃO
function NotificationManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      registerNotificationToken(user);
    }
  }, [user]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>

          <NotificationManager />

          <Toaster />

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="bills" element={<Bills />} />
              <Route path="goals" element={<Goals />} />
              <Route path="categories" element={<Categories />} />
              <Route path="openfinance" element={<OpenFinance />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>

        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}