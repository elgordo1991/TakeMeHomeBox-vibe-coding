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

        googleMapRef.current.addListener('click', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          setFormData(prev => ({
            ...prev,
            coordinates: { lat, lng }
          }));

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

    const userId = user?.uid ?? user?.id ?? 'anonymous';

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
        userId: userId,
        userEmail: user.email,
        username: user.username,
      };

      const listingId = await createListing(listingData);
      console.log('✅ Listing created with ID:', listingId);

      setSubmitSuccess(true);

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
      if (error.message.includes('Firebase is not configured')) {
        setSubmitError('Database connection error. Please check your internet connection and try again.');
      } else if (error.message.includes('Permission denied')) {
        setSubmitError('You do not have permission to create listings. Please sign in again.');
      } else if (error.message.includes('Firestore is currently unavailable')) {
        setSubmitError('Service temporarily unavailable. Please try again in a few moments.');
      } else {
        setSubmitError(error.message || 'Failed to create listing. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return <div>/* your JSX form UI remains here */</div>;
};

export default AddListing;