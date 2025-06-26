# TakeMeHomeBox

A community sharing app that connects people giving away free items with those who want them.

## Setup Instructions

### Google Maps Integration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Copy `.env.example` to `.env` and add your API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
6. Update `index.html` with your API key in the Google Maps script tag

### Google Sign-In Integration

1. In the Google Cloud Console, go to "Credentials"
2. Create OAuth 2.0 Client IDs
3. Add your domain to authorized origins
4. Copy the Client ID to your `.env` file:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```
5. Update the `Login.tsx` component with your actual Client ID

### Development

```bash
npm install
npm run dev
```

### Features

- **Google Maps Integration**: Interactive map showing nearby boxes with real-time location
- **Google Sign-In**: Quick authentication with Google accounts
- **Location Services**: GPS location detection and address geocoding
- **Responsive Design**: Mobile-first design optimized for iOS and Android
- **Dark Mode**: Full dark mode support
- **Community Features**: Rating system, comments, and reporting

### API Keys Required

- Google Maps API Key (for maps functionality)
- Google OAuth Client ID (for sign-in functionality)

Make sure to restrict your API keys appropriately for production use.