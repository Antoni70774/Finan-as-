const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// Verifica se a variável de ambiente existe para não quebrar o código
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!credentialsJson) {
  console.error("ERRO: Variável GOOGLE_APPLICATION_CREDENTIALS_JSON não configurada!");
}

const serviceAccount = JSON.parse(credentialsJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.post("/send-reminders", async (req, res) => {
  const db = admin.firestore();
  try {
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const notifDoc = await db.collection("users").doc(userId)
                               .collection("settings").doc("notifications").get();

      const token = notifDoc.exists ? notifDoc.data().token : null;
      if (!token) continue;

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      const hoje = new Date();

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        if (!bill.dueDate) continue;

        const vencimento = new Date(bill.dueDate);
        const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

        if (diffDias > 0 && diffDias <= 3) {
          const message = {
            token,
            notification: {
              title: "Conta vencendo!",
              body: `Sua conta "${bill.description}" vence em ${diffDias} dia(s).`,
            },
            webpush: {
              fcmOptions: { link: "https://finance-app-6bdb0.web.app/bills" }
            }
          };
          await admin.messaging().send(message);
        }
      }
    }
    res.send("Lembretes processados!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro interno");
  }
});

// O Render exige usar a porta da variável de ambiente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));