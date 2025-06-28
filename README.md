# TakeMeHomeBox

A community sharing app that connects people giving away free items with those who want them.

## 🚀 Features

- **Firebase Authentication**: Secure email/password and Google Sign-In
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

### Environment Variables

1. Copy `.env.example` to `.env`
2. Add your API keys:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
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

### Google Sign-In Setup

1. In Google Cloud Console → Credentials
2. Create OAuth 2.0 Client ID
3. Add authorized origins:
   - `http://localhost:5173` (development)
   - Your production domain
4. Copy Client ID to `.env`

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project or use existing
3. Enable Authentication
4. Add Email/Password and Google providers
5. Update `src/firebase.config.ts` with your config

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