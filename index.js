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

app.get("/", (req, res) => res.send("Servidor ativo. Use /send-reminders (GET) ou /test-send (POST)"));

app.get("/send-reminders", async (req, res) => {
  console.log("Iniciando verificação de contas...");
  const db = admin.firestore();
  let disparos = 0;

  try {
    const usersSnapshot = await db.collection("users").get();
    console.log("Usuários encontrados:", usersSnapshot.size);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const notifRef = db.collection("users").doc(userId).collection("settings").doc("notifications");
      const notifDoc = await notifRef.get();

      if (!notifDoc.exists) {
        console.log(`Sem documento de notifications para user ${userId}`);
        continue;
      }

      const token = notifDoc.data().token;
      if (!token || typeof token !== "string" || token.trim() === "") {
        console.log(`Token ausente ou inválido para user ${userId}:`, token);
        continue;
      }

      const billsSnapshot = await db.collection("users").doc(userId).collection("bills").get();
      console.log(`User ${userId} - contas encontradas: ${billsSnapshot.size}`);

      const hoje = new Date();
      hoje.setHours(0,0,0,0);

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        if (!bill.due_date && !bill.dueDate) continue;

        // aceita ambos os nomes por segurança
        const due = bill.due_date || bill.dueDate;
        const vencimento = new Date(due + "T00:00:00");
        const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

        console.log(`User ${userId} - Conta: ${bill.title || bill.description || 'sem título'} - diffDias: ${diffDias}`);

        if (diffDias >= 0 && diffDias <= 5) {
          try {
            const resp = await admin.messaging().send({
              token,
              notification: {
                title: "Lembrete de Conta",
                body: `${bill.title || bill.description || 'Conta'} vence em ${diffDias} dias.`
              }
            });
            console.log("Enviado para user", userId, "resp:", resp);
            disparos++;
          } catch (err) {
            console.error("Erro ao enviar para token:", token, "user:", userId, err.code || err.message || err);
            // remover token inválido para evitar tentativas repetidas
            const code = err.code || "";
            if (code.includes("registration-token-not-registered") || code.includes("invalid-argument") || code.includes("messaging/invalid-registration-token")) {
              try {
                await notifRef.delete();
                console.log("Token removido do Firestore para user", userId);
              } catch (delErr) {
                console.error("Erro ao remover token inválido:", delErr);
              }
            }
          }
        }
      }
    }

    console.log(`Sucesso! Foram enviados ${disparos} lembretes.`);
    res.status(200).send(`OK: ${disparos}`);
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).send("Erro interno");
  }
});

// Rota para testar envio a um token específico
app.post("/test-send", async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).send("Falta token no body");
  try {
    const resp = await admin.messaging().send({
      token,
      notification: { title: "Teste", body: "Mensagem de teste" }
    });
    res.send({ ok: true, resp });
  } catch (err) {
    console.error("Erro test-send:", err);
    res.status(500).send({ ok: false, error: err.code || err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
