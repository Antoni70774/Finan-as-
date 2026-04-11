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
      
      // Se não houver documento de settings ou se o token estiver vazio, pula o usuário
      if (!notifDoc.exists) continue;
      const token = notifDoc.data().token;
      if (!token || token === "") {
        console.log(`Usuário ${userId} sem token registrado. Pulando...`);
        continue;
      }

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      
      // Define a data de hoje com hora zerada para comparação precisa
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        
        // CORREÇÃO: Verifica tanto dueDate quanto due_date
        const rawDate = bill.dueDate || bill.due_date;
        
        // Pula se não tiver data, ou se a conta já estiver marcada como paga
        if (!rawDate || bill.status === "paid") continue;

        const vencimento = new Date(rawDate);
        vencimento.setHours(0, 0, 0, 0);

        // Calcula a diferença em dias
        const diffMs = vencimento - hoje;
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Regra: vence hoje (0) ou em até 5 dias
        if (diffDias >= 0 && diffDias <= 5) {
          try {
            await admin.messaging().send({
              token: token,
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
            // Se o token for inválido/expirado, você poderia removê-lo do banco aqui
          }
        }
      }
    }

    console.log(`Sucesso! Foram enviados ${disparos} lembretes.`);
    res.status(200).send(`OK: ${disparos} disparos.`);
  } catch (err) {
    console.error("Erro geral no servidor:", err);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
