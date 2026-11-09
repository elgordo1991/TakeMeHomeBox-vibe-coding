// Sends "new box near you" push notifications when a listing is created.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

// The app uses a named Firestore database (see firebase.json), not "(default)".
const DATABASE_ID = 'takemehomeboxvibe-coding';
const db = getFirestore(DATABASE_ID);

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

const distanceKm = (a, b) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const formatDistance = (km) => (km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m away` : `${km.toFixed(1)} km away`);

exports.notifyNearbyOnNewListing = onDocumentCreated(
  {
    document: 'listings/{listingId}',
    database: DATABASE_ID,
    region: 'us-central1', // matches the database's nam5 location
  },
  async (event) => {
    const listing = event.data && event.data.data();
    if (!listing || listing.status !== 'active') return;

    const where = listing.location && listing.location.coordinates;
    if (!where || typeof where.latitude !== 'number' || typeof where.longitude !== 'number') {
      logger.warn('Listing has no coordinates, skipping', { listingId: event.params.listingId });
      return;
    }

    const subscribers = await db.collection('users').where('notify.enabled', '==', true).get();

    // token -> { userId, km }
    const targets = new Map();
    subscribers.forEach((doc) => {
      if (doc.id === listing.userId) return; // don't notify people about their own box
      const user = doc.data();
      const home = user.notify && user.notify.location;
      const tokens = Array.isArray(user.pushTokens) ? user.pushTokens : [];
      if (!home || tokens.length === 0) return;
      const km = distanceKm(home, where);
      const radius = Number(user.notify.radiusKm) || 3;
      if (km > radius) return;
      tokens.forEach((token) => targets.set(token, { userId: doc.id, km }));
    });

    if (targets.size === 0) {
      logger.info('No nearby subscribers', { listingId: event.params.listingId });
      return;
    }

    const title = listing.isSpotted ? '👀 Box spotted near you' : '📦 New box near you';
    const name = listing.title && listing.title !== 'Untitled Box' ? listing.title : 'A free box';
    const tokens = [...targets.keys()];
    const deadByUser = new Map();
    let sent = 0;

    // FCM accepts up to 500 tokens per call.
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      // Each person gets their own distance, so send one message per token.
      const messages = batch.map((token) => ({
        token,
        data: {
          title,
          body: `${name} · ${formatDistance(targets.get(token).km)}`,
          url: '/map',
          listingId: event.params.listingId,
        },
        webpush: { headers: { Urgency: 'high', TTL: String(6 * 60 * 60) } },
      }));
      const res = await getMessaging().sendEach(messages);
      sent += res.successCount;
      res.responses.forEach((r, idx) => {
        if (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code)) {
          const token = batch[idx];
          const { userId } = targets.get(token);
          if (!deadByUser.has(userId)) deadByUser.set(userId, []);
          deadByUser.get(userId).push(token);
        }
      });
    }

    // Clean up tokens from uninstalled apps / revoked permissions.
    await Promise.all(
      [...deadByUser.entries()].map(([userId, dead]) =>
        db.collection('users').doc(userId).update({ pushTokens: FieldValue.arrayRemove(...dead) })
      )
    );

    logger.info('New box alerts sent', {
      listingId: event.params.listingId,
      sent,
      removedTokens: [...deadByUser.values()].reduce((n, t) => n + t.length, 0),
    });
  }
);
