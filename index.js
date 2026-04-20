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
    let totalRemetidos = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const notifDoc = await db.collection("users").doc(userId).collection("settings").doc("notifications").get();
      const token = notifDoc.exists ? notifDoc.data().token : null;
      if (!token) continue;

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let contasParaNotificar = [];
      billsSnapshot.forEach(billDoc => {
        const bill = billDoc.data();
        const rawDate = bill.dueDate || bill.due_date;
        if (rawDate && bill.status !== "paid") {
          let venci = typeof rawDate.toDate === "function" ? rawDate.toDate() : new Date(String(rawDate) + "T00:00:00");
          venci.setHours(0, 0, 0, 0);
          const diff = Math.ceil((venci - hoje) / (1000 * 60 * 60 * 24));
          
          if (diff >= 0 && diff <= 5) {
            const prazo = diff === 0 ? "HOJE" : `em ${diff} dias`;
            contasParaNotificar.push(`• ${bill.title}: ${venci.toLocaleDateString('pt-BR')} (${prazo})`);
          }
        }
      });

      if (contasParaNotificar.length > 0) {
        const plural = contasParaNotificar.length > 1;
        const msgCorpo = plural 
          ? `Você possui ${contasParaNotificar.length} contas próximas:\n${contasParaNotificar.join('\n')}`
          : `Sua conta ${contasParaNotificar[0].replace('• ', '')} está próxima.`;

        // ENVIO APENAS DE DATA - Isso mata a notificação duplicada e o link do navegador
        await admin.messaging().send({
          token,
          data: {
            title: "⚠️ Alerta de Vencimentos",
            body: msgCorpo,
            url: "https://finance-app-6bdb0.web.app/bills"
          }
        });
        totalRemetidos++;
      }
    }
    res.json({ status: "ok", processados: totalRemetidos });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "dist", "index.html")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Flow rodando na porta ${PORT}`));
