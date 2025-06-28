import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Plus, Search, Filter } from 'lucide-react';

interface MapViewProps {
  onAddListing: () => void;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  category: string;
  condition: string;
  images: string[];
  createdAt: Date;
  userId: string;
  userName: string;
  userRating: number;
}

const MapView: React.FC<MapViewProps> = ({ onAddListing }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration
  const mockListings: Listing[] = [
    {
      id: '1',
      title: 'Vintage Leather Jacket',
      description: 'Great condition vintage leather jacket, size M. Perfect for someone who loves retro style!',
      location: {
        lat: 40.7589,
        lng: -73.9851,
        address: 'Times Square, New York, NY'
      },
      category: 'Clothing',
      condition: 'Great',
      images: ['https://images.pexels.com/photos/1124465/pexels-photo-1124465.jpeg'],
      createdAt: new Date('2024-01-15'),
      userId: 'user1',
      userName: 'Sarah M.',
      userRating: 4.8
    },
    {
      id: '2',
      title: 'Kids Bicycle',
      description: 'Red kids bicycle, suitable for ages 6-10. Some wear but still rides great!',
      location: {
        lat: 40.7505,
        lng: -73.9934,
        address: 'Central Park, New York, NY'
      },
      category: 'Sports',
      condition: 'Good',
      images: ['https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg'],
      createdAt: new Date('2024-01-14'),
      userId: 'user2',
      userName: 'Mike R.',
      userRating: 4.2
    }
  ];

  const initializeMaps = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if API key is configured
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      console.log('Google Maps API Key check:', apiKey ? 'Present' : 'Missing');
      
      if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
        throw new Error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
      }

      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        initializeMap();
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error);
        setError('Failed to load Google Maps. Please check your API key and internet connection.');
        setIsLoading(false);
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize Google Maps');
      setIsLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current) return;

    try {
      // Get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(userPos);
            createMap(userPos);
          },
          (error) => {
            console.warn('Geolocation error:', error);
            // Default to New York City if geolocation fails
            const defaultPos = { lat: 40.7589, lng: -73.9851 };
            setUserLocation(defaultPos);
            createMap(defaultPos);
          }
        );
      } else {
        // Default to New York City if geolocation is not supported
        const defaultPos = { lat: 40.7589, lng: -73.9851 };
        setUserLocation(defaultPos);
        createMap(defaultPos);
      }
    } catch (error) {
      console.error('Error in initializeMap:', error);
      setError('Failed to initialize map');
      setIsLoading(false);
    }
  };

  const createMap = (center: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google) return;

    try {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      setMap(mapInstance);

      // Add user location marker
      new google.maps.Marker({
        position: center,
        map: mapInstance,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4F46E5',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      });

      // Add listing markers
      mockListings.forEach((listing) => {
        const marker = new google.maps.Marker({
          position: listing.location,
          map: mapInstance,
          title: listing.title,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#10B981',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 1
          }
        });

        marker.addListener('click', () => {
          setSelectedListing(listing);
        });
      });

      setListings(mockListings);
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating map:', error);
      setError('Failed to create map');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeMaps();
  }, []);

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'excellent': return 'text-green-600';
      case 'great': return 'text-blue-600';
      case 'good': return 'text-yellow-600';
      case 'fair': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Loading Error</h3>
          <p className="text-gray-600 mb-4 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Search and Filter Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search nearby items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
          
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {['All', 'Clothing', 'Electronics', 'Furniture', 'Books', 'Sports'].map((category) => (
                  <button
                    key={category}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Listing Button */}
      <button
        onClick={onAddListing}
        className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-105 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Selected Listing Card */}
      {selectedListing && (
        <div className="absolute bottom-6 left-4 right-20 bg-white rounded-lg shadow-xl p-4 max-w-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-gray-900 text-lg">{selectedListing.title}</h3>
            <button
              onClick={() => setSelectedListing(null)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ×
            </button>
          </div>
          
          {selectedListing.images[0] && (
            <img
              src={selectedListing.images[0]}
              alt={selectedListing.title}
              className="w-full h-32 object-cover rounded-lg mb-3"
            />
          )}
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{selectedListing.description}</p>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">By {selectedListing.userName}</span>
              <span className="text-yellow-500">★ {selectedListing.userRating}</span>
            </div>
            <span className={`font-medium ${getConditionColor(selectedListing.condition)}`}>
              {selectedListing.condition}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">{formatDate(selectedListing.createdAt)}</span>
            <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
              Contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;