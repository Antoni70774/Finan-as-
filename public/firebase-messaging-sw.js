importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyClWIwhaPUgQcnZfJ3qfooSjDa50km7xvk",
  authDomain: "finance-app-6bdb0.firebaseapp.com", // ✅ igual ao firebase.js
  projectId: "finance-app-6bdb0",
  storageBucket: "finance-app-6bdb0.appspot.com",   // ✅ igual ao firebase.js
  messagingSenderId: "352152062536",
  appId: "1:352152062536:web:4996f5999f22c5a5fb667d"
});

const messaging = firebase.messaging();

// 🔔 Notificações em segundo plano (quando app está fechado)
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Notificação recebida em segundo plano:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: "https://finance-app-6bdb0.web.app/bills" }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
