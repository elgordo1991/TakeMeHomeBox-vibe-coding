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

export type LegendBoard = 'givers' | 'spotters';

// This month's top givers (boxes they put out) and top spotters (boxes they
// reported), counted from boxes within radiusKm of `center`. Based on where
// boxes were left, never on where anyone lives.
export const getLocalLegends = async (
  center: { lat: number; lng: number },
  radiusKm = LEGENDS_RADIUS_KM,
  top = 10
): Promise<Record<LegendBoard, Legend[]>> => {
  const snap = await getDocs(
    query(
      collection(db, 'listings'),
      where('status', 'in', ['active', 'taken']),
      where('createdAt', '>=', Timestamp.fromDate(startOfThisMonth())),
      orderBy('createdAt', 'desc'),
      limit(2000)
    )
  );

  const counts: Record<LegendBoard, Map<string, Legend>> = { givers: new Map(), spotters: new Map() };
  snap.forEach((d) => {
    const l = d.data();
    const c = l.location?.coordinates;
    if (!c || !l.userId) return;
    if (calculateDistance(center.lat, center.lng, c.latitude, c.longitude) > radiusKm) return;
    const board = counts[l.isSpotted ? 'spotters' : 'givers'];
    const entry = board.get(l.userId) ?? { uid: l.userId, username: l.username || 'Neighbour', boxesGiven: 0 };
    entry.boxesGiven += 1;
    board.set(l.userId, entry);
  });

  // Look up each person's public profile once (photo, rank, opt-out).
  const profileCache = new Map<string, Promise<PublicProfile | null>>();
  const profileFor = (uid: string) => {
    if (!profileCache.has(uid)) profileCache.set(uid, getPublicProfile(uid).catch(() => null));
    return profileCache.get(uid)!;
  };

  const finish = async (board: Map<string, Legend>) => {
    const ranked = [...board.values()].sort((a, b) => b.boxesGiven - a.boxesGiven).slice(0, top + 5);
    const withProfiles = await Promise.all(
      ranked.map(async (legend) => {
        const profile = await profileFor(legend.uid);
        return { ...legend, profile, username: profile?.username || legend.username, avatar: profile?.avatar };
      })
    );
    return withProfiles.filter((l) => !l.profile?.hideFromLeaderboard).slice(0, top);
  };

  const [givers, spotters] = await Promise.all([finish(counts.givers), finish(counts.spotters)]);
  return { givers, spotters };
};
