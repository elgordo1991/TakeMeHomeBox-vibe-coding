// "New box near you" push notifications (Firebase Cloud Messaging).
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { doc, getDoc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import app, { db } from '../firebase.config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const TOKEN_KEY = 'tmhb-push-token';

export const RADIUS_OPTIONS = [1, 3, 5] as const;

export interface NotifySettings {
  enabled: boolean;
  radiusKm: number;
}

export type PushAvailability = 'ok' | 'ios-needs-install' | 'unsupported' | 'not-configured' | 'blocked';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export const getPushAvailability = async (): Promise<PushAvailability> => {
  if (!VAPID_KEY || !app) return 'not-configured';
  // iPhone only supports web push once the app is on the Home Screen.
  if (isIos() && !isStandalone()) return 'ios-needs-install';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  if (!(await isSupported().catch(() => false))) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return 'ok';
};

export const loadNotifySettings = async (uid: string): Promise<NotifySettings> => {
  const snap = await getDoc(doc(db, 'users', uid));
  const notify = snap.data()?.notify;
  const thisDeviceSubscribed = (() => {
    try {
      return !!localStorage.getItem(TOKEN_KEY);
    } catch {
      return false;
    }
  })();
  return {
    enabled: !!notify?.enabled && thisDeviceSubscribed,
    radiusKm: notify?.radiusKm ?? 3,
  };
};

const currentPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 })
  );

export const enablePush = async (uid: string, radiusKm: number): Promise<void> => {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'blocked' : 'not-granted');
  }

  let position: GeolocationPosition;
  try {
    position = await currentPosition();
  } catch {
    throw new Error('no-location');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error('no-token');

  await setDoc(
    doc(db, 'users', uid),
    {
      notify: {
        enabled: true,
        radiusKm,
        // Rounded to ~100 m: enough to find nearby boxes without storing an exact address.
        location: {
          latitude: Math.round(position.coords.latitude * 1000) / 1000,
          longitude: Math.round(position.coords.longitude * 1000) / 1000,
        },
        updatedAt: serverTimestamp(),
      },
      pushTokens: arrayUnion(token),
    },
    { merge: true }
  );

  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
};

export const updateRadius = async (uid: string, radiusKm: number) => {
  await setDoc(doc(db, 'users', uid), { notify: { radiusKm, updatedAt: serverTimestamp() } }, { merge: true });
};

export const disablePush = async (uid: string): Promise<void> => {
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }

  await setDoc(
    doc(db, 'users', uid),
    {
      notify: { enabled: false, updatedAt: serverTimestamp() },
      ...(token ? { pushTokens: arrayRemove(token) } : {}),
    },
    { merge: true }
  );

  if (token) {
    await deleteToken(getMessaging(app)).catch(() => undefined);
  }
};
