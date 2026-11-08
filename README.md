# TakeMeHomeBox 📦

A community app for the boxes of free stuff people leave outside their homes. List a box you've put out, report one you've spotted, and find treasures near you on a map.

**Live:** https://takemehomeboxvibe-coding.web.app (custom domain `tmhb.xyz` in progress)

## Features

- **Map of nearby boxes** with live updates, search and category filters
- **List a box or report a spotted one.** Only a location is required; listings expire after 48 hours
- **Box quality ratings:** 🗑️ Junk · 💩 Poor · 📦 Okay · ✨ Great · 💎 Treasure (you can't rate your own box)
- **Mark as found** to take a box off the map
- **Profiles with ranks** earned through activity: 🆕 Noob → 🧹 Forager (5) → 🎒 Scavenger (15) → 🪙 Giver (25) → 💎 Treasure Hunter (50)
- **Installable app** (Add to Home Screen) with an offline screen
- **"New box near you" push notifications** within 1, 3 or 5 km (iPhone needs the app on the Home Screen, iOS 16.4+)

## Tech stack

- React 18, TypeScript, Tailwind CSS, Vite
- Firebase Authentication (email and password)
- Cloud Firestore, using a **named database** `takemehomeboxvibe-coding` (not `(default)`)
- Firebase Cloud Messaging and Cloud Functions (2nd gen) for notifications
- Firebase Hosting, deployed by GitHub Actions
- Google Maps JavaScript API and Geocoding API

## Project layout

```
src/                  React app
  components/         Screens (MapView, AddListing, Profile, ...) and UI pieces
  services/           firestore.ts (data), push.ts (notifications)
  utils/              dates, ratings, Google Maps helpers
public/               Icons, manifest, service worker (sw.js), offline page
functions/            Cloud Function that sends "new box near you" alerts
firestore.rules       Database security rules
firestore.indexes.json  Composite indexes the queries need
```

## Deployment

Hosting deploys automatically through GitHub Actions:

- **Pull requests** get a preview link (`...--prN-....web.app`), posted as a comment on the PR
- **Merging to `main`** deploys to the live site

The build reads these **GitHub repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Where to find it |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase Console → Project settings → Your apps → web app config |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs & Services → Credentials |
| `VITE_FIREBASE_VAPID_KEY` | Firebase Console → Project settings → Cloud Messaging → Web Push certificates |
| `FIREBASE_SERVICE_ACCOUNT_TAKEMEHOMEBOXVIBE_CODING` | Created by `firebase init hosting:github` |

**Database rules, indexes and the notification function are not deployed by GitHub Actions.** After changing any of them, deploy from a computer with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore          # rules + indexes
cd functions && npm install && cd ..
firebase deploy --only functions          # notification function (needs the Blaze plan)
```

## Local development

Requires Node.js 20 or later.

```bash
cp .env.example .env     # then fill in the values from the table above
npm install
npm run dev              # http://localhost:5173
npm run build            # production build into dist/
```

For local development, add `localhost:5173/*` to the Maps key's allowed websites and `localhost` to Firebase → Authentication → Settings → Authorized domains.

## Google Cloud setup

- **APIs to enable:** Maps JavaScript API, Geocoding API
- **Maps key website restrictions:** `takemehomeboxvibe-coding.web.app/*`, `*.web.app/*` (previews), `localhost:5173/*`, and the custom domain once live
- **Billing** must be on (the Blaze plan) for Maps and Cloud Functions. Set a budget alert.

## Data model

**`listings/{listingId}`**

```ts
{
  title: string
  description: string
  category: string
  images: string[]
  location: { address: string, coordinates: { latitude: number, longitude: number } }
  isSpotted: boolean
  userId: string
  username: string
  userEmail: string
  rating: number                       // average, 0 when unrated
  ratings: { userId: string, rating: 1 | 2 | 3 | 4 | 5 }[]
  status: 'active' | 'taken' | 'expired'
  takenBy?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  expiresAt?: Timestamp
}
```

**`users/{uid}`**: profile, `itemsGiven` and `itemsTaken` counts (which drive ranks), and for notifications `notify: { enabled, radiusKm, location }` plus `pushTokens: string[]`.

### Security rules (summary)

See `firestore.rules`. Signed-in users can create boxes in their own name. Owners can edit or delete their own boxes and see their expired or taken ones. Other signed-in users can **only** rate a box (1–5) or mark an active box as found. Users can only read and write their own profile.

### Indexes

`firestore.indexes.json` defines the three composite indexes on `listings`:

- `status` ↑, `createdAt` ↓
- `status` ↑, `category` ↑, `createdAt` ↓
- `userId` ↑, `createdAt` ↓

## Contributing

Create a branch, open a pull request, and check the preview link before merging.
