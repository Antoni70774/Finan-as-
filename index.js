import express from "express";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

// Carrega a credencial da variável de ambiente do Render
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

app.post("/send-reminders", async (req, res) => {
  console.log("Iniciando verificação de contas...");
  const db = admin.firestore();
  try {
    const usersSnapshot = await db.collection("users").get();
    let disparos = 0;

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

        // Regra: vence em até 5 dias
        if (diffDias >= 0 && diffDias <= 5) {
          await admin.messaging().send({
            token: token,
            notification: {
              title: "Lembrete de Conta",
              body: `${bill.description} vence em ${diffDias} dias.`
            }
          });
          disparos++;
        }
      }
    }
    console.log(`Sucesso! Foram enviados ${disparos} lembretes.`);
    res.status(200).send(`OK: ${disparos} disparos.`);
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
