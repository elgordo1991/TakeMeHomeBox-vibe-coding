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
  arrayUnion,
  getDoc,
  increment
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
  comments: Comment[];
  status: 'active' | 'taken' | 'expired';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
  takenBy?: string; // ✅ NEW: Track who found the item
}

export interface Comment {
  id?: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  createdAt: Timestamp;
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
const USERS_COLLECTION = 'users';

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

// ✅ ENHANCED CREATE LISTING FUNCTION - Now updates user's itemsGiven count
export async function createListing(listingData: BoxListingInput): Promise<string> {
  console.log('[📤 Firestore] Attempting to save listing:', listingData);
  
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Please set up your Firebase project and environment variables.');
  }

  try {
    if (!listingData.userId) throw new Error('Missing userId in listingData');
    if (!listingData.location?.coordinates) throw new Error('Missing location coordinates');
    
    // Convert input data to Firestore format
    const now = serverTimestamp();
    
    // Calculate expiry date (48 hours from now for non-spotted items)
    const expiresAt = listingData.isSpotted 
      ? null 
      : new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const docData = {
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
      comments: [], // Initialize empty comments array
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...(expiresAt && { expiresAt: Timestamp.fromDate(expiresAt) }),
    };

    console.log('[📝 Firestore] Formatted document data:', docData);

    // Create the listing
    const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), docData);
    console.log('[✅ Firestore] Listing saved with ID:', docRef.id);

    // ✅ NEW: Update user's itemsGiven count
    try {
      console.log('[📊 Firestore] Updating user itemsGiven count for userId:', listingData.userId);
      
      await updateDoc(doc(db, USERS_COLLECTION, listingData.userId), {
        itemsGiven: increment(1),
        lastActive: serverTimestamp()
      });
      
      console.log('[✅ Firestore] User itemsGiven count incremented successfully');
    } catch (userUpdateError: any) {
      console.error('[⚠️ Firestore] Failed to update user itemsGiven count:', userUpdateError);
      
      // Don't fail the entire operation if user update fails
      // The listing was created successfully, so we'll just log the warning
      if (userUpdateError.code === 'not-found') {
        console.warn('[⚠️ Firestore] User document not found. User profile may need to be recreated.');
      } else if (userUpdateError.code === 'permission-denied') {
        console.warn('[⚠️ Firestore] Permission denied updating user profile. Check Firestore security rules.');
      } else {
        console.warn('[⚠️ Firestore] Unknown error updating user profile:', userUpdateError.message);
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('[❌ Firestore] Failed to save listing:', error);
    throw error;
  }
}

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

// ✅ NEW: Mark listing as found and update user's itemsTaken count
export const markListingAsFound = async (
  listingId: string,
  userId: string,
  markAsSpotted: boolean = true
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!listingId || !userId) {
    throw new Error('Missing required parameters: listingId and userId');
  }

  return withRetry(async () => {
    console.log(`[📦 Firestore] Marking listing ${listingId} as found by user ${userId}`);
    
    // Update the listing
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId);
    const updateData: any = {
      status: 'taken',
      takenBy: userId,
      updatedAt: serverTimestamp(),
    };
    
    // Optionally mark as spotted if requested
    if (markAsSpotted) {
      updateData.isSpotted = true;
    }
    
    await updateDoc(listingRef, updateData);
    console.log(`[✅ Firestore] Listing ${listingId} marked as taken`);

    // Update user's itemsTaken count
    try {
      console.log(`[📊 Firestore] Updating user itemsTaken count for userId: ${userId}`);
      
      await updateDoc(doc(db, USERS_COLLECTION, userId), {
        itemsTaken: increment(1),
        lastActive: serverTimestamp()
      });
      
      console.log('[✅ Firestore] User itemsTaken count incremented successfully');
    } catch (userUpdateError: any) {
      console.error('[⚠️ Firestore] Failed to update user itemsTaken count:', userUpdateError);
      
      // Don't fail the entire operation if user update fails
      // The listing was marked as taken successfully
      if (userUpdateError.code === 'not-found') {
        console.warn('[⚠️ Firestore] User document not found. User profile may need to be recreated.');
      } else if (userUpdateError.code === 'permission-denied') {
        console.warn('[⚠️ Firestore] Permission denied updating user profile. Check Firestore security rules.');
      } else {
        console.warn('[⚠️ Firestore] Unknown error updating user profile:', userUpdateError.message);
      }
    }
    
    console.log(`[🎉 Firestore] Successfully marked listing as found and updated user stats`);
  }, 'markListingAsFound');
};

// ✅ ENHANCED RATING FUNCTION - Now properly validates and saves ratings
export const addRatingToListing = async (
  listingId: string,
  ratingValue: number,
  userId: string,
  comment?: string
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!listingId || !userId || !ratingValue) {
    throw new Error('Missing required parameters for rating');
  }

  if (ratingValue < 1 || ratingValue > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  return withRetry(async () => {
    const ref = doc(db, LISTINGS_COLLECTION, listingId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      throw new Error('Listing not found');
    }

    const data = snap.data();
    const ratings = data.ratings || [];

    // Remove existing rating from this user if any
    const filteredRatings = ratings.filter((r: any) => r.userId !== userId);
    
    // Add new rating
    const newRating = { userId, rating: ratingValue, ...(comment && { comment }) };
    const newRatings = [...filteredRatings, newRating];

    // Compute new average
    const avg = newRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / newRatings.length;

    await updateDoc(ref, {
      ratings: newRatings,
      rating: parseFloat(avg.toFixed(2)), // ✅ saves updated average
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Rating added to listing ${listingId}: ${ratingValue}/5 (new avg: ${avg.toFixed(2)})`);
  }, 'addRatingToListing');
};

// ✅ NEW: Add comment to listing
export const addCommentToListing = async (
  listingId: string,
  userId: string,
  username: string,
  text: string,
  userAvatar?: string
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!listingId || !userId || !username || !text.trim()) {
    throw new Error('Missing required parameters for comment');
  }

  if (text.trim().length > 500) {
    throw new Error('Comment must be 500 characters or less');
  }

  return withRetry(async () => {
    const ref = doc(db, LISTINGS_COLLECTION, listingId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      throw new Error('Listing not found');
    }

    const newComment: Comment = {
      userId,
      username,
      text: text.trim(),
      createdAt: serverTimestamp() as Timestamp,
      ...(userAvatar && { userAvatar })
    };

    await updateDoc(ref, {
      comments: arrayUnion(newComment),
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Comment added to listing ${listingId} by ${username}`);
  }, 'addCommentToListing');
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