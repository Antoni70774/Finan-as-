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

app.use(express.static(path.join(__dirname, "public", "dist")));

app.get("/firebase-messaging-sw.js", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.sendFile(path.join(__dirname, "public", "firebase-messaging-sw.js"));
});

app.post("/send-reminders", async (req, res) => {
  const db = admin.firestore();
  try {
    const usersSnapshot = await db.collection("users").get();
    let total = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const notifDoc = await db.collection("users").doc(userId).collection("settings").doc("notifications").get();
      const token = notifDoc.exists ? notifDoc.data().token : null;
      if (!token) continue;

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let contas = [];
      billsSnapshot.forEach(billDoc => {
        const bill = billDoc.data();
        const rawDate = bill.dueDate || bill.due_date;
        if (rawDate && bill.status !== "paid") {
          let venci = typeof rawDate.toDate === "function" ? rawDate.toDate() : new Date(String(rawDate) + "T00:00:00");
          venci.setHours(0, 0, 0, 0);
          const diff = Math.ceil((venci - hoje) / (1000 * 60 * 60 * 24));
          if (diff >= 0 && diff <= 5) {
            contas.push(`• ${bill.title}: ${venci.toLocaleDateString('pt-BR')} (${diff === 0 ? "HOJE" : "em " + diff + " dias"})`);
          }
        }
      });

      if (contas.length > 0) {
        const titulo = contas.length > 1 ? "⚠️ Alerta de Vencimentos" : "⚠️ Vencimento de Conta";
        const corpo = contas.length > 1 
          ? `Você possui ${contas.length} contas próximas:\n${contas.join('\n')}`
          : `Sua conta ${contas[0].replace('• ', '')} está próxima.`;

        await admin.messaging().send({
          token,
          // Movemos tudo para 'data' para o Service Worker tratar e remover o link do Chrome
          data: {
            title: titulo,
            body: corpo,
            icon: "https://finance-app-6bdb0.web.app/icon-192.png",
            badge: "https://finance-app-6bdb0.web.app/icon-192.png",
            url: "https://finance-app-6bdb0.web.app/bills"
          }
        });
        total++;
      }
    }
    res.json({ status: "ok", enviados: total });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "dist", "index.html")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Flow rodando na porta ${PORT}`));
