importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "SUA_API_KEY",
  projectId: "finance-app-6bdb0",
  messagingSenderId: "352152062536",
  appId: "1:352152062536:web:4996f5999f22c5a5fb667d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon-192.png",
    data: { url: "/bills" }
  });
});

// 🔥 abrir tela ao clicar
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/bills")
  );
});