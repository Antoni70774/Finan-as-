import express from "express";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 Firebase Admin
let serviceAccount = null;
try {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (raw) serviceAccount = JSON.parse(raw);
} catch (err) {
  console.error("Erro credenciais:", err.message);
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// 🔥 Service Worker SEM CACHE
app.get("/firebase-messaging-sw.js", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "firebase-messaging-sw.js"));
});

// 🔥 CRON ROUTE (SEM DUPLICAÇÃO + SOMENTE DATA)
app.post("/send-reminders", async (req, res) => {
  const db = admin.firestore();

  try {
    const usersSnapshot = await db.collection("users").get();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      const notifDoc = await db
        .collection("users")
        .doc(userId)
        .collection("settings")
        .doc("notifications")
        .get();

      const token = notifDoc.data()?.token;
      if (!token) continue;

      const billsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .get();

      let lista = [];

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();

        const rawDate = bill.dueDate || bill.due_date;
        if (!rawDate || bill.status === "paid") continue;

        let vencimento =
          typeof rawDate.toDate === "function"
            ? rawDate.toDate()
            : new Date(rawDate + "T00:00:00");

        vencimento.setHours(0, 0, 0, 0);

        const diff = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

        if (diff >= 0 && diff <= 5) {
          const status = diff === 0 ? "HOJE" : `em ${diff} dias`;

          lista.push(
            `• ${bill.title}: ${vencimento.toLocaleDateString(
              "pt-BR"
            )} (${status})`
          );
        }
      }

      if (lista.length > 0) {
        const plural = lista.length > 1;

        await admin.messaging().send({
          token,
          data: {
            title: "Flow",
            body: plural
              ? `⚠️ ${lista.length} contas próximas:\n${lista.join("\n")}`
              : `⚠️ ${lista[0].replace("• ", "")}`,
            url: "/bills"
          }
        });
      }
    }

    return res.status(200).end();
  } catch (err) {
    console.error("Erro:", err.message);
    return res.status(500).end();
  }
});

// 🔥 FRONT
app.use(express.static(path.join(__dirname, "public", "dist")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "dist", "index.html"))
);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Flow rodando"));
