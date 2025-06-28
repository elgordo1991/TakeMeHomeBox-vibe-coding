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
        styles: getDarkMapStyles(),
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const mockUrls = files.map((_, index) => 
      `https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400&t=${Date.now()}-${index}`
    );
    setFormData({
      ...formData,
      images: [...formData.images, ...mockUrls].slice(0, 5)
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
    console.log('Listing submitted:', formData);
    alert('Listing created successfully!');
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
    <div className="min-h-screen bg-deep-blue">
      {/* Header */}
      <div className="card-dark border-b border-silver/30">
        <div className="p-4">
          <h1 className="text-xl font-bold text-silver-light">
            {formData.isSpotted ? 'Report a Spotted Box' : 'List a TakeMeHomeBox'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Listing Type Toggle */}
        <div className="card-dark p-4">
          <h3 className="font-semibold text-silver-light mb-3">Listing Type</h3>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="isSpotted"
                checked={!formData.isSpotted}
                onChange={() => setFormData({ ...formData, isSpotted: false })}
                className="mr-2 text-silver accent-silver"
              />
              <span className="text-silver">My Box</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="isSpotted"
                checked={formData.isSpotted}
                onChange={() => setFormData({ ...formData, isSpotted: true })}
                className="mr-2 text-silver accent-silver"
              />
              <span className="text-silver">Spotted Box</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="card-dark p-4">
          <h3 className="font-semibold text-silver-light mb-3">Photos</h3>
          
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
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {formData.images.length < 5 && (
              <label className="border-2 border-dashed border-silver/30 rounded-lg h-24 flex flex-col items-center justify-center cursor-pointer hover:border-silver transition-colors">
                <Camera className="w-6 h-6 text-silver/60 mb-1" />
                <span className="text-xs text-silver/60">Add Photo</span>
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
          
          <p className="text-sm text-silver/60">
            Add up to 5 photos. First photo will be the main image.
          </p>
        </div>

        {/* Title */}
        <div className="card-dark p-4">
          <label className="block text-sm font-medium text-silver mb-2">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Kitchen essentials, Children's books"
            className="input-dark w-full px-4 py-3 rounded-lg"
            required
          />
        </div>

        {/* Description */}
        <div className="card-dark p-4">
          <label className="block text-sm font-medium text-silver mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="Describe what's in the box..."
            className="input-dark w-full px-4 py-3 rounded-lg resize-none"
            required
          />
        </div>

        {/* Category */}
        <div className="card-dark p-4">
          <label className="block text-sm font-medium text-silver mb-2">
            Category
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="input-dark w-full pl-10 pr-4 py-3 rounded-lg"
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
        <div className="card-dark p-4">
          <label className="block text-sm font-medium text-silver mb-2">
            Location
          </label>
          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Tap to set location on map"
                onClick={handleLocationClick}
                className="input-dark w-full pl-10 pr-4 py-3 rounded-lg cursor-pointer"
                readOnly
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleLocationClick}
                className="btn-secondary flex-1"
              >
                Set on Map
              </button>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="btn-secondary flex items-center justify-center"
              >
                <Locate className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-silver/60 mt-2">
            Precise location helps others find your box easily
          </p>
        </div>

        {/* Auto-expire info */}
        {!formData.isSpotted && (
          <div className="bg-dark-blue-light rounded-xl p-4 border border-silver/30">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-silver mt-0.5" />
              <div>
                <h4 className="font-medium text-silver-light">
                  Auto-expiry in 48 hours
                </h4>
                <p className="text-sm text-silver">
                  Your listing will automatically expire in 48 hours. You can mark it as taken earlier if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className="btn-primary w-full"
        >
          {formData.isSpotted ? 'Report Spotted Box' : 'List My Box'}
        </button>
      </form>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card-dark rounded-2xl w-full max-w-md h-96 overflow-hidden">
            <div className="p-4 border-b border-silver/30 flex items-center justify-between">
              <h3 className="font-semibold text-silver-light">
                Set Box Location
              </h3>
              <button
                onClick={handleMapClose}
                className="text-silver/60 hover:text-silver"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-64">
              <div ref={mapRef} className="w-full h-full" />
              {!window.google && (
                <div className="w-full h-full bg-dark-blue flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-silver mx-auto mb-2" />
                    <p className="text-silver">Loading Google Maps...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <button
                onClick={handleMapClose}
                className="btn-primary w-full"
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