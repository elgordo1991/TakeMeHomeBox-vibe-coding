import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  GeoPoint,
  Timestamp,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase.config';

export interface BoxListing {
  id?: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  location: {
    address: string;
    coordinates: GeoPoint;
  };
  isSpotted: boolean;
  userId: string;
  userEmail: string;
  username: string;
  rating: number;
  ratings: { userId: string; rating: number; comment?: string }[];
  status: 'active' | 'taken' | 'expired';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface BoxListingInput {
  title: string;
  description: string;
  category: string;
  images: string[];
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  isSpotted: boolean;
  userId: string;
  userEmail: string;
  username: string;
}

// Collections
const LISTINGS_COLLECTION = 'listings';

// Connection state management
let connectionState: 'connected' | 'disconnected' | 'reconnecting' = 'connected';
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 5000]; // Progressive delays

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  if (!db) {
    console.error('❌ Firebase Firestore is not configured. Please check your environment variables.');
    return false;
  }
  return true;
};

// Enhanced retry wrapper with exponential backoff
const withRetry = async <T>(
  operation: () => Promise<T>, 
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      connectionState = 'connected';
      const result = await operation();
      retryCount = 0; // Reset on success
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ ${operationName} attempt ${attempt}/${maxRetries} failed:`, error);
      
      // Don't retry on certain errors
      if (error.code === 'permission-denied' || 
          error.code === 'unauthenticated' ||
          error.code === 'invalid-argument') {
        throw error;
      }
      
      if (attempt === maxRetries) {
        connectionState = 'disconnected';
        break;
      }
      
      // Progressive delay with jitter
      const baseDelay = RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)];
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      
      connectionState = 'reconnecting';
      console.log(`⏳ Retrying ${operationName} in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Create a new listing with enhanced error handling and validation
export const createListing = async (listingData: BoxListingInput): Promise<string> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Please set up your Firebase project and environment variables.');
  }

  // Validate required fields more thoroughly
  if (!listingData.userId) {
    throw new Error('User ID is required but missing');
  }
  
  if (!listingData.userEmail) {
    throw new Error('User email is required but missing');
  }
  
  if (!listingData.username) {
    throw new Error('Username is required but missing');
  }

  if (!listingData.location?.coordinates) {
    throw new Error('Location coordinates are required');
  }

  return withRetry(async () => {
    const now = serverTimestamp();
    
    // Calculate expiry date (48 hours from now for non-spotted items)
    const expiresAt = listingData.isSpotted 
      ? null 
      : new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const docData: Omit<BoxListing, 'id'> = {
      title: listingData.title || 'Untitled Box',
      description: listingData.description || 'No description provided',
      category: listingData.category || 'other',
      images: listingData.images || [],
      location: {
        address: listingData.location.address || 'Location set on map',
        coordinates: new GeoPoint(
          listingData.location.coordinates.lat,
          listingData.location.coordinates.lng
        ),
      },
      isSpotted: listingData.isSpotted,
      userId: listingData.userId,
      userEmail: listingData.userEmail,
      username: listingData.username,
      rating: 0,
      ratings: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...(expiresAt && { expiresAt: Timestamp.fromDate(expiresAt) }),
    };

    console.log('📝 Creating listing:', { 
      title: docData.title, 
      category: docData.category,
      userId: docData.userId,
      coordinates: docData.location.coordinates
    });
    
    const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), docData);
    console.log('✅ Listing created successfully with ID:', docRef.id);
    return docRef.id;
  }, 'createListing');
};

// Get all active listings with caching
export const getActiveListings = async (): Promise<BoxListing[]> => {
  if (!isFirebaseConfigured()) {
    console.warn('⚠️ Firebase not configured, returning cached listings');
    return getCachedListings();
  }

  return withRetry(async () => {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    const listings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
    
    // Cache the results
    cacheListings(listings);
    
    console.log(`📦 Retrieved ${listings.length} active listings`);
    return listings;
  }, 'getActiveListings').catch(error => {
    console.error('❌ Error fetching listings, returning cached data:', error);
    return getCachedListings();
  });
};

// Cache management for offline support
const cacheListings = (listings: BoxListing[]) => {
  try {
    localStorage.setItem('cached_listings', JSON.stringify({
      data: listings,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to cache listings:', error);
  }
};

const getCachedListings = (): BoxListing[] => {
  try {
    const cached = localStorage.getItem('cached_listings');
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Use cache if less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        console.log('📦 Using cached listings');
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load cached listings:', error);
  }
  return [];
};

// Get listings by category
export const getListingsByCategory = async (category: string): Promise<BoxListing[]> => {
  if (!isFirebaseConfigured()) {
    return getCachedListings().filter(listing => listing.category === category);
  }

  return withRetry(async () => {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('status', '==', 'active'),
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
  }, 'getListingsByCategory').catch(error => {
    console.error('❌ Error fetching listings by category:', error);
    return getCachedListings().filter(listing => listing.category === category);
  });
};

// Get user's listings
export const getUserListings = async (userId: string): Promise<BoxListing[]> => {
  if (!isFirebaseConfigured()) {
    return getCachedListings().filter(listing => listing.userId === userId);
  }

  return withRetry(async () => {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
  }, 'getUserListings').catch(error => {
    console.error('❌ Error fetching user listings:', error);
    return getCachedListings().filter(listing => listing.userId === userId);
  });
};

// Enhanced real-time subscription with better error handling
export const subscribeToListings = (
  callback: (listings: BoxListing[]) => void,
  category?: string
) => {
  if (!isFirebaseConfigured()) {
    console.warn('⚠️ Firebase not configured, using cached data');
    callback(getCachedListings());
    return () => {};
  }

  try {
    let q;
    
    if (category && category !== 'all') {
      q = query(
        collection(db, LISTINGS_COLLECTION),
        where('status', '==', 'active'),
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, LISTINGS_COLLECTION),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    console.log('🔄 Subscribing to listings updates...');
    
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        reconnectAttempts = 0;
        connectionState = 'connected';
        
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        
        const listings = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as BoxListing));
        
        // Cache the results
        cacheListings(listings);
        
        console.log(`📦 Real-time update: ${listings.length} listings`);
        callback(listings);
      },
      (error) => {
        console.error('❌ Error in listings subscription:', error);
        connectionState = 'disconnected';
        
        // Handle specific errors
        if (error.code === 'permission-denied') {
          console.error('Permission denied for real-time updates. Check security rules.');
          callback(getCachedListings());
        } else if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
          console.error('Firestore unavailable for real-time updates.');
          
          // Use cached data immediately
          callback(getCachedListings());
          
          // Implement exponential backoff for reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
            console.log(`⏳ Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttempts})`);
            
            connectionState = 'reconnecting';
            reconnectTimeout = setTimeout(() => {
              // Try to re-enable network connection
              enableNetwork(db).catch(console.error);
            }, delay);
          } else {
            console.error('Max reconnection attempts reached. Using cached data.');
            callback(getCachedListings());
          }
        } else if (error.code === 'unauthenticated') {
          console.error('Authentication required for real-time updates.');
          callback(getCachedListings());
        } else {
          console.error('Unknown error in real-time subscription:', error);
          callback(getCachedListings());
        }
      }
    );
    
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      unsubscribe();
    };
  } catch (error) {
    console.error('❌ Error subscribing to listings:', error);
    callback(getCachedListings());
    return () => {};
  }
};

// Update listing status
export const updateListingStatus = async (
  listingId: string, 
  status: 'active' | 'taken' | 'expired'
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  return withRetry(async () => {
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId);
    await updateDoc(listingRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    console.log(`✅ Listing ${listingId} status updated to ${status}`);
  }, 'updateListingStatus');
};

// Enhanced rating function with proper data handling
export const addRatingToListing = async (
  listingId: string,
  userId: string,
  rating: number,
  comment?: string
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!listingId || !userId || !rating) {
    throw new Error('Missing required parameters for rating');
  }

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  return withRetry(async () => {
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId);
    
    // Get current listing to update ratings array
    const listingDoc = await getDocs(query(
      collection(db, LISTINGS_COLLECTION),
      where('__name__', '==', listingId)
    ));
    
    if (!listingDoc.empty) {
      const currentData = listingDoc.docs[0].data() as BoxListing;
      const existingRatings = currentData.ratings || [];
      
      // Remove existing rating from this user if any
      const filteredRatings = existingRatings.filter(r => r.userId !== userId);
      
      // Add new rating
      const newRating = { userId, rating, ...(comment && { comment }) };
      const newRatings = [...filteredRatings, newRating];
      
      // Calculate new average rating
      const averageRating = newRatings.reduce((sum, r) => sum + r.rating, 0) / newRatings.length;
      
      await updateDoc(listingRef, {
        ratings: newRatings,
        rating: Math.round(averageRating * 10) / 10,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Rating added to listing ${listingId}: ${rating}/5`);
    } else {
      throw new Error('Listing not found');
    }
  }, 'addRatingToListing');
};

// Delete listing
export const deleteListing = async (listingId: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  return withRetry(async () => {
    await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId));
    console.log(`✅ Listing ${listingId} deleted successfully`);
  }, 'deleteListing');
};

// Search listings
export const searchListings = async (searchTerm: string): Promise<BoxListing[]> => {
  if (!isFirebaseConfigured()) {
    const cached = getCachedListings();
    const searchLower = searchTerm.toLowerCase();
    return cached.filter(listing => 
      listing.title.toLowerCase().includes(searchLower) ||
      listing.description.toLowerCase().includes(searchLower) ||
      listing.category.toLowerCase().includes(searchLower)
    );
  }

  return withRetry(async () => {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    const allListings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
    
    // Client-side filtering for search
    const searchLower = searchTerm.toLowerCase();
    return allListings.filter(listing => 
      listing.title.toLowerCase().includes(searchLower) ||
      listing.description.toLowerCase().includes(searchLower) ||
      listing.category.toLowerCase().includes(searchLower)
    );
  }, 'searchListings').catch(error => {
    console.error('❌ Error searching listings:', error);
    const cached = getCachedListings();
    const searchLower = searchTerm.toLowerCase();
    return cached.filter(listing => 
      listing.title.toLowerCase().includes(searchLower) ||
      listing.description.toLowerCase().includes(searchLower) ||
      listing.category.toLowerCase().includes(searchLower)
    );
  });
};

// Helper function to calculate distance between two points
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Get nearby listings
export const getNearbyListings = async (
  userLat: number,
  userLng: number,
  radiusKm: number = 10
): Promise<(BoxListing & { distance: number })[]> => {
  if (!isFirebaseConfigured()) {
    const cached = getCachedListings();
    return cached
      .map(listing => {
        const distance = calculateDistance(
          userLat,
          userLng,
          listing.location.coordinates.latitude,
          listing.location.coordinates.longitude
        );
        return { ...listing, distance };
      })
      .filter(listing => listing.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  return withRetry(async () => {
    const allListings = await getActiveListings();
    
    return allListings
      .map(listing => {
        const distance = calculateDistance(
          userLat,
          userLng,
          listing.location.coordinates.latitude,
          listing.location.coordinates.longitude
        );
        
        return {
          ...listing,
          distance
        };
      })
      .filter(listing => listing.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }, 'getNearbyListings').catch(error => {
    console.error('❌ Error getting nearby listings:', error);
    const cached = getCachedListings();
    return cached
      .map(listing => {
        const distance = calculateDistance(
          userLat,
          userLng,
          listing.location.coordinates.latitude,
          listing.location.coordinates.longitude
        );
        return { ...listing, distance };
      })
      .filter(listing => listing.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  });
};

// Network status management
export const enableFirestoreNetwork = async (): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      await enableNetwork(db);
      connectionState = 'connected';
      console.log('✅ Firestore network enabled');
    } catch (error) {
      console.error('❌ Error enabling Firestore network:', error);
      connectionState = 'disconnected';
    }
  }
};

export const disableFirestoreNetwork = async (): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      await disableNetwork(db);
      connectionState = 'disconnected';
      console.log('✅ Firestore network disabled');
    } catch (error) {
      console.error('❌ Error disabling Firestore network:', error);
    }
  }
};

// Get current connection state
export const getConnectionState = () => connectionState;

// Force reconnection
export const forceReconnect = async (): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      await disableNetwork(db);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await enableNetwork(db);
      connectionState = 'connected';
      console.log('✅ Firestore reconnected successfully');
    } catch (error) {
      console.error('❌ Error during forced reconnection:', error);
      connectionState = 'disconnected';
      throw error;
    }
  }
};