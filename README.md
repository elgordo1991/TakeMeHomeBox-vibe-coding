# TakeMeHomeBox

A community sharing app that connects people giving away free items with those who want them.

## 🚀 Features

- **Firebase Authentication**: Secure email/password and Google Sign-In
- **Firestore Database**: Real-time listings and user data
- **Interactive Maps**: Google Maps integration showing nearby boxes
- **Community Rating System**: Emoji-based ratings (🗑️ → 💎)
- **User Profiles**: Customizable profiles with activity tracking
- **Responsive Design**: Mobile-first design optimized for all devices
- **Real-time Updates**: Live location and listing updates
- **Progressive Web App**: Installable on mobile devices

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Firebase project
- Google Cloud Console project

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable Email/Password provider
   - Enable Google provider (optional)
4. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Choose your preferred location
5. Get your Firebase config:
   - Go to Project Settings → General
   - Scroll down to "Your apps"
   - Click "Web app" icon to create/view web app
   - Copy the config object

### Environment Variables

1. Copy `.env.example` to `.env`
2. Add your Firebase config values:

```env
# Firebase Configuration (get these from Firebase Console)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Maps API Configuration
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Firestore Security Rules

Set up these security rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Listings collection
    match /listings/{listingId} {
      // Anyone can read active listings
      allow read: if resource.data.status == 'active';
      
      // Only authenticated users can create listings
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
      
      // Only the owner can update their listings
      allow update: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      
      // Only the owner can delete their listings
      allow delete: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
    
    // Users can read/write their own user documents
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
  }
}
```

### Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create API Key credentials
5. Add your domain to authorized origins

### Google Sign-In Setup (Optional)

1. In Google Cloud Console → Credentials
2. Create OAuth 2.0 Client ID
3. Add authorized origins:
   - `http://localhost:5173` (development)
   - Your production domain
4. Copy Client ID to `.env`

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔥 Firebase Features Used

### Authentication
- Email/password authentication
- Google Sign-In (optional)
- User profile management

### Firestore Database
- Real-time listings synchronization
- User data storage
- Rating and review system
- Automatic data validation

### Collections Structure

#### Listings Collection (`/listings/{listingId}`)
```javascript
{
  id: string,
  title: string,
  description: string,
  category: string,
  images: string[],
  location: {
    address: string,
    coordinates: GeoPoint
  },
  isSpotted: boolean,
  userId: string,
  userEmail: string,
  username: string,
  rating: number,
  ratings: [{ userId: string, rating: number, comment?: string }],
  status: 'active' | 'taken' | 'expired',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt?: Timestamp
}
```

## 📱 Production Deployment

### Build Optimization

- Code splitting for vendor and Firebase bundles
- Optimized asset loading
- Environment variable validation
- Error boundary implementation

### Security Features

- Firebase security rules
- Input validation and sanitization
- XSS protection
- Secure authentication flow

### Performance

- Lazy loading of Google Maps
- Image optimization
- Bundle size optimization
- Caching strategies

## 🎯 User Experience

### Rating System
- 🗑️ (1) - Trash quality
- 💩 (2) - Poor quality  
- 📦 (3) - Okay quality
- ✨ (4) - Great quality
- 💎 (5) - Perfect quality

### User Ranks
- 🆕 Noob (0-4 activities)
- 🧹 Forager (5-14 activities)
- 🎒 Scavenger (15-24 activities)
- 🪙 Giver (25-49 activities)
- 💎 Treasure Hunter (50+ activities)

## 🔧 Technical Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Maps**: Google Maps JavaScript API
- **Build Tool**: Vite
- **Deployment**: Netlify
- **State Management**: React Context
- **Routing**: React Router

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For support, email support@takemehomebox.com or create an issue on GitHub.