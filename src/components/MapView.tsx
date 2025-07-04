import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Clock, MessageCircle, Locate, AlertCircle, Wifi, WifiOff, RefreshCw, Send, X, CheckCircle, Camera } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { loadGoogleMapsScript, getDarkMapStyles, getCurrentLocation } from '../utils/googleMaps';
import { 
  subscribeToListings, 
  addRatingToListing, 
  addCommentToListing,
  updateListingStatus,
  markListingAsFound,
  calculateDistance,
  getConnectionState,
  BoxListing 
} from '../services/firestore';

declare global {
  interface Window {
    google: any;
  }
}

interface BoxListingWithDistance extends BoxListing {
  distance?: string;
  timePosted?: string;
}

const MapView: React.FC = () => {
  const { } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBox, setSelectedBox] = useState<BoxListingWithDistance | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [listings, setListings] = useState<BoxListingWithDistance[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'reconnecting'>('online');
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [markingAsFound, setMarkingAsFound] = useState(false);
  const [markAsFoundError, setMarkAsFoundError] = useState<string | null>(null);
  const [showMarkTakenConfirm, setShowMarkTakenConfirm] = useState(false);
  const [markingAsTaken, setMarkingAsTaken] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'books', name: 'Books' },
    { id: 'clothes', name: 'Clothes' },
    { id: 'toys', name: 'Toys' },
    { id: 'kitchen', name: 'Kitchen' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'furniture', name: 'Furniture' },
    { id: 'garden', name: 'Garden' },
    { id: 'sports', name: 'Sports' },
    { id: 'other', name: 'Other' },
  ];

  // Monitor connection status
  useEffect(() => {
    const checkConnectionStatus = () => {
      const state = getConnectionState();
      setConnectionStatus(state === 'connected' ? 'online' : 
                         state === 'reconnecting' ? 'reconnecting' : 'offline');
    };

    // Check initially
    checkConnectionStatus();

    // Check periodically
    const interval = setInterval(checkConnectionStatus, 2000);

    const handleOnline = () => {
      setConnectionStatus('online');
      setRetryCount(0);
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // Subscribe to listings from Firestore with improved error handling
  useEffect(() => {
    setLoadingListings(true);
    
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    const unsubscribe = subscribeToListings(
      (firestoreListings) => {
        setConnectionStatus('online');
        setRetryCount(0);
        setIsReconnecting(false);
        
        // Process listings to add distance and time info
        const processedListings = firestoreListings.map(listing => {
          let distance = 'Unknown';
          let timePosted = 'Unknown';
          
          // Calculate distance if user location is available
          if (userLocation) {
            const distanceKm = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              listing.location.coordinates.latitude,
              listing.location.coordinates.longitude
            );
            distance = distanceKm < 1 
              ? `${Math.round(distanceKm * 1000)}m`
              : `${distanceKm.toFixed(1)}km`;
          }
          
          // Calculate time posted
          if (listing.createdAt) {
            const now = new Date();
            const created = listing.createdAt.toDate();
            const diffMs = now.getTime() - created.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffDays > 0) {
              timePosted = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else if (diffHours > 0) {
              timePosted = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else {
              const diffMinutes = Math.floor(diffMs / (1000 * 60));
              timePosted = `${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
            }
          }
          
          return {
            ...listing,
            distance,
            timePosted
          };
        });
        
        setListings(processedListings);
        setLoadingListings(false);
      },
      selectedCategory
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedCategory, userLocation]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
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

  // Update markers when listings change
  useEffect(() => {
    if (googleMapRef.current) {
      addMarkersToMap();
    }
  }, [listings]);

  // Helper function to choose an emoji based on rating
  const getRatingEmojiForMarker = (rating: number) => {
    if (rating >= 4.5) return '💎';     // Perfect
    if (rating >= 3.5) return '✨';     // Great
    if (rating >= 2.5) return '📦';     // Okay
    if (rating >= 1.5) return '💩';     // Poor
    if (rating > 0)    return '🗑️';    // Trash
    return '❓';                         // Unrated
  };

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

    // Add box markers with emoji labels based on rating
    listings.forEach((box) => {
      const emoji = getRatingEmojiForMarker(box.rating || 0);
      
      const marker = new window.google.maps.Marker({
        position: {
          lat: box.location.coordinates.latitude,
          lng: box.location.coordinates.longitude
        },
        map: googleMapRef.current,
        title: box.title,
        label: {
          text: emoji,
          fontSize: "18px",
          fontWeight: "bold"
        }
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

  const handleRetryConnection = async () => {
    setIsReconnecting(true);
    setConnectionStatus('reconnecting');
    setRetryCount(prev => prev + 1);
    
    try {
      setConnectionStatus('online');
      setRetryCount(0);
      
      // Refresh the page to re-establish all connections
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to reconnect:', error);
      setConnectionStatus('offline');
    } finally {
      setIsReconnecting(false);
    }
  };

  // Get rating emoji based on rating value
  const getRatingEmoji = (rating: number) => {
    if (rating >= 4.5) return '💎'; // Perfect quality
    if (rating >= 3.5) return '✨'; // Great quality
    if (rating >= 2.5) return '📦'; // Okay quality
    if (rating >= 1.5) return '💩'; // Poor quality
    return '🗑️'; // Trash quality
  };

  const renderBoxRating = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const emoji = getRatingEmoji(rating);
    const sizeClass = size === 'lg' ? 'text-2xl' : 'text-lg';
    
    return (
      <div className="flex items-center space-x-1">
        <span className={sizeClass}>{emoji}</span>
      </div>
    );
  };

  const renderInteractiveRating = (currentRating: number, onRate: (rating: number) => void) => {
    const ratingOptions = [
      { value: 1, emoji: '🗑️', label: 'Trash' },
      { value: 2, emoji: '💩', label: 'Poor' },
      { value: 3, emoji: '📦', label: 'Okay' },
      { value: 4, emoji: '✨', label: 'Great' },
      { value: 5, emoji: '💎', label: 'Perfect' }
    ];
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-2">
          {ratingOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onRate(option.value)}
              onMouseEnter={() => setHoverRating(option.value)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={ratingLoading}
              className={`text-3xl transition-all duration-200 hover:scale-110 active:animate-press-down p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                option.value <= (hoverRating || currentRating) 
                  ? 'bg-dark-blue-light border border-silver/50' 
                  : 'opacity-50 hover:opacity-100'
              }`}
              title={option.label}
            >
              {option.emoji}
            </button>
          ))}
        </div>
        <div className="text-center">
          <p className="text-sm text-silver/60">
            {hoverRating > 0 
              ? ratingOptions.find(r => r.value === hoverRating)?.label
              : currentRating > 0 
                ? `Current: ${ratingOptions.find(r => r.value === currentRating)?.label}`
                : 'Select a rating'
            }
          </p>
        </div>
        
        {ratingError && (
          <div className="text-center">
            <p className="text-red-400 text-sm">{ratingError}</p>
          </div>
        )}
        
        {ratingLoading && (
          <div className="text-center">
            <div className="w-4 h-4 border-2 border-silver/30 border-t-silver rounded-full animate-spin mx-auto"></div>
            <p className="text-silver/60 text-sm mt-1">Saving rating...</p>
          </div>
        )}
      </div>
    );
  };

  const handleRating = async (rating: number) => {
    if (!selectedBox || !user) {
      setRatingError('Authentication required to rate');
      return;
    }

    if (!selectedBox.id) {
      setRatingError('Invalid listing ID');
      return;
    }

    console.log('🟡 Attempting to rate listing:', {
      listingId: selectedBox.id,
      rating: rating,
      userId: user.uid,
      username: user.username
    });

    setRatingLoading(true);
    setRatingError(null);

    try {
      // ✅ FIXED: Call with correct parameter order: listingId, ratingValue, userId
      await addRatingToListing(selectedBox.id, rating, user.uid);
      
      // Update local state immediately for better UX
      const updatedBox = { ...selectedBox };
      const existingRatingIndex = updatedBox.ratings.findIndex(r => r.userId === user.uid);
      
      if (existingRatingIndex >= 0) {
        updatedBox.ratings[existingRatingIndex] = { userId: user.uid, rating };
      } else {
        updatedBox.ratings.push({ userId: user.uid, rating });
      }
      
      // Recalculate average rating
      const averageRating = updatedBox.ratings.reduce((sum, r) => sum + r.rating, 0) / updatedBox.ratings.length;
      updatedBox.rating = Math.round(averageRating * 10) / 10;
      
      setSelectedBox(updatedBox);
      setShowRating(false);
      setHoverRating(0);
      
      console.log('✅ Rating saved successfully');
      
      // Show success feedback
      const ratingLabel = getRatingEmoji(rating);
      setTimeout(() => {
        alert(`Thanks for rating! You gave ${ratingLabel} (${rating}/5).`);
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Error adding rating:', error);
      
      // Provide specific error messages
      if (error.message.includes('Missing required parameters')) {
        setRatingError('Invalid rating data. Please try again.');
      } else if (error.message.includes('Rating must be between 1 and 5')) {
        setRatingError('Please select a valid rating (1-5).');
      } else if (error.message.includes('Listing not found')) {
        setRatingError('This listing no longer exists.');
      } else if (error.code === 'permission-denied') {
        setRatingError('Permission denied. Please check your authentication.');
      } else if (error.code === 'unauthenticated') {
        setRatingError('Please sign in to rate listings.');
      } else if (error.code === 'unavailable') {
        setRatingError('Service temporarily unavailable. Please try again.');
      } else {
        setRatingError(error.message || 'Failed to save rating. Please try again.');
      }
    } finally {
      setRatingLoading(false);
    }
  };

  const handleComment = async () => {
    if (!selectedBox || !user) {
      setCommentError('Authentication required to comment');
      return;
    }

    if (!selectedBox.id) {
      setCommentError('Invalid listing ID');
      return;
    }

    if (!commentText.trim()) {
      setCommentError('Please enter a comment');
      return;
    }

    if (commentText.trim().length > 500) {
      setCommentError('Comment must be 500 characters or less');
      return;
    }

    console.log('🟡 Attempting to add comment:', {
      listingId: selectedBox.id,
      userId: user.uid,
      username: user.username,
      text: commentText.trim()
    });

    setCommentLoading(true);
    setCommentError(null);

    try {
      await addCommentToListing(
        selectedBox.id,
        user.uid,
        user.username,
        commentText.trim(),
        user.avatar
      );
      
      // Update local state immediately for better UX
      const updatedBox = { ...selectedBox };
      const newComment = {
        userId: user.uid,
        username: user.username,
        text: commentText.trim(),
        createdAt: { toDate: () => new Date() } as any,
        ...(user.avatar && { userAvatar: user.avatar })
      };
      
      updatedBox.comments = [...(updatedBox.comments || []), newComment];
      setSelectedBox(updatedBox);
      setCommentText('');
      
      console.log('✅ Comment saved successfully');
      
    } catch (error: any) {
      console.error('❌ Error adding comment:', error);
      
      // Provide specific error messages
      if (error.message.includes('Missing required parameters')) {
        setCommentError('Invalid comment data. Please try again.');
      } else if (error.message.includes('Comment must be 500 characters or less')) {
        setCommentError('Comment is too long. Please keep it under 500 characters.');
      } else if (error.message.includes('Listing not found')) {
        setCommentError('This listing no longer exists.');
      } else if (error.code === 'permission-denied') {
        setCommentError('Permission denied. Please check your authentication.');
      } else if (error.code === 'unauthenticated') {
        setCommentError('Please sign in to leave comments.');
      } else if (error.code === 'unavailable') {
        setCommentError('Service temporarily unavailable. Please try again.');
      } else {
        setCommentError(error.message || 'Failed to save comment. Please try again.');
      }
    } finally {
      setCommentLoading(false);
    }
  };

  // ✅ NEW: Handle marking listing as found
  const handleMarkAsFound = async () => {
    if (!selectedBox || !user) {
      setMarkAsFoundError('Authentication required');
      return;
    }

    if (!selectedBox.id) {
      setMarkAsFoundError('Invalid listing ID');
      return;
    }

    // Prevent users from marking their own listings as found
    if (selectedBox.userId === user.uid) {
      setMarkAsFoundError('You cannot mark your own listing as found');
      return;
    }

    console.log('🟡 Attempting to mark listing as found:', {
      listingId: selectedBox.id,
      userId: user.uid,
      username: user.username
    });

    setMarkingAsFound(true);
    setMarkAsFoundError(null);

    try {
      // Mark the listing as found and update user's itemsTaken count
      await markListingAsFound(selectedBox.id, user.uid, true);
      
      // Update local state immediately for better UX
      const updatedBox = { ...selectedBox };
      updatedBox.status = 'taken';
      updatedBox.takenBy = user.uid;
      updatedBox.isSpotted = true;
      
      setSelectedBox(updatedBox);
      
      console.log('✅ Listing marked as found successfully');
      
      // Show success message and close modal
      setTimeout(() => {
        alert('🎉 Great find! Your itemsTaken count has been updated. Thanks for being part of the community!');
        setSelectedBox(null);
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Error marking listing as found:', error);
      
      // Provide specific error messages
      if (error.message.includes('Missing required parameters')) {
        setMarkAsFoundError('Invalid request data. Please try again.');
      } else if (error.message.includes('Listing not found')) {
        setMarkAsFoundError('This listing no longer exists.');
      } else if (error.code === 'permission-denied') {
        setMarkAsFoundError('Permission denied. Please check your authentication.');
      } else if (error.code === 'unauthenticated') {
        setMarkAsFoundError('Please sign in to mark items as found.');
      } else if (error.code === 'unavailable') {
        setMarkAsFoundError('Service temporarily unavailable. Please try again.');
      } else {
        setMarkAsFoundError(error.message || 'Failed to mark as found. Please try again.');
      }
    } finally {
      setMarkingAsFound(false);
    }
  };

  const handleMarkAsTaken = async () => {
    if (!selectedBox || !user) return;
    
    setMarkingAsTaken(true);
    try {
      await updateListingStatus(selectedBox.id!, 'taken');
      setSelectedBox(null);
      setShowMarkTakenConfirm(false);
      alert('Box marked as taken!');
    } catch (error) {
      console.error('Error marking as taken:', error);
      alert('Failed to mark as taken. Please try again.');
    } finally {
      setMarkingAsTaken(false);
    }
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const created = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const filteredBoxes = listings.filter(box => {
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
              {loadingListings && (
                <span className="ml-2 text-sm text-silver/60">(Loading...)</span>
              )}
            </h1>
            <div className="flex items-center space-x-2">
              {/* Connection Status Indicator */}
              <div className="flex items-center space-x-1">
                {connectionStatus === 'online' ? (
                  <span title="Connected"><Wifi className="w-4 h-4 text-green-400"   /></span>
                ) : connectionStatus === 'reconnecting' ? (
                  <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" title="Reconnecting..." />
                ) : (
                  <button
                    onClick={handleRetryConnection}
                    disabled={isReconnecting}
                    className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    title="Connection lost - Click to retry"
                  >
                    {isReconnecting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                    {retryCount > 0 && <span className="text-xs">({retryCount})</span>}
                  </button>
                )}
              </div>
              
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
          </div>
          
          {/* Connection Status Banner */}
          {connectionStatus === 'offline' && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Connection lost. Showing cached data.</span>
              </div>
              <button
                onClick={handleRetryConnection}
                disabled={isReconnecting}
                className="text-red-400 hover:text-red-300 text-sm underline disabled:opacity-50"
              >
                {isReconnecting ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}
          
          {connectionStatus === 'reconnecting' && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
              <span className="text-yellow-400 text-sm">Reconnecting to server...</span>
            </div>
          )}
          
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
        {loadingListings ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-silver/30 border-t-silver rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-silver">Loading listings...</p>
          </div>
        ) : filteredBoxes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-silver-light mb-2">No boxes found</h3>
            <p className="text-silver">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your search or category filter'
                : 'Be the first to add a box to your community!'
              }
            </p>
            {connectionStatus === 'offline' && (
              <p className="text-red-400 text-sm mt-2">
                You're offline. Some listings may not be visible.
              </p>
            )}
          </div>
        ) : (
          filteredBoxes.map((box) => (
            <div
              key={box.id}
              onClick={() => setSelectedBox(box)}
              className="card-dark overflow-hidden hover:shadow-silver-glow transition-shadow cursor-pointer active:animate-press-down"
            >
              <div className="flex">
                <img
                  src={box.images[0] || 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400'}
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
                      {renderBoxRating(box.rating || 0)}
                      <span className="text-sm text-silver ml-1">
                        {box.rating ? box.rating.toFixed(1) : '0.0'}
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
          ))
        )}
      </div>

      {/* Mark Taken Confirmation Modal */}
      {showMarkTakenConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card-dark rounded-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Taking the whole box?</h3>
              <p className="text-silver text-sm leading-relaxed">
                If there are still items here, just click <strong>"Mark as Found"</strong> instead! 
                This helps keep the listing active for others.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowMarkTakenConfirm(false);
                  handleMarkAsFound();
                }}
                className="btn-primary w-full flex items-center justify-center space-x-2"
                disabled={markingAsFound}
              >
                {markingAsFound ? (
                  <>
                    <div className="w-4 h-4 border-2 border-silver/30 border-t-silver rounded-full animate-spin"></div>
                    <span>Marking as Found...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark as Found (Recommended)</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleMarkAsTaken}
                disabled={markingAsTaken}
                className="w-full py-3 px-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markingAsTaken ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                    <span>Marking as Taken...</span>
                  </div>
                ) : (
                  'Yes, Mark Entire Box as Taken'
                )}
              </button>
              
              <button
                onClick={() => setShowMarkTakenConfirm(false)}
                disabled={markingAsTaken || markingAsFound}
                className="btn-secondary w-full disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Box Detail Modal with improved scrolling */}
      {selectedBox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="card-dark rounded-t-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-slide-up">
            <div className="overflow-y-auto max-h-96">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-silver-light">
                    {selectedBox.title}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedBox(null);
                      setShowRating(false);
                      setShowComments(false);
                      setHoverRating(0);
                      setRatingError(null);
                      setRatingLoading(false);
                      setCommentText('');
                      setCommentError(null);
                      setCommentLoading(false);
                      setMarkAsFoundError(null);
                      setMarkingAsFound(false);
                      setShowMarkTakenConfirm(false);
                    }}
                    className="text-silver/60 hover:text-silver"
                  >
                    ✕
                  </button>
                </div>
                
                <img
                  src={selectedBox.images[0] || 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400'}
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
                    {renderBoxRating(selectedBox.rating || 0)}
                    <span className="text-sm font-medium text-silver-light ml-1">
                      {selectedBox.rating ? selectedBox.rating.toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>

                {/* User info */}
                <div className="bg-dark-blue-light rounded-lg p-3 mb-4 border border-silver/30">
                  <p className="text-sm text-silver/60">Listed by</p>
                  <p className="text-silver font-medium">{selectedBox.username}</p>
                </div>

                {/* Mark as Found Error */}
                {markAsFoundError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{markAsFoundError}</p>
                  </div>
                )}

                {/* Rating Section */}
                {showRating && user ? (
                  <div className="bg-dark-blue-light rounded-xl p-4 mb-4 border border-silver/30">
                    <h3 className="text-center font-semibold text-silver-light mb-3">
                      Rate this box
                    </h3>
                    <p className="text-center text-sm text-silver mb-4">
                      How would you rate the quality and accuracy of this listing?
                    </p>
                    {renderInteractiveRating(
                      selectedBox.ratings.find(r => r.userId === user.uid)?.rating || 0, 
                      handleRating
                    )}
                    <div className="flex justify-center space-x-2 mt-4">
                      <button
                        onClick={() => {
                          setShowRating(false);
                          setRatingError(null);
                          setHoverRating(0);
                        }}
                        disabled={ratingLoading}
                        className="btn-secondary disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : showComments ? (
                  /* Comments Section */
                  <div className="bg-dark-blue-light rounded-xl p-4 mb-4 border border-silver/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-silver-light">
                        Comments ({selectedBox.comments?.length || 0})
                      </h3>
                      <button
                        onClick={() => {
                          setShowComments(false);
                          setCommentText('');
                          setCommentError(null);
                        }}
                        className="text-silver/60 hover:text-silver"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Comments List */}
                    <div className="max-h-48 overflow-y-auto mb-4 space-y-3">
                      {selectedBox.comments && selectedBox.comments.length > 0 ? (
                        selectedBox.comments.map((comment, index) => (
                          <div key={index} className="bg-dark-blue rounded-lg p-3 border border-silver/20">
                            <div className="flex items-start space-x-3">
                              {comment.userAvatar ? (
                                <img
                                  src={comment.userAvatar}
                                  alt={comment.username}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-silver/20 flex items-center justify-center">
                                  <span className="text-silver text-sm font-medium">
                                    {comment.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-silver font-medium text-sm">
                                    {comment.username}
                                  </span>
                                  <span className="text-silver/60 text-xs">
                                    {getTimeAgo(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-silver text-sm">
                                  {comment.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <MessageCircle className="w-8 h-8 text-silver/40 mx-auto mb-2" />
                          <p className="text-silver/60 text-sm">No comments yet</p>
                          <p className="text-silver/40 text-xs">Be the first to leave a comment!</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Add Comment Form */}
                    {user && (
                      <div className="space-y-3">
                        <div className="relative">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Leave a comment..."
                            rows={3}
                            maxLength={500}
                            disabled={commentLoading}
                            className="input-dark w-full p-3 rounded-lg resize-none disabled:opacity-50"
                          />
                          <div className="absolute bottom-2 right-2 text-xs text-silver/60">
                            {commentText.length}/500
                          </div>
                        </div>
                        
                        {commentError && (
                          <div className="text-red-400 text-sm">
                            {commentError}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => {
                              setShowComments(false);
                              setCommentText('');
                              setCommentError(null);
                            }}
                            disabled={commentLoading}
                            className="btn-secondary disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleComment}
                            disabled={commentLoading || !commentText.trim() || connectionStatus === 'offline'}
                            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                          >
                            {commentLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-silver/30 border-t-silver rounded-full animate-spin"></div>
                                <span>Posting...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Post Comment</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    {user && (
                      <>
                        {/* ✅ NEW: Mark as Found Button */}
                        {user.uid !== selectedBox.userId && (
                          <button 
                            onClick={handleMarkAsFound}
                            disabled={markingAsFound || connectionStatus === 'offline'}
                            className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                          >
                            {markingAsFound ? (
                              <>
                                <div className="w-4 h-4 border-2 border-silver/30 border-t-silver rounded-full animate-spin"></div>
                                <span>Marking as Found...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Mark as Found</span>
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Action buttons row */}
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => {
                              setShowRating(true);
                              setRatingError(null);
                            }}
                            className="btn-primary flex-1 flex items-center justify-center space-x-2"
                            disabled={connectionStatus === 'offline'}
                          >
                            <span>{getRatingEmoji(5)}</span>
                            <span>Rate Box</span>
                          </button>
                          {user.uid !== selectedBox.userId && (
                            <button 
                              onClick={() => setShowMarkTakenConfirm(true)}
                              className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                              disabled={connectionStatus === 'offline'}
                            >
                              <Camera className="w-4 h-4" />
                              <span>Mark Taken</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {user && !showRating && !showComments && (
                  <button 
                    onClick={() => {
                      setShowComments(true);
                      setCommentError(null);
                    }}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                    disabled={connectionStatus === 'offline'}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Leave Comment ({selectedBox.comments?.length || 0})</span>
                  </button>
                )}

                {!user && (
                  <div className="text-center p-4 bg-dark-blue-light rounded-lg border border-silver/30">
                    <p className="text-silver text-sm">Sign in to rate boxes and leave comments</p>
                  </div>
                )}

                {connectionStatus === 'offline' && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm text-center">
                      You're offline. Some actions are disabled.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;