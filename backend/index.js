import express from "express";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.get("/send-reminders", async (req, res) => {
  const db = admin.firestore();
  let disparos = 0;

  const usersSnapshot = await db.collection("users").get();

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;

    const notifDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("notifications")
      .get();

    if (!notifDoc.exists) continue;

    const token = notifDoc.data().token;

    const billsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("bills")
      .get();

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    for (const billDoc of billsSnapshot.docs) {
      const bill = billDoc.data();

      if (!bill.due_date) continue;

      const vencimento = new Date(bill.due_date + "T00:00:00");

      const diffDias = Math.floor(
        (vencimento - hoje) / (1000 * 60 * 60 * 24)
      );

      console.log("Conta:", bill.title, diffDias);

      if (diffDias >= 0 && diffDias <= 5) {
        await admin.messaging().send({
          token,
          notification: {
            title: "Lembrete",
            body: `${bill.title} vence em ${diffDias} dias`
          }
        });

        disparos++;
      }
    }
  }

  console.log("Total enviados:", disparos);
  res.send(`OK: ${disparos}`);
});

app.listen(10000, () => console.log("Rodando"));