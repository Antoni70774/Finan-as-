const express = require("express");
const admin = require("firebase-admin");
const app = express();
app.use(express.json());

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.post("/send-reminders", async (req, res) => {
  const db = admin.firestore();
  try {
    const usersSnapshot = await db.collection("users").get();
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const notifDoc = await db.collection("users").doc(userId).collection("settings").doc("notifications").get();
      
      if (!notifDoc.exists) continue;
      const token = notifDoc.data().token;

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      const hoje = new Date();

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        if (!bill.dueDate) continue;

        const vencimento = new Date(bill.dueDate);
        const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

        if (diffDias >= 0 && diffDias <= 5) { // Enviando com margem de 5 dias para teste
          await admin.messaging().send({
            token: token,
            notification: {
              title: "Lembrete de Conta",
              body: `${bill.description} vence em ${diffDias} dias.`
            }
          });
        }
      }
    }
    res.send("OK");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(process.env.PORT || 3000);