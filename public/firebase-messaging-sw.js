importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyClWIwhaPUgQcnZfJ3qfooSjDa50km7xvk",
  authDomain: "finance-app-6bdb0.firebaseapp.com",
  projectId: "finance-app-6bdb0",
  storageBucket: "finance-app-6bdb0.firebasestorage.app",
  messagingSenderId: "352152062536",
  appId: "1:352152062536:web:4996f5999f22c5a5fb667d"
});

const messaging = firebase.messaging();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Mensagem em background', payload);
  const notificationTitle = payload.notification?.title || 'Lembrete';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
