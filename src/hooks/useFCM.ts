import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase/config';
import { useAuth } from './useAuth';
import { saveFCMToken } from '../firebase/firestore';

export function useFCM() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const setupFCM = async () => {
      try {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
          console.log('This browser does not support notifications');
          return;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        // Get FCM token
        const messaging = getMessaging(app);
        const fcmToken = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });

        if (fcmToken) {
          setToken(fcmToken);
          // Save to Firestore under user's profile
          const platform = navigator.platform;
          await saveFCMToken(user.uid, fcmToken, platform);
          console.log('FCM Token saved:', fcmToken);
        }
      } catch (error) {
        console.error('FCM setup error:', error);
      }
    };

    setupFCM();

    // Listen for foreground messages
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, () => {
      // console.log('Foreground notification received:', payload);
      // In-app notification will be handled by the notification bell component
    });

    return () => unsubscribe();
  }, [user]);

  return { token };
}
