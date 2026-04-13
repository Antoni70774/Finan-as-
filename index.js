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
      
      // Busca as configurações de notificação do usuário
      const notifDoc = await db.collection("users").doc(userId).collection("settings").doc("notifications").get();
      
      if (!notifDoc.exists) continue;
      const token = notifDoc.data().token;
      if (!token || token === "") {
        console.log(`Usuário ${userId} sem token registrado. Pulando...`);
        continue;
      }

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      
      // Define a data de hoje com hora zerada
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        
        // Verifica tanto dueDate quanto due_date
        const rawDate = bill.dueDate || bill.due_date;
        if (!rawDate || bill.status === "paid") continue;

        // CORREÇÃO: trata Timestamp ou string
        let vencimento;
        if (rawDate.toDate) {
          vencimento = rawDate.toDate();
        } else {
          vencimento = new Date(rawDate + "T00:00:00");
        }
        vencimento.setHours(0, 0, 0, 0);

        // Calcula diferença em dias
        const diffMs = vencimento - hoje;
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDias >= 0 && diffDias <= 5) {
          try {
            await admin.messaging().send({
              token,
              notification: {
                title: "Lembrete de Conta",
                body: `${bill.title || "Uma conta"} vence em ${diffDias === 0 ? "HOJE" : diffDias + " dias"}.`
              },
              webpush: {
                notification: {
                  icon: "https://finance-app-6bdb0.web.app/icon-192.png",
                  click_action: "https://finance-app-6bdb0.web.app/bills"
                }
              }
            });
            disparos++;
          } catch (fcmError) {
            console.error(`Erro ao enviar para o token do usuário ${userId}:`, fcmError.message);
          }
        }
      }
    }

    console.log(`Sucesso! Foram enviados ${disparos} lembretes.`);
    res.json({ status: "ok", disparos });
  } catch (err) {
    console.error("Erro geral no servidor:", err);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
