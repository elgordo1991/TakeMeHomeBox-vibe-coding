import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Calendar, Tag, Upload, X, Locate, AlertCircle, CheckCircle } from 'lucide-react';
import { loadGoogleMapsScript, getDarkMapStyles, getCurrentLocation } from '../utils/googleMaps';
import { createListing, BoxListingInput } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import MultiImageUpload from './MultiImageUpload';

declare global {
  interface Window {
    google: any;
  }
}

const AddListing: React.FC = () => {
  const { user } = useAuth();
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
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categories = [
    'Books', 'Clothes', 'Toys', 'Kitchen', 'Electronics', 'Furniture', 'Garden', 'Sports', 'Other'
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

    if (showMap) {
      initializeMaps();
    }
  }, [showMap]);

  // Initialize Google Maps for location selection
  useEffect(() => {
    if (showMap && mapsLoaded && mapRef.current && !googleMapRef.current) {
      const defaultCenter = { lat: 51.505, lng: -0.09 };
      
      try {
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
              reverseGeocode(newLat, newLng);
            });
          }

          reverseGeocode(lat, lng);
        });

        // Get user's current location
        getCurrentUserLocation();
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapsError('Failed to initialize map');
      }
    }
  }, [showMap, mapsLoaded]);

  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google || !window.google.maps) return;
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        setFormData(prev => ({
          ...prev,
          location: results[0].formatted_address
        }));
      }
    });
  };

  const getCurrentUserLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      
      if (googleMapRef.current) {
        googleMapRef.current.setCenter(location);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImagesChanged = (images: string[]) => {
    setFormData({
      ...formData,
      images
    });
  };

  const handleLocationClick = () => {
    setShowMap(true);
  };

  const handleMapClose = () => {
    setShowMap(false);
  };

  const handleCurrentLocationClick = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      
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

        reverseGeocode(location.lat, location.lng);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please check your location permissions.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setSubmitError('You must be logged in to create a listing');
      return;
    }
    
    if (!formData.coordinates) {
      setSubmitError('Please set a location for your box');
      return;
    }

    if (formData.images.length === 0) {
      setSubmitError('Please add at least one photo');
      return;
    }
    
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const listingData: BoxListingInput = {
        title: formData.title,
        description: formData.description,
        category: formData.category.toLowerCase(),
        images: formData.images,
        location: {
          address: formData.location,
          coordinates: formData.coordinates,
        },
        isSpotted: formData.isSpotted,
        userId: user.uid, // Use uid for consistency with Firestore rules
        userEmail: user.email,
        username: user.username,
      };

      console.log('[CURRENT USER]', user);
      console.log('[SUBMITTING LISTING]', listingData);
      
      const listingId = await createListing(listingData);
      console.log('✅ Listing created with ID:', listingId);
      
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
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
        setSubmitSuccess(false);
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error creating listing:', error);
      
      // Provide user-friendly error messages
      if (error.message.includes('Firebase is not configured')) {
        setSubmitError('Database connection error. Please check your internet connection and try again.');
      } else if (error.message.includes('Permission denied')) {
        setSubmitError('Permission denied. Please check your Firestore security rules.');
      } else if (error.message.includes('Firestore is currently unavailable')) {
        setSubmitError('Service temporarily unavailable. Please try again in a few moments.');
      } else {
        setSubmitError(error.message || 'Failed to create listing. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-deep-blue flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-silver-light mb-2">Sign In Required</h2>
          <p className="text-silver">Please sign in to create a listing</p>
        </div>
      </div>
    );
  }

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

      {/* Success Message */}
      {submitSuccess && (
        <div className="p-4">
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-medium">Listing Created Successfully!</p>
              <p className="text-green-400/80 text-sm">Your box is now visible to the community.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="p-4">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 text-sm font-medium">Error Creating Listing</p>
              <p className="text-red-400/80 text-sm">{submitError}</p>
            </div>
          </div>
        </div>
      )}

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
                disabled={submitting}
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
                disabled={submitting}
              />
              <span className="text-silver">Spotted Box</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="card-dark p-4">
          <h3 className="font-semibold text-silver-light mb-3">Photos *</h3>
          <MultiImageUpload
            images={formData.images}
            onImagesChanged={handleImagesChanged}
            maxImages={5}
            folder="listings"
          />
          <p className="text-xs text-silver/60 mt-2">
            Images will be uploaded to Firebase Storage (listings folder) per your storage rules
          </p>
        </div>

        {/* Title */}
        <div className="card-dark p-4">
          <label className="block text-sm font-medium text-silver mb-2">
            Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Kitchen essentials, Children's books"
            className="input-dark w-full px-4 py-3 rounded-lg"
            disabled={submitting}
            required
          />
        </div>

        {/* Description */}
        <div className="card-dark p-4">
          <label className="block text-sm font-medium text-silver mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="Describe what's in the box..."
            className="input-dark w-full px-4 py-3 rounded-lg resize-none"
            disabled={submitting}
            required
          />
        </div>

        {/* Category */}
        <div className="card-dark p-4">
          <label className="block text-sm font-medium text-silver mb-2">
            Category *
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="input-dark w-full pl-10 pr-4 py-3 rounded-lg"
              disabled={submitting}
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
            Location *
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
                disabled={submitting}
                readOnly
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleLocationClick}
                disabled={submitting}
                className="btn-secondary flex-1 disabled:opacity-50"
              >
                Set on Map
              </button>
              <button
                type="button"
                onClick={handleCurrentLocationClick}
                disabled={loadingLocation || submitting}
                className="btn-secondary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingLocation ? (
                  <div className="w-4 h-4 border-2 border-silver/30 border-t-silver rounded-full animate-spin"></div>
                ) : (
                  <Locate className="w-4 h-4" />
                )}
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
          disabled={submitting || !formData.coordinates || formData.images.length === 0}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-silver/30 border-t-silver rounded-full animate-spin"></div>
              <span>Creating Listing...</span>
            </>
          ) : (
            <span>{formData.isSpotted ? 'Report Spotted Box' : 'List My Box'}</span>
          )}
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
                disabled={submitting}
                className="text-silver/60 hover:text-silver disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-64">
              {mapsError ? (
                <div className="w-full h-full bg-dark-blue flex items-center justify-center">
                  <div className="text-center p-4">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-silver text-sm">{mapsError}</p>
                  </div>
                </div>
              ) : !mapsLoaded ? (
                <div className="w-full h-full bg-dark-blue flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-silver/30 border-t-silver rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-silver text-sm">Loading Google Maps...</p>
                  </div>
                </div>
              ) : (
                <div ref={mapRef} className="w-full h-full" />
              )}
            </div>
            <div className="p-4">
              <button
                onClick={handleMapClose}
                disabled={!formData.coordinates || submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {formData.coordinates ? 'Confirm Location' : 'Select Location First'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddListing;