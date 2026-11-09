// Public profiles and the "Local legends" leaderboard.
//
// users/{uid} is private (it holds email, notification settings, etc.), so a
// separate publicProfiles/{uid} doc holds only what other people may see.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { calculateDistance } from './firestore';

export interface PublicProfile {
  uid: string;
  username: string;
  avatar?: string;
  itemsGiven: number;
  itemsTaken: number;
  memberSince?: string;
  hideFromLeaderboard?: boolean;
}

export interface Legend {
  uid: string;
  username: string;
  avatar?: string;
  boxesGiven: number;
  profile?: PublicProfile | null;
}

export const LEGENDS_RADIUS_KM = 5;

// Called whenever the signed-in user's profile changes.
export const syncPublicProfile = async (user: {
  uid: string;
  username: string;
  avatar?: string;
  itemsGiven?: number;
  itemsTaken?: number;
  createdAt?: string;
}) => {
  await setDoc(
    doc(db, 'publicProfiles', user.uid),
    {
      username: user.username || 'Neighbour',
      avatar: user.avatar || '',
      itemsGiven: user.itemsGiven || 0,
      itemsTaken: user.itemsTaken || 0,
      memberSince: user.createdAt || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const getPublicProfile = async (uid: string): Promise<PublicProfile | null> => {
  const snap = await getDoc(doc(db, 'publicProfiles', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    username: d.username || 'Neighbour',
    avatar: d.avatar || undefined,
    itemsGiven: d.itemsGiven || 0,
    itemsTaken: d.itemsTaken || 0,
    memberSince: d.memberSince || undefined,
    hideFromLeaderboard: !!d.hideFromLeaderboard,
  };
};

export const setHideFromLeaderboard = async (uid: string, hide: boolean) => {
  await setDoc(doc(db, 'publicProfiles', uid), { hideFromLeaderboard: hide, updatedAt: serverTimestamp() }, { merge: true });
};

export const startOfThisMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// Top givers this month whose boxes were left within radiusKm of `center`.
// Based on where boxes were listed, never on where anyone lives.
export const getLocalLegends = async (
  center: { lat: number; lng: number },
  radiusKm = LEGENDS_RADIUS_KM,
  top = 10
): Promise<Legend[]> => {
  const snap = await getDocs(
    query(
      collection(db, 'listings'),
      where('status', 'in', ['active', 'taken']),
      where('createdAt', '>=', Timestamp.fromDate(startOfThisMonth())),
      orderBy('createdAt', 'desc'),
      limit(2000)
    )
  );

  const counts = new Map<string, Legend>();
  snap.forEach((d) => {
    const l = d.data();
    if (l.isSpotted) return; // spotted boxes weren't given by the person reporting them
    const c = l.location?.coordinates;
    if (!c || !l.userId) return;
    if (calculateDistance(center.lat, center.lng, c.latitude, c.longitude) > radiusKm) return;
    const entry = counts.get(l.userId) ?? { uid: l.userId, username: l.username || 'Neighbour', boxesGiven: 0 };
    entry.boxesGiven += 1;
    counts.set(l.userId, entry);
  });

  const ranked = [...counts.values()].sort((a, b) => b.boxesGiven - a.boxesGiven).slice(0, top + 5);

  // Attach public profiles (photo, rank) and drop anyone who opted out.
  const withProfiles = await Promise.all(
    ranked.map(async (legend) => {
      const profile = await getPublicProfile(legend.uid).catch(() => null);
      return { ...legend, profile, username: profile?.username || legend.username, avatar: profile?.avatar };
    })
  );
  return withProfiles.filter((l) => !l.profile?.hideFromLeaderboard).slice(0, top);
};
