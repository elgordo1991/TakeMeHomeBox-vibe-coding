import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, MapPin, Clock, Camera, MessageCircle, Locate, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { loadGoogleMapsScript, getDarkMapStyles, getCurrentLocation } from '../utils/googleMaps';

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
  const [selectedBox, setSelectedBox] = useState<BoxListing | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'books', name: 'Books' },
    { id: 'clothes', name: 'Clothes' },
    { id: 'toys', name: 'Toys' },
    { id: 'kitchen', name: 'Kitchen' },
    { id: 'electronics', name: 'Electronics' },
  ];

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
    },
    {
      id: '3',
      title: 'Winter Clothes',
      description: 'Coats, sweaters, and scarves - various sizes',
      category: 'clothes',
      distance: '1.2 km',
      timePosted: '6 hours ago',
      rating: 4.5,
      image: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=400',
      location: { lat: 51.503, lng: -0.085 },
      isSpotted: true
    }
  ];

  // Load Google Maps
  useEffect(() => {
    const initializeMaps = async () => {
      try {
        await loadGoogleMapsScript();
        setMapsLoaded(true);
        setMapsError(null);
      } catch (error: any) {
        console.error('Failed to load Google Maps:', error);
        setMapsError(error.message || 'Failed to load Google Maps');
        setMapsLoaded(false);
      }
    };

    initializeMaps();
  }, []);

  // Get user's current location
  useEffect(() => {
    const getUserLocation = async () => {
      setLoadingLocation(true);
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        
        if (googleMapRef.current) {
          googleMapRef.current.setCenter(location);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        // Use default location (London) if geolocation fails
        const defaultLocation = { lat: 51.505, lng: -0.09 };
        setUserLocation(defaultLocation);
        
        if (googleMapRef.current) {
          googleMapRef.current.setCenter(defaultLocation);
        }
      } finally {
        setLoadingLocation(false);
      }
    };

    if (mapsLoaded) {
      getUserLocation();
    }
  }, [mapsLoaded]);

  // Initialize Google Maps
  useEffect(() => {
    if (mapsLoaded && mapRef.current && !googleMapRef.current) {
      const defaultCenter = userLocation || { lat: 51.505, lng: -0.09 };

      try {
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          zoom: 15,
          center: defaultCenter,
          styles: getDarkMapStyles(),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        addMarkersToMap();
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapsError('Failed to initialize map');
      }
    }
  }, [mapsLoaded, userLocation]);

  const addMarkersToMap = () => {
    if (!googleMapRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add user location marker
    if (userLocation) {
      const userMarker = new window.google.maps.Marker({
        position: userLocation,
        map: googleMapRef.current,
        title: 'Your Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#C0C0C0',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(userMarker);
    }

    // Add box markers
    mockBoxes.forEach((box) => {
      const marker = new window.google.maps.Marker({
        position: box.location,
        map: googleMapRef.current,
        title: box.title,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: box.isSpotted ? '#f97316' : '#C0C0C0',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; background: #1E293B; color: #E5E5E5; border-radius: 8px;">
            <h3 style="margin: 0 0 4px 0; font-weight: 600;">${box.title}</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px;">${box.description}</p>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #C0C0C0;">
              <span>${box.distance}</span>
              <span>${box.timePosted}</span>
            </div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker);
        setSelectedBox(box);
      });

      markersRef.current.push(marker);
    });
  };

  const centerOnUserLocation = async () => {
    if (userLocation && googleMapRef.current) {
      googleMapRef.current.setCenter(userLocation);
      googleMapRef.current.setZoom(16);
    } else {
      // Try to get location again
      setLoadingLocation(true);
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        
        if (googleMapRef.current) {
          googleMapRef.current.setCenter(location);
          googleMapRef.current.setZoom(16);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please check your location permissions.');
      } finally {
        setLoadingLocation(false);
      }
    }
  };

  const renderBoxRating = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const boxes = [];
    const sizeClass = size === 'lg' ? 'text-2xl' : 'text-base';
    
    for (let i = 1; i <= 5; i++) {
      boxes.push(
        <span
          key={i}
          className={`${sizeClass} ${i <= rating ? 'opacity-100' : 'opacity-30'}`}
        >
          📦
        </span>
      );
    }
    return <div className="flex items-center space-x-1">{boxes}</div>;
  };

  const renderInteractiveRating = (currentRating: number, onRate: (rating: number) => void) => {
    const boxes = [];
    
    for (let i = 1; i <= 5; i++) {
      boxes.push(
        <button
          key={i}
          type="button"
          onClick={() => onRate(i)}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          className={`text-3xl transition-all duration-200 hover:scale-110 active:animate-press-down ${
            i <= (hoverRating || currentRating) ? 'opacity-100' : 'opacity-30'
          }`}
        >
          📦
        </button>
      );
    }
    return <div className="flex items-center justify-center space-x-2">{boxes}</div>;
  };

  const handleRating = (rating: number) => {
    if (selectedBox) {
      const updatedBox = { ...selectedBox, userRating: rating };
      setSelectedBox(updatedBox);
      setShowRating(false);
      alert(`Thanks for rating! You gave ${rating} boxes.`);
    }
  };

  const filteredBoxes = mockBoxes.filter(box => {
    const matchesSearch = box.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         box.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || box.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-deep-blue">
      {/* Header */}
      <div className="card-dark border-b border-silver/30">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-silver-light">
              Nearby Boxes
            </h1>
            <button
              onClick={centerOnUserLocation}
              disabled={loadingLocation}
              className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingLocation ? (
                <div className="w-5 h-5 border-2 border-silver/30 border-t-silver rounded-full animate-spin"></div>
              ) : (
                <Locate className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Search */}
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

          {/* Categories */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 active:animate-press-down ${
                  selectedCategory === category.id
                    ? 'bg-dark-blue-light border border-silver text-silver-light shadow-silver-glow'
                    : 'bg-dark-blue border border-silver/30 text-silver hover:border-silver/50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Google Maps */}
      <div className="h-64 relative">
        {mapsError ? (
          <div className="absolute inset-0 bg-dark-blue flex items-center justify-center">
            <div className="text-center p-6">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-silver-light mb-2">Maps Unavailable</h3>
              <p className="text-silver text-sm mb-4">{mapsError}</p>
              <p className="text-xs text-silver/60">
                Please check your Google Maps API key configuration
              </p>
            </div>
          </div>
        ) : !mapsLoaded ? (
          <div className="absolute inset-0 bg-dark-blue flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-silver/30 border-t-silver rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-silver">Loading Google Maps...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>

      {/* Listings */}
      <div className="p-4 space-y-4">
        {filteredBoxes.map((box) => (
          <div
            key={box.id}
            onClick={() => setSelectedBox(box)}
            className="card-dark overflow-hidden hover:shadow-silver-glow transition-shadow cursor-pointer active:animate-press-down"
          >
            <div className="flex">
              <img
                src={box.image}
                alt={box.title}
                className="w-24 h-24 object-cover"
              />
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-silver-light">
                    {box.title}
                    {box.isSpotted && (
                      <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                        Spotted
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center space-x-1">
                    {renderBoxRating(Math.round(box.rating))}
                    <span className="text-sm text-silver ml-1">
                      {box.rating}
                    </span>
                  </div>
                </div>
                <p className="text-silver text-sm mb-2">
                  {box.description}
                </p>
                <div className="flex items-center justify-between text-sm text-silver/60">
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {box.distance}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {box.timePosted}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Box Detail Modal */}
      {selectedBox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="card-dark rounded-t-2xl w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-silver-light">
                  {selectedBox.title}
                </h2>
                <button
                  onClick={() => {
                    setSelectedBox(null);
                    setShowRating(false);
                    setHoverRating(0);
                  }}
                  className="text-silver/60 hover:text-silver"
                >
                  ✕
                </button>
              </div>
              
              <img
                src={selectedBox.image}
                alt={selectedBox.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              
              <p className="text-silver mb-4">
                {selectedBox.description}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-sm text-silver/60">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedBox.distance}
                  </span>
                  <span className="flex items-center text-sm text-silver/60">
                    <Clock className="w-4 h-4 mr-1" />
                    {selectedBox.timePosted}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {renderBoxRating(Math.round(selectedBox.rating))}
                  <span className="text-sm font-medium text-silver-light ml-1">
                    {selectedBox.rating}
                  </span>
                </div>
              </div>

              {/* Rating Section */}
              {showRating ? (
                <div className="bg-dark-blue-light rounded-xl p-4 mb-4 border border-silver/30">
                  <h3 className="text-center font-semibold text-silver-light mb-3">
                    Rate this box
                  </h3>
                  <p className="text-center text-sm text-silver mb-4">
                    How would you rate the quality and accuracy of this listing?
                  </p>
                  {renderInteractiveRating(selectedBox.userRating || 0, handleRating)}
                  <div className="flex justify-center space-x-2 mt-4">
                    <button
                      onClick={() => setShowRating(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-3 mb-4">
                  <button 
                    onClick={() => setShowRating(true)}
                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <span>📦</span>
                    <span>Rate Box</span>
                  </button>
                  <button className="btn-secondary flex-1 flex items-center justify-center space-x-2">
                    <Camera className="w-4 h-4" />
                    <span>Report</span>
                  </button>
                </div>
              )}
              
              <button className="btn-primary w-full flex items-center justify-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span>Leave Comment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;