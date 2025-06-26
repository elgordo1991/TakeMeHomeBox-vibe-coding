import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, MapPin, Clock, Star, Camera, MessageCircle, Locate } from 'lucide-react';
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
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const categories = [
    { id: 'all', name: 'All', color: 'bg-gray-100 text-gray-700' },
    { id: 'books', name: 'Books', color: 'bg-blue-100 text-blue-700' },
    { id: 'clothes', name: 'Clothes', color: 'bg-purple-100 text-purple-700' },
    { id: 'toys', name: 'Toys', color: 'bg-pink-100 text-pink-700' },
    { id: 'kitchen', name: 'Kitchen', color: 'bg-orange-100 text-orange-700' },
    { id: 'electronics', name: 'Electronics', color: 'bg-green-100 text-green-700' },
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

  // Initialize Google Maps
  useEffect(() => {
    if (window.google && mapRef.current && !googleMapRef.current) {
      const defaultCenter = { lat: 51.505, lng: -0.09 }; // London coordinates
      
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: userLocation || defaultCenter,
        styles: isDark ? getDarkMapStyles() : [],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Add markers for boxes
      addMarkersToMap();
    }
  }, [userLocation, isDark]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          
          if (googleMapRef.current) {
            googleMapRef.current.setCenter(location);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

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
          fillColor: '#22c55e',
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
          fillColor: box.isSpotted ? '#f97316' : '#22c55e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-gray-900">${box.title}</h3>
            <p class="text-sm text-gray-600 mt-1">${box.description}</p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-gray-500">${box.distance}</span>
              <span class="text-xs text-gray-500">${box.timePosted}</span>
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

  const getDarkMapStyles = () => [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#263c3f' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b9a76' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#38414e' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#212a37' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9ca5b3' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#746855' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1f2835' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f3d19c' }],
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#2f3948' }],
    },
    {
      featureType: 'transit.station',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#17263c' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#515c6d' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#17263c' }],
    },
  ];

  const centerOnUserLocation = () => {
    if (userLocation && googleMapRef.current) {
      googleMapRef.current.setCenter(userLocation);
      googleMapRef.current.setZoom(16);
    }
  };

  const filteredBoxes = mockBoxes.filter(box => {
    const matchesSearch = box.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         box.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || box.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Nearby Boxes
            </h1>
            <button
              onClick={centerOnUserLocation}
              className="p-2 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              <Locate className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for items..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Categories */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-primary-500 text-white'
                    : `${category.color} dark:bg-gray-700 dark:text-gray-300`
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
        <div ref={mapRef} className="w-full h-full" />
        {!window.google && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-earth-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-primary-500 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-300">Loading Google Maps...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Please add your Google Maps API key
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Listings */}
      <div className="p-4 space-y-4">
        {filteredBoxes.map((box) => (
          <div
            key={box.id}
            onClick={() => setSelectedBox(box)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex">
              <img
                src={box.image}
                alt={box.title}
                className="w-24 h-24 object-cover"
              />
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {box.title}
                    {box.isSpotted && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        Spotted
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {box.rating}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                  {box.description}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedBox.title}
                </h2>
                <button
                  onClick={() => setSelectedBox(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <img
                src={selectedBox.image}
                alt={selectedBox.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedBox.description}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedBox.distance}
                  </span>
                  <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {selectedBox.timePosted}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedBox.rating}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Comment</span>
                </button>
                <button className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                  <Camera className="w-4 h-4" />
                  <span>Report</span>
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