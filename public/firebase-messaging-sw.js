/* global importScripts */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase config for Service Worker
// Placeholders are replaced by scripts/generate-sw.js during build with values from .env
const FIREBASE_CONFIG = {
  apiKey: "___FIREBASE_API_KEY___",
  authDomain: "___FIREBASE_AUTH_DOMAIN___",
  projectId: "___FIREBASE_PROJECT_ID___",
  storageBucket: "___FIREBASE_STORAGE_BUCKET___",
  messagingSenderId: "___FIREBASE_MESSAGING_SENDER_ID___",
  appId: "___FIREBASE_APP_ID___"
};

firebase.initializeApp(FIREBASE_CONFIG);

const messaging = firebase.messaging();

// Handle background messages
// The notification is auto-displayed by the browser from the FCM notification + webpush fields.
// We do NOT call showNotification here to avoid duplicate notifications.
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If there's already a window open, focus it
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
