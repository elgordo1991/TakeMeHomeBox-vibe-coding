import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, MapPin, Star, Clock, User, Navigation, Loader, AlertCircle } from 'lucide-react';
import { loadGoogleMapsScript, getDarkMapStyles, getCurrentLocation } from '../utils/googleMaps';
import { 
  subscribeToListings, 
  searchListings, 
  getListingsByCategory, 
  markListingAsFound,
  calculateDistance,
  BoxListing 
} from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    google: any;
  }
}

const MapView: React.FC = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<BoxListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<BoxListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<BoxListing | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const categories = [
    { id: 'all', label: 'All Categories', icon: '📦' },
    { id: 'books', label: 'Books', icon: '📚' },
    { id: 'clothes', label: 'Clothes', icon: '👕' },
    { id: 'toys', label: 'Toys', icon: '🧸' },
    { id: 'kitchen', label: 'Kitchen', icon: '🍽️' },
    { id: 'electronics', label: 'Electronics', icon: '📱' },
    { id: 'furniture', label: 'Furniture', icon: '🪑' },
    { id: 'garden', label: 'Garden', icon: '🌱' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'other', label: 'Other', icon: '📦' },
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

  // Initialize Google Maps
  useEffect(() => {
    if (mapsLoaded && mapRef.current && !googleMapRef.current) {
      const defaultCenter = { lat: 51.505, lng: -0.09 }; // London
      
      try {
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          zoom: 13,
          center: userLocation || defaultCenter,
          styles: getDarkMapStyles(),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // Get user's current location
        getCurrentUserLocation();
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapsError('Failed to initialize map');
      }
    }
  }, [mapsLoaded, userLocation]);

  // Subscribe to listings
  useEffect(() => {
    const unsubscribe = subscribeToListings((newListings) => {
      setListings(newListings);
      setFilteredListings(newListings);
    }, selectedCategory === 'all' ? undefined : selectedCategory);

    return unsubscribe;
  }, [selectedCategory]);

  // Filter listings based on search and category
  useEffect(() => {
    let filtered = listings;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(searchLower) ||
        listing.description.toLowerCase().includes(searchLower) ||
        listing.category.toLowerCase().includes(searchLower)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(listing => listing.category === selectedCategory);
    }

    setFilteredListings(filtered);
  }, [listings, searchTerm, selectedCategory]);

  // Update map markers when listings change
  useEffect(() => {
    if (googleMapRef.current && mapsLoaded) {
      updateMapMarkers();
    }
  }, [filteredListings, mapsLoaded]);

  const getCurrentUserLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      
      if (googleMapRef.current) {
        googleMapRef.current.setCenter(location);
        
        // Add user location marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setMap(null);
        }
        
        userMarkerRef.current = new window.google.maps.Marker({
          position: location,
          map: googleMapRef.current,
          title: 'Your Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="#ffffff"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 12),
          },
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const updateMapMarkers = () => {
    if (!googleMapRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for filtered listings
    filteredListings.forEach(listing => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: listing.location.coordinates.latitude,
          lng: listing.location.coordinates.longitude,
        },
        map: googleMapRef.current,
        title: listing.title,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#C0C0C0" stroke="#0A0F2C" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" font-size="16" fill="#0A0F2C">📦</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16),
        },
      });

      marker.addListener('click', () => {
        setSelectedListing(listing);
      });

      markersRef.current.push(marker);
    });
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setFilteredListings(listings);
      return;
    }

    try {
      const results = await searchListings(searchTerm);
      setFilteredListings(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    if (categoryId === 'all') {
      setFilteredListings(listings);
    } else {
      try {
        const results = await getListingsByCategory(categoryId);
        setFilteredListings(results);
      } catch (error) {
        console.error('Category filter error:', error);
      }
    }
  };

  const handleMarkAsFound = async (listing: BoxListing) => {
    if (!user) {
      alert('Please sign in to mark items as found');
      return;
    }

    if (confirm('Mark this item as found? This will remove it from the map.')) {
      try {
        await markListingAsFound(listing.id!, user.uid);
        setSelectedListing(null);
        alert('Item marked as found! Thanks for keeping the community updated.');
      } catch (error) {
        console.error('Error marking as found:', error);
        alert('Failed to mark as found. Please try again.');
      }
    }
  };

  const getDistanceText = (listing: BoxListing) => {
    if (!userLocation) return '';
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      listing.location.coordinates.latitude,
      listing.location.coordinates.longitude
    );
    
    return distance < 1 
      ? `${Math.round(distance * 1000)}m away`
      : `${distance.toFixed(1)}km away`;
  };

  const getRatingEmoji = (rating: number) => {
    if (rating >= 4.5) return '💎';
    if (rating >= 3.5) return '✨';
    if (rating >= 2.5) return '📦';
    if (rating >= 1.5) return '💩';
    return '🗑️';
  };

  const getTimeAgo = (createdAt: any) => {
    if (!createdAt) return 'Unknown';
    
    const now = new Date();
    const created = createdAt.toDate();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="min-h-screen bg-deep-blue">
      {/* Header */}
      <div className="card-dark border-b border-silver/30">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-silver-light">
              Community Map
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={getCurrentUserLocation}
                disabled={loadingLocation}
                className="btn-secondary p-2 disabled:opacity-50"
                title="Get current location"
              >
                {loadingLocation ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary p-2"
                title="Toggle filters"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for items..."
              className="input-dark w-full pl-10 pr-4 py-3 rounded-lg"
            />
          </div>

          {/* Category Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-dark-blue-light border border-silver text-silver-light'
                      : 'bg-dark-blue border border-silver/30 text-silver hover:border-silver'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.label}
                </button>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-silver/60">
            <span>{filteredListings.length} items found</span>
            {userLocation && (
              <span>📍 Location enabled</span>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-96">
        {mapsError ? (
          <div className="w-full h-full bg-dark-blue flex items-center justify-center">
            <div className="text-center p-4">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-silver text-sm">{mapsError}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary mt-2 text-xs"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !mapsLoaded ? (
          <div className="w-full h-full bg-dark-blue flex items-center justify-center">
            <div className="text-center">
              <Loader className="w-6 h-6 text-silver animate-spin mx-auto mb-2" />
              <p className="text-silver text-sm">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>

      {/* Listings List */}
      <div className="p-4">
        <h2 className="text-lg font-semibold text-silver-light mb-4">
          Nearby Items ({filteredListings.length})
        </h2>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredListings.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-silver">No items found in this area</p>
              <p className="text-silver/60 text-sm mt-1">
                Try adjusting your search or category filters
              </p>
            </div>
          ) : (
            filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="card-dark p-4 cursor-pointer hover:shadow-silver-glow transition-all"
                onClick={() => setSelectedListing(listing)}
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={listing.images[0] || 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400'}
                    alt={listing.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-silver-light truncate">
                          {listing.title}
                          {listing.isSpotted && (
                            <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                              Spotted
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-silver/60 mt-1 line-clamp-2">
                          {listing.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-silver/60">
                          <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {listing.username}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {getTimeAgo(listing.createdAt)}
                          </span>
                          {userLocation && (
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {getDistanceText(listing)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <span className="text-lg">{getRatingEmoji(listing.rating)}</span>
                        <span className="text-sm text-silver">{listing.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Listing Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
          <div className="card-dark rounded-t-2xl w-full max-w-md max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-silver/30 flex items-center justify-between">
              <h3 className="font-semibold text-silver-light">
                {selectedListing.title}
              </h3>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-silver/60 hover:text-silver"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {selectedListing.images.length > 0 && (
                <img
                  src={selectedListing.images[0]}
                  alt={selectedListing.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <p className="text-silver mb-4">{selectedListing.description}</p>
              
              <div className="space-y-2 text-sm text-silver/60 mb-4">
                <div className="flex items-center justify-between">
                  <span>Posted by:</span>
                  <span className="text-silver">{selectedListing.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Category:</span>
                  <span className="text-silver capitalize">{selectedListing.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rating:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg">{getRatingEmoji(selectedListing.rating)}</span>
                    <span className="text-silver">{selectedListing.rating.toFixed(1)}</span>
                  </div>
                </div>
                {userLocation && (
                  <div className="flex items-center justify-between">
                    <span>Distance:</span>
                    <span className="text-silver">{getDistanceText(selectedListing)}</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleMarkAsFound(selectedListing)}
                  className="btn-primary flex-1"
                  disabled={!user}
                >
                  Mark as Found
                </button>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;