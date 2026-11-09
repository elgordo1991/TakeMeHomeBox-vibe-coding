import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Calendar, Tag, Upload, X, Locate, AlertCircle, CheckCircle } from 'lucide-react';
import { loadGoogleMapsScript, getWarmMapStyles, getCurrentLocation } from '../utils/googleMaps';
import { createListing, BoxListingInput } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  const [listedAsSpotted, setListedAsSpotted] = useState(false);
  const navigate = useNavigate();
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
          styles: getWarmMapStyles(),
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
    console.log('🟡 [DEBUG] Images changed in AddListing:', {
      previousCount: formData.images.length,
      newCount: images.length,
      images: images
    });
    
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

  const resetForm = () => {
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
    setSubmitError(null);
    setSubmitting(false);
    
    // Clear map markers
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    
    // Reset map reference
    if (googleMapRef.current) {
      googleMapRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🟡 [DEBUG] ===== STARTING LISTING SUBMISSION =====');
    console.log('🟡 [DEBUG] Form submission started with data:', {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      imageCount: formData.images.length,
      images: formData.images,
      location: formData.location,
      coordinates: formData.coordinates,
      isSpotted: formData.isSpotted,
      user: user ? {
        uid: user.uid,
        email: user.email,
        username: user.username
      } : null
    });
    
    if (!user) {
      console.error('❌ [DEBUG] No user found for listing submission');
      setSubmitError('You must be logged in to create a listing');
      return;
    }
    
    // Only location is required
    if (!formData.coordinates) {
      console.error('❌ [DEBUG] No coordinates provided');
      setSubmitError('Please set a location for your box');
      return;
    }
    
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      // Ensure we have all required user fields
      const userId = user.uid || user.id;
      const username = user.username;

      console.log('🟡 [DEBUG] Validating user data:', {
        userId,
        username
      });

      if (!userId) {
        throw new Error('User ID is missing. Please sign out and sign in again.');
      }

      if (!username) {
        throw new Error('Username is missing. Please update your profile.');
      }

      const listingData: BoxListingInput = {
        title: formData.title || 'Untitled Box', // Default title if empty
        description: formData.description || 'No description provided', // Default description
        category: formData.category || 'other', // Default to 'other' if no category selected
        images: formData.images, // Can be empty array
        location: {
          address: formData.location || 'Location set on map',
          coordinates: formData.coordinates,
        },
        isSpotted: formData.isSpotted,
        userId: userId,
        username: username,
      };

      console.log('🟡 [DEBUG] Prepared listing data for submission:', listingData);
      console.log('🟡 [DEBUG] About to call createListing function...');
      
      const listingId = await createListing(listingData);
      
      console.log('🎉 [DEBUG] ===== LISTING CREATION SUCCESS =====');
      console.log('✅ [DEBUG] Listing created with ID:', listingId);
      
      setListedAsSpotted(formData.isSpotted);
      resetForm();
      setSubmitSuccess(true);
      
    } catch (error: any) {
      console.error('🔥 [DEBUG] ===== LISTING CREATION FAILED =====');
      console.error('❌ [DEBUG] Error creating listing:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Provide user-friendly error messages
      if (error.message.includes('Firebase is not configured')) {
        setSubmitError('Database connection error. Please check your internet connection and try again.');
      } else if (error.message.includes('Permission denied')) {
        setSubmitError('Permission denied. Please check your Firestore security rules.');
      } else if (error.message.includes('Firestore is currently unavailable')) {
        setSubmitError('Service temporarily unavailable. Please try again in a few moments.');
      } else if (error.message.includes('User ID is missing')) {
        setSubmitError('Authentication error. Please sign out and sign in again.');
      } else if (error.message.includes('User email is missing')) {
        setSubmitError('Email missing from profile. Please sign out and sign in again.');
      } else if (error.message.includes('Username is missing')) {
        setSubmitError('Username missing from profile. Please update your profile first.');
      } else if (error.code === 'permission-denied') {
        setSubmitError('Permission denied. Please check your authentication and try again.');
      } else if (error.code === 'unauthenticated') {
        setSubmitError('Authentication required. Please sign in and try again.');
      } else if (error.code === 'unavailable') {
        setSubmitError('Service temporarily unavailable. Please try again in a few moments.');
      } else {
        setSubmitError(error.message || 'Failed to create listing. Please try again.');
      }
      
      setSubmitting(false); // ensure spinner goes away
      window.scrollTo({ top: 0, behavior: 'smooth' }); // error banner is at the top
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-ink mb-2">Sign In Required</h2>
          <p className="text-muted">Please sign in to create a listing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="px-4 pb-4 pt-5">
          <h1 className="text-2xl">
            {formData.isSpotted ? 'Report a spotted box' : 'Share a box'}
          </h1>
          <p className="text-sm text-subtle mt-1">
            Only location is required - all other fields are optional
          </p>
        </div>
      </div>

      {/* Success confirmation */}
      {submitSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm animate-fade-in sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listed-title"
        >
          <div className="card-dark w-full max-w-sm p-8 text-center animate-slide-up">
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-leaf-soft">
              <span className="text-5xl logo-animated">{listedAsSpotted ? '👀' : '📦'}</span>
            </div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-sm font-bold text-leaf">
              <CheckCircle className="h-4 w-4" />
              {listedAsSpotted ? 'Box reported' : 'Box listed'}
            </div>
            <h2 id="listed-title" className="mb-2 text-2xl">
              {listedAsSpotted ? 'Thanks for the tip!' : "Your box is live!"}
            </h2>
            <p className="mb-6 text-muted">
              It's on the map now for neighbours to find. Mark it as taken from your Profile once it's gone.
            </p>
            <button onClick={() => navigate('/map')} className="btn-primary mb-3 w-full">
              <MapPin className="h-5 w-5" />
              See it on the map
            </button>
            <button
              onClick={() => {
                setSubmitSuccess(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="btn-secondary w-full"
            >
              List another box
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-red-600 text-sm font-medium">Error Creating Listing</p>
              <p className="text-red-600/80 text-sm">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Listing Type Toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-sand p-1">
          {[
            { spotted: false, label: '📦 My box' },
            { spotted: true, label: '👀 Spotted a box' },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              disabled={submitting}
              aria-pressed={formData.isSpotted === opt.spotted}
              onClick={() => setFormData({ ...formData, isSpotted: opt.spotted })}
              className={`rounded-full py-2.5 text-sm font-bold transition-all ${
                formData.isSpotted === opt.spotted ? 'bg-surface text-ink shadow-soft' : 'text-subtle hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Location - REQUIRED */}
        <div className="card-dark p-4 ring-2 ring-accent/20">
          <label className="mb-2 block text-sm font-bold text-ink">
            Location * <span className="text-xs text-subtle">(Required)</span>
          </label>
          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-subtle" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Tap to set location on map"
                onClick={handleLocationClick}
                className="input-dark w-full pl-12 pr-4 py-3 cursor-pointer"
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
                  <div className="w-4 h-4 border-2 border-line border-t-accent rounded-full animate-spin"></div>
                ) : (
                  <Locate className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-sm text-subtle mt-2">
            Precise location helps others find your box easily
          </p>
        </div>

        {/* Images - OPTIONAL */}
        <div className="card-dark p-4">
          <h3 className="mb-3 text-base font-extrabold">
            Photos <span className="text-xs text-subtle">(Optional)</span>
          </h3>
          <MultiImageUpload
            images={formData.images}
            onImagesChanged={handleImagesChanged}
            maxImages={5}
            folder="listings"
          />
          <p className="text-xs text-subtle mt-2">
            Add photos to help others identify your box (optional but recommended)
          </p>
        </div>

        {/* Title - OPTIONAL */}
        <div className="card-dark p-4">
          <label className="mb-2 block text-sm font-bold text-ink">
            Title <span className="text-xs text-subtle">(Optional)</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Kitchen essentials, Children's books (optional)"
            className="input-dark w-full px-4 py-3"
            disabled={submitting}
          />
          <p className="text-xs text-subtle mt-1">
            Leave blank for default title "Untitled Box"
          </p>
        </div>

        {/* Description - OPTIONAL */}
        <div className="card-dark p-4">
          <label className="mb-2 block text-sm font-bold text-ink">
            Description <span className="text-xs text-subtle">(Optional)</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="Describe what's in the box (optional)..."
            className="input-dark w-full px-4 py-3 resize-none"
            disabled={submitting}
          />
          <p className="text-xs text-subtle mt-1">
            Leave blank for default description "No description provided"
          </p>
        </div>

        {/* Category - OPTIONAL */}
        <div className="card-dark p-4">
          <label className="mb-2 block text-sm font-bold text-ink">
            Category <span className="text-xs text-subtle">(Optional)</span>
          </label>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-subtle" />
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="input-dark w-full pl-12 pr-4 py-3"
              disabled={submitting}
            >
              <option value="">Select a category (optional)</option>
              {categories.map((category) => (
                <option key={category} value={category.toLowerCase()}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-subtle mt-1">
            Leave blank for default category "Other"
          </p>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || !formData.coordinates}
          className="btn-primary w-full"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
              <span>Creating Listing...</span>
            </>
          ) : (
            <span>{formData.isSpotted ? 'Report Spotted Box' : 'List My Box'}</span>
          )}
        </button>

        {/* Help text */}
        <div className="text-center">
          <p className="text-xs text-subtle">
            Only location is required. All other fields will use sensible defaults if left empty.
          </p>
        </div>
      </form>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-md h-96 overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <h3 className="text-lg font-extrabold">
                Set Box Location *
              </h3>
              <button
                onClick={handleMapClose}
                disabled={submitting}
                className="text-subtle hover:text-muted disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-64">
              {mapsError ? (
                <div className="w-full h-full bg-surface flex items-center justify-center">
                  <div className="text-center p-4">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-muted text-sm">{mapsError}</p>
                  </div>
                </div>
              ) : !mapsLoaded ? (
                <div className="w-full h-full bg-surface flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-line border-t-accent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-muted text-sm">Loading Google Maps...</p>
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
                className="btn-primary w-full"
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