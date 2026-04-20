import express from "express";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount = null;
try {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) {
    console.error("ERRO: variável GOOGLE_APPLICATION_CREDENTIALS_JSON não definida.");
  } else {
    serviceAccount = JSON.parse(raw);
  }
} catch (err) {
  console.error("ERRO ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:", err.message);
}

if (!admin.apps.length) {
  if (serviceAccount && serviceAccount.client_email) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Admin SDK inicializado:", serviceAccount.project_id);
  }
}

app.use(express.static(path.join(__dirname, "public", "dist")));

app.get("/firebase-messaging-sw.js", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "firebase-messaging-sw.js"));
});

app.post("/send-reminders", async (req, res) => {
  console.log("🚀 Iniciando processamento de notificações agrupadas...");
  const db = admin.firestore();
  
  try {
    const usersSnapshot = await db.collection("users").get();
    let totalUsuariosNotificados = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const notifDoc = await db.collection("users").doc(userId).collection("settings").doc("notifications").get();
      
      if (!notifDoc.exists) continue;
      const token = notifDoc.data().token;
      if (!token) continue;

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let listaDeContas = [];

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        const rawDate = bill.dueDate || bill.due_date;
        if (!rawDate || bill.status === "paid") continue;

        let vencimento = typeof rawDate.toDate === "function" ? rawDate.toDate() : new Date(String(rawDate) + "T00:00:00");
        vencimento.setHours(0, 0, 0, 0);

        const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

        // Filtro de vencimento entre hoje e 5 dias
        if (diffDias >= 0 && diffDias <= 5) {
          const dataFormatada = vencimento.toLocaleDateString('pt-BR');
          const statusTexto = diffDias === 0 ? "VENCE HOJE" : `vence em ${diffDias} dias`;
          listaDeContas.push(`• ${bill.title}: ${dataFormatada} (${statusTexto})`);
        }
      }

      // Se houver contas, envia UMA única notificação para o usuário
      if (listaDeContas.length > 0) {
        const plural = listaDeContas.length > 1;
        const tituloNotificacao = plural ? "⚠️ Alerta de Vencimentos" : "⚠️ Vencimento de Conta";
        
        // Monta o corpo com as quebras de linha
        const corpoMensagem = plural 
          ? `Você possui ${listaDeContas.length} contas próximas:\n${listaDeContas.join('\n')}`
          : `Sua conta ${listaDeContas[0].replace('• ', '')} está próxima.`;

        try {
          await admin.messaging().send({
            token,
            webpush: {
              headers: { "Urgency": "high" },
              notification: {
                title: tituloNotificacao,
                body: corpoMensagem,
                icon: "https://finance-app-6bdb0.web.app/icon-192.png",
                badge: "https://finance-app-6bdb0.web.app/icon-192.png",
                tag: "vencimento-unico", // Tag fixa para atualizar a mesma notificação se rodar de novo
                renotify: true,
                requireInteraction: true,
                vibrate: [500, 110, 500, 110, 450, 110],
                data: { url: "https://finance-app-6bdb0.web.app/bills" }
              }
            }
          });
          totalUsuariosNotificados++;
          console.log(`✅ Sucesso: Enviado resumo para ${userId} (${listaDeContas.length} contas)`);
        } catch (fcmError) {
          console.error(`❌ Erro FCM para ${userId}:`, fcmError.message);
        }
      }
    }

    res.json({ status: "ok", usuarios_notificados: totalUsuariosNotificados });
  } catch (err) {
    console.error("❌ Erro geral:", err.message);
    res.status(500).send(err.message);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dist", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor Flow rodando na porta ${PORT}`));
