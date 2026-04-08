const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// Inicializa Firebase Admin com credenciais vindas da variável de ambiente
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Endpoint para enviar lembretes de contas
app.post("/send-reminders", async (req, res) => {
  const db = admin.firestore();

  try {
    // Busca todos os usuários
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Busca token de notificação salvo em settings
      const notifDoc = await db
        .collection("users")
        .doc(userId)
        .collection("settings")
        .doc("notifications")
        .get();

      const token = notifDoc.exists ? notifDoc.data().token : null;
      if (!token) continue;

      // Busca contas do usuário
      const billsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .get();

      const hoje = new Date();
      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        if (!bill.dueDate) continue;

        const vencimento = new Date(bill.dueDate);
        const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

        // Se a conta vence em até 3 dias, dispara notificação
        if (diffDias > 0 && diffDias <= 3) {
          const message = {
            token,
            notification: {
              title: "Conta vencendo!",
              body: `Sua conta "${bill.description}" vence em ${diffDias} dia(s).`,
            },
            webpush: {
              fcmOptions: {
                link: "https://finance-app-6bdb0.web.app/bills"
              }
            }
          };

          await admin.messaging().send(message);
          console.log(`Notificação enviada para ${userId}`);
        }
      }
    }

    res.send("Lembretes processados com sucesso!");
  } catch (err) {
    console.error("Erro ao enviar notificações:", err);
    res.status(500).send("Erro ao enviar notificações");
  }
});

// Render vai rodar na porta 3000
app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
