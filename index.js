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

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public", "dist")));

// Service Worker do Firebase Messaging
app.get("/firebase-messaging-sw.js", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.sendFile(path.join(__dirname, "public", "firebase-messaging-sw.js"));
});

// Rota de lembretes revisada
app.post("/send-reminders", async (req, res) => {
  const db = admin.firestore();

  try {
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      const notifDoc = await db
        .collection("users")
        .doc(userId)
        .collection("settings")
        .doc("notifications")
        .get();

      const token = notifDoc.exists ? notifDoc.data().token : null;
      if (!token) continue;

      const billsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .get();

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let lista = [];

      billsSnapshot.forEach(doc => {
        const bill = doc.data();
        const raw = bill.dueDate || bill.due_date;

        if (raw && bill.status !== "paid") {
          let data = typeof raw.toDate === "function"
            ? raw.toDate()
            : new Date(raw + "T00:00:00");

          data.setHours(0, 0, 0, 0);

          const diff = Math.ceil((data - hoje) / (1000 * 60 * 60 * 24));

          if (diff >= 0 && diff <= 5) {
            const status = diff === 0 ? "HOJE" : `em ${diff} dias`;
            lista.push(`• ${bill.title}: ${data.toLocaleDateString("pt-BR")} (${status})`);
          }
        }
      });

      if (lista.length > 0) {
        await admin.messaging().send({
		  token,

		  data: {
			title: "⚠️ Alerta de Contas",
			body: lista.join("\n"),
			url: "/bills"
		  },

		  android: {
			priority: "high",
			collapseKey: "flow_alert" // 🔥 IMPEDE DUPLICAÇÃO
		  }
		});
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro");
  }
});

// SPA fallback
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "dist", "index.html")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Flow online`));
