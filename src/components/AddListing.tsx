import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Calendar, Tag, Upload, X, Locate } from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

const AddListing: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    images: [] as string[],
    location: '',
    coordinates: null as { lat: number; lng: number } | null,
    isSpotted: false
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [showMap, setShowMap] = useState(false);

  const categories = [
    'Books', 'Clothes', 'Toys', 'Kitchen', 'Electronics', 'Furniture', 'Garden', 'Sports', 'Other'
  ];

  // Initialize Google Maps for location selection
  useEffect(() => {
    if (showMap && window.google && mapRef.current && !googleMapRef.current) {
      const defaultCenter = { lat: 51.505, lng: -0.09 };
      
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: formData.coordinates || defaultCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Add click listener to set location
      googleMapRef.current.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        setFormData(prev => ({
          ...prev,
          coordinates: { lat, lng }
        }));

        // Update marker position
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng });
        } else {
          markerRef.current = new window.google.maps.Marker({
            position: { lat, lng },
            map: googleMapRef.current,
            title: 'Box Location',
            draggable: true,
          });

          markerRef.current.addListener('dragend', (event: any) => {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();
            setFormData(prev => ({
              ...prev,
              coordinates: { lat: newLat, lng: newLng }
            }));
          });
        }

        // Reverse geocode to get address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            setFormData(prev => ({
              ...prev,
              location: results[0].formatted_address
            }));
          }
        });
      });

      // Get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          googleMapRef.current.setCenter(userLocation);
        });
      }
    }
  }, [showMap]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mock image upload - in real app, this would upload to cloud storage
    const files = Array.from(e.target.files || []);
    const mockUrls = files.map((_, index) => 
      `https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400&t=${Date.now()}-${index}`
    );
    setFormData({
      ...formData,
      images: [...formData.images, ...mockUrls].slice(0, 5) // Max 5 images
    });
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleLocationClick = () => {
    setShowMap(true);
  };

  const handleMapClose = () => {
    setShowMap(false);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setFormData(prev => ({
          ...prev,
          coordinates: location
        }));

        if (googleMapRef.current) {
          googleMapRef.current.setCenter(location);
          
          if (markerRef.current) {
            markerRef.current.setPosition(location);
          } else {
            markerRef.current = new window.google.maps.Marker({
              position: location,
              map: googleMapRef.current,
              title: 'Box Location',
              draggable: true,
            });
          }

          // Reverse geocode to get address
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              setFormData(prev => ({
                ...prev,
                location: results[0].formatted_address
              }));
            }
          });
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission - in real app, this would call your API
    console.log('Listing submitted:', formData);
    alert('Listing created successfully!');
    // Reset form
    setFormData({
      title: '',
      description: '',
      category: '',
      images: [],
      location: '',
      coordinates: null,
      isSpotted: false
    });
    setShowMap(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {formData.isSpotted ? 'Report a Spotted Box' : 'List a TakeMeHomeBox'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Listing Type Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Listing Type</h3>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="isSpotted"
                checked={!formData.isSpotted}
                onChange={() => setFormData({ ...formData, isSpotted: false })}
                className="mr-2 text-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">My Box</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="isSpotted"
                checked={formData.isSpotted}
                onChange={() => setFormData({ ...formData, isSpotted: true })}
                className="mr-2 text-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Spotted Box</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Photos</h3>
          
          {/* Image grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {formData.images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {/* Upload button */}
            {formData.images.length < 5 && (
              <label className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-24 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
                <Camera className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add up to 5 photos. First photo will be the main image.
          </p>
        </div>

        {/* Title */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Kitchen essentials, Children's books"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="Describe what's in the box..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            required
          />
        </div>

        {/* Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category.toLowerCase()}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Location
          </label>
          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Tap to set location on map"
                onClick={handleLocationClick}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                readOnly
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleLocationClick}
                className="flex-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 py-2 px-4 rounded-lg font-medium hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
              >
                Set on Map
              </button>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Locate className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Precise location helps others find your box easily
          </p>
        </div>

        {/* Auto-expire info */}
        {!formData.isSpotted && (
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-primary-900 dark:text-primary-100">
                  Auto-expiry in 48 hours
                </h4>
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Your listing will automatically expire in 48 hours. You can mark it as taken earlier if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-xl font-semibold transition-colors duration-200 transform hover:scale-105 shadow-lg"
        >
          {formData.isSpotted ? 'Report Spotted Box' : 'List My Box'}
        </button>
      </form>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Set Box Location
              </h3>
              <button
                onClick={handleMapClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-64">
              <div ref={mapRef} className="w-full h-full" />
              {!window.google && (
                <div className="w-full h-full bg-gradient-to-br from-primary-100 to-earth-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">Loading Google Maps...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <button
                onClick={handleMapClose}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddListing;