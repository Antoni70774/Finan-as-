import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyClWIwhaPUgQcnZfJ3qfooSjDa50km7xvk",
  authDomain: "finance-app-6bdb0.firebaseapp.com",
  projectId: "finance-app-6bdb0",
  storageBucket: "finance-app-6bdb0.firebasestorage.app",
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
    // 1. Pede permissão
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permissão de notificação negada.");
      return;
    }

    // 2. Obtém o Token do FCM
    const token = await getToken(messaging, {
      vapidKey: "BGiT64eJfgOP3Wu1ldsfBDOmg-YaZkFi2TmtufwT4Ovm5UcrteP2LcqN75BZuVcxFZH3mzo_hKaxQ5HRf5smYg8"
    });

    if (token) {
      // 3. Salva no Firestore EXATAMENTE onde o servidor vai procurar
      await setDoc(doc(db, "users", user.uid, "settings", "notifications"), {
        token: token,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log("Token PWA registrado com sucesso!");
    }
  } catch (err) {
    console.error("Erro ao registrar dispositivo:", err);
  }
}