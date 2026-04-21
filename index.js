import express from "express";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 FIREBASE ADMIN
let serviceAccount = null;

try {
  serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} catch (err) {
  console.error("Erro ao ler credenciais:", err.message);
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// 🔥 SERVICE WORKER (SEM CACHE)
app.get("/firebase-messaging-sw.js", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(path.join(__dirname, "public", "firebase-messaging-sw.js"));
});

// 🔥 CRON DE NOTIFICAÇÃO
app.post("/send-reminders", async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").get();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // 🔔 TOKEN
      const notifDoc = await db
        .collection("users")
        .doc(userId)
        .collection("settings")
        .doc("notifications")
        .get();

      const token = notifDoc.exists ? notifDoc.data().token : null;

      if (!token) continue;

      // 📄 CONTAS
      const billsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .get();

      let lista = [];

      billsSnapshot.forEach(doc => {
        const bill = doc.data();

        const rawDate = bill.dueDate || bill.due_date;
        if (!rawDate || bill.status === "paid") return;

        let v;

        // 🔥 CORREÇÃO DE DATA (Timestamp + string)
        if (typeof rawDate.toDate === "function") {
          v = rawDate.toDate();
        } else {
          v = new Date(String(rawDate) + "T00:00:00");
        }

        v.setHours(0, 0, 0, 0);

        const diff = Math.ceil((v - hoje) / 86400000);

        if (diff >= 0 && diff <= 5) {
          const status = diff === 0 ? "HOJE" : `${diff} dia(s)`;
          lista.push(`• ${bill.title} (${status})`);
        }
      });

      // 🔔 ENVIO
      if (lista.length > 0) {
        await admin.messaging().send({
          token,
          notification: {
            title: "⚠️ Vencimentos próximos",
            body: lista.length === 1
              ? lista[0].replace("• ", "")
              : `${lista.length} contas próximas`
          },
          data: {
            url: "/bills"
          },
          android: {
            priority: "high"
          },
          webpush: {
            headers: {
              Urgency: "high"
            }
          }
        });

        console.log(`Notificação enviada para usuário ${userId}`);
      }
    }

    return res.status(200).send("OK");

  } catch (err) {
    console.error("Erro no cron:", err);
    return res.status(200).send("OK"); // evita erro no cron-job.org
  }
});

// 🔥 FRONT (IMPORTANTE ORDEM)
app.use(express.static(path.join(__dirname, "public", "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dist", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Flow rodando"));
