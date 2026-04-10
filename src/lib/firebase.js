import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyClWIwhaPUgQcnZfJ3qfooSjDa50km7xvk",
  authDomain: "finance-app-6bdb0.firebaseapp.com",
  projectId: "finance-app-6bdb0",
  storageBucket: "finance-app-6bdb0.appspot.com", // ✅ corrigido
  messagingSenderId: "352152062536",
  appId: "1:352152062536:web:4996f5999f22c5a5fb667d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const messaging = getMessaging(app);

export async function registerNotificationToken(user) {
  if (!user) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const token = await getToken(messaging, {
      vapidKey: "BGiT64eJfgOP3Wu1ldsfBDOmg-YaZkFi2TmtufwT4Ovm5UcrteP2LcqN75BZuVcxFZH3mzo_hKaxQ5HRf5smYg8"
    });

    if (token) {
      await setDoc(doc(db, "users", user.uid, "settings", "notifications"), {
        token: token,
        updatedAt: new Date().toISOString()
      });
      console.log("Token atualizado!");
    }
  } catch (err) {
    console.error("Erro no token:", err);
  }
}

// 🔔 RECEBE NOTIFICAÇÃO COM APP ABERTO
onMessage(messaging, (payload) => {
  console.log("🔔 Notificação recebida:", payload);

  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon-192.png"
  });
});
