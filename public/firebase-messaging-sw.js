importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyClWIwhaPUgQcnZfJ3qfooSjDa50km7xvk",
  projectId: "finance-app-6bdb0",
  messagingSenderId: "352152062536",
  appId: "1:352152062536:web:4996f5999f22c5a5fb667d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192.png", 
    vibrate: [200, 100, 200],
    data: { url: "https://finance-app-6bdb0.web.app/bills" }
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});