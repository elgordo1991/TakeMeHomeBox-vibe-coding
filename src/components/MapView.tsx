import React, { useState, useEffect, useRef } from 'react';
import { Search, Locate } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface BoxListing {
  id: string;
  title: string;
  description: string;
  category: string;
  distance: string;
  timePosted: string;
  rating: number;
  image: string;
  location: { lat: number; lng: number };
  isSpotted?: boolean;
  userRating?: number;
}

declare global {
  interface Window {
    google: any;
  }
}

const MapView: React.FC = () => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const mockBoxes: BoxListing[] = [
    {
      id: '1',
      title: 'Kitchen Essentials',
      description: 'Mugs, plates, old kettle, and some utensils',
      category: 'kitchen',
      distance: '0.3 km',
      timePosted: '2 hours ago',
      rating: 4.8,
      image: 'https://images.pexels.com/photos/4099354/pexels-photo-4099354.jpeg?auto=compress&cs=tinysrgb&w=400',
      location: { lat: 51.505, lng: -0.09 }
    },
    {
      id: '2',
      title: 'Children\'s Books',
      description: 'Collection of picture books and early readers',
      category: 'books',
      distance: '0.7 km',
      timePosted: '4 hours ago',
      rating: 5.0,
      image: 'https://images.pexels.com/photos/1907785/pexels-photo-1907785.jpeg?auto=compress&cs=tinysrgb&w=400',
      location: { lat: 51.507, lng: -0.087 }
    }
  ];

  // ✅ Load Maps Script Safely
  useEffect(() => {
    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✅ Google Maps loaded');
      };
      document.head.appendChild(script);
    }
  }, []);

  // ✅ Wait for Google Maps to become available
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setMapsLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogleMaps()) return;

    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.error("❌ Google Maps failed to load.");
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Initialize map after loaded
  useEffect(() => {
    if (mapsLoaded && mapRef.current && !googleMapRef.current) {
      const defaultCenter = { lat: 51.505, lng: -0.09 };
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 14,
        center: userLocation || defaultCenter,
        styles: getDarkMapStyles(),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      addMarkersToMap();
    }
  }, [mapsLoaded, userLocation]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setUserLocation(loc);
          if (googleMapRef.current) {
            googleMapRef.current.setCenter(loc);
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
        }
      );
    }
  }, []);

  const addMarkersToMap = () => {
    if (!googleMapRef.current || !window.google) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    mockBoxes.forEach(box => {
      const marker = new window.google.maps.Marker({
        position: box.location,
        map: googleMapRef.current,
        title: box.title,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#C0C0C0',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        console.log(`Clicked on ${box.title}`);
      });

      markersRef.current.push(marker);
    });
  };

  const centerOnUser = () => {
    if (userLocation && googleMapRef.current) {
      googleMapRef.current.setCenter(userLocation);
    }
  };

  const getDarkMapStyles = () => [
    { elementType: 'geometry', stylers: [{ color: '#0A0F2C' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0F2C' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#C0C0C0' }] },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#334155' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#1E293B' }],
    },
  ];

  return (
    <div className="min-h-screen bg-deep-blue">
      <div className="card-dark p-4 flex justify-between items-center border-b border-silver/30">
        <h1 className="text-xl font-bold text-silver-light">Nearby Boxes</h1>
        <button onClick={centerOnUser} className="btn-secondary p-2">
          <Locate className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for items..."
            className="input-dark w-full pl-10 pr-4 py-3 rounded-lg"
          />
        </div>

        <div ref={mapRef} className="w-full h-[500px] rounded-xl overflow-hidden shadow-md" />
      </div>
    </div>
  );
};

export default MapView;