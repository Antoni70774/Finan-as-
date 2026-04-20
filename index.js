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

// Rota corrigida para disparo imediato
app.post("/send-reminders", async (req, res) => {
  console.log("🚀 Iniciando verificação de contas...");
  const db = admin.firestore();
  
  try {
    const usersSnapshot = await db.collection("users").get();
    let disparos = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const notifDoc = await db.collection("users").doc(userId).collection("settings").doc("notifications").get();
      
      if (!notifDoc.exists) continue;
      const token = notifDoc.data().token;
      if (!token) continue;

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        const rawDate = bill.dueDate || bill.due_date;
        if (!rawDate || bill.status === "paid") continue;

        let vencimento = typeof rawDate.toDate === "function" ? rawDate.toDate() : new Date(String(rawDate) + "T00:00:00");
        vencimento.setHours(0, 0, 0, 0);

        const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

        // Filtro de 0 a 5 dias para o vencimento
        if (diffDias >= 0 && diffDias <= 5) {
          try {
            const dataVencimentoFormatada = vencimento.toLocaleDateString('pt-BR');
            const diasTexto = diffDias === 0 ? "HOJE" : `em ${diffDias} dias`;

            await admin.messaging().send({
              token,
              webpush: {
                headers: {
                  "Urgency": "high"
                },
                notification: {
                  title: "Vencimento de Conta",
                  body: `Sua conta de "${bill.title}" vence ${diasTexto} (${dataVencimentoFormatada}).`,
                  icon: "https://finance-app-6bdb0.web.app/icon-192.png",
                  badge: "https://finance-app-6bdb0.web.app/icon-192.png",
                  tag: billDoc.id,
                  renotify: true,
                  requireInteraction: true,
                  vibrate: [500, 110, 500, 110, 450, 110],
                  data: {
                    url: "https://finance-app-6bdb0.web.app/bills"
                  }
                }
              }
            });
            disparos++;
            console.log(`✅ Lembrete enviado: ${bill.title} para ${userId}`);
          } catch (fcmError) {
            console.error(`❌ Erro no token de ${userId}:`, fcmError.message);
          }
        }
      }
    }

    res.json({ status: "ok", disparos });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dist", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
