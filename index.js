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
  if (raw) serviceAccount = JSON.parse(raw);
} catch (err) {
  console.error("Erro Credenciais:", err.message);
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// 1. Rota do Service Worker (com cache desativado)
app.get("/firebase-messaging-sw.js", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.sendFile(path.join(__dirname, "public", "firebase-messaging-sw.js"));
});

// 2. Rota de Lembretes (CORRIGIDA PARA CRON-JOB)
app.post("/send-reminders", async (req, res) => {
  const db = admin.firestore();
  try {
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const notifDoc = await db.collection("users").doc(userId).collection("settings").doc("notifications").get();
      const token = notifDoc.exists ? notifDoc.data().token : null;
      if (!token) continue;

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let listaContas = [];
      billsSnapshot.forEach(billDoc => {
        const bill = billDoc.data();
        const rawDate = bill.dueDate || bill.due_date;
        if (rawDate && bill.status !== "paid") {
          let venci = typeof rawDate.toDate === "function" ? rawDate.toDate() : new Date(String(rawDate) + "T00:00:00");
          venci.setHours(0, 0, 0, 0);
          const diff = Math.ceil((venci - hoje) / (1000 * 60 * 60 * 24));
          
          if (diff >= 0 && diff <= 5) {
            const status = diff === 0 ? "HOJE" : `em ${diff} dias`;
            listaContas.push(`• ${bill.title}: ${venci.toLocaleDateString('pt-BR')} (${status})`);
          }
        }
      });

      if (listaContas.length > 0) {
        const plural = listaContas.length > 1;
        await admin.messaging().send({
          token,
          data: {
            title: plural ? "⚠️ Alerta de Vencimentos" : "⚠️ Vencimento de Conta",
            body: plural 
              ? `Você possui ${listaContas.length} contas próximas:\n${listaContas.join('\n')}`
              : `Sua conta ${listaContas[0].replace('• ', '')} está próxima.`,
            url: "https://finance-app-6bdb0.web.app/bills"
          }
        });
      }
    }
    // RETORNO LIMPO: Envia apenas status 200 e termina a conexão imediatamente
    return res.status(200).end(); 
  } catch (err) {
    console.error("Erro:", err.message);
    return res.status(500).end();
  }
});

// 3. Arquivos Estáticos e SPA (Sempre por último)
app.use(express.static(path.join(__dirname, "public", "dist")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "dist", "index.html")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Flow Ativo`));
