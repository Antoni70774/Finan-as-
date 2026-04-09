import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Bell, Shield, Palette } from "lucide-react";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase"; // Certifique-se que o messaging está exportado em lib/firebase.js
import { useToast } from "@/components/ui/use-toast";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [currency, setCurrency] = useState("BRL");
  const { toast } = useToast();

  const VAPID_KEY = "BLXZ-etNDaylrgEYXUrQCU19E7OhOfH7wl2sk2PPhAnH8H8uCblERhx-AvDR87LlxkLL4fywKERuqo2XTDr9zCc";

  useEffect(() => {
    // Carregar Tema
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);

    // Carregar Moeda
    const savedCurrency = localStorage.getItem("currency");
    if (savedCurrency) setCurrency(savedCurrency);

    // Verificar status real da permissão de notificação no navegador
    if ("Notification" in window) {
      setNotifications(Notification.permission === "granted");
    }
  }, []);

  const toggleDarkMode = (enabled) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleEnableNotifications = async () => {
	  try {
		// 1. Pedir permissão PRIMEIRO
		const permission = await Notification.requestPermission();
		
		if (permission === "granted") {
		  // 2. Garantir que o Service Worker está pronto
		  const registration = await navigator.serviceWorker.ready;
		  
		  // 3. Obter o token
		  const token = await getToken(messaging, {
			vapidKey: "BLXZ-etNDaylrgEYXUrQCU19E7OhOfH7wl2sk2PPhAnH8H8uCblERhx-AvDR87LlxkLL4fywKERuqo2XTDr9zCc",
			serviceWorkerRegistration: registration,
		  });

		  if (token) {
			console.log("Token gerado:", token);
			setNotifications(true);
			toast({ title: "Notificações ativadas!" });
		  }
		}
	  } catch (error) {
		console.error("Erro detalhado:", error);
		// Se o erro persistir, verifique se a VAPID KEY no console do Firebase 
		// não foi deletada ou gerada novamente após o print.
	  }
	};

  const toggleNotifications = (enabled) => {
    if (enabled) {
      handleEnableNotifications();
    } else {
      setNotifications(false);
      localStorage.setItem("notifications", "false");
      toast({
        title: "Aviso",
        description: "Para bloquear totalmente, altere as permissões do site no seu navegador.",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize sua experiência</p>
      </div>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" /> Aparência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <div>
                <p className="text-sm font-medium">Modo Escuro</p>
                <p className="text-xs text-muted-foreground">Alternar entre tema claro e escuro</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Lembretes de Contas</p>
              <p className="text-xs text-muted-foreground">Receba alertas sobre contas próximas do vencimento</p>
            </div>
            <Switch checked={notifications} onCheckedChange={toggleNotifications} />
          </div>
        </CardContent>
      </Card>

      {/* Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Moeda Padrão</p>
              <p className="text-xs text-muted-foreground">Moeda usada para exibição de valores</p>
            </div>
            <Select
              value={currency}
              onValueChange={(v) => {
                setCurrency(v);
                localStorage.setItem("currency", v);
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Selecionar moeda" />
              </SelectTrigger>
              <SelectContent forceMount>
                <SelectItem value="BRL">BRL (R$)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}