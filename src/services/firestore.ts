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
  arrayUnion,
  getDoc,
  increment,
  writeBatch
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
  takenBy?: string;
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
const RETRY_DELAYS = [1000, 2000, 5000];

// ✅ OPTIMIZED: Request queue for batching operations
interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

let operationQueue: QueuedOperation[] = [];
let isProcessingQueue = false;

// ✅ OPTIMIZED: Process operations in batches
const processOperationQueue = async () => {
  if (isProcessingQueue || operationQueue.length === 0) return;
  
  isProcessingQueue = true;
  const batch = operationQueue.splice(0, 5); // Process up to 5 operations at once
  
  try {
    await Promise.all(batch.map(async (op) => {
      try {
        const result = await op.operation();
        op.resolve(result);
      } catch (error) {
        op.reject(error);
      }
    }));
  } catch (error) {
    console.error('Batch operation error:', error);
  }
  
  isProcessingQueue = false;
  
  // Process remaining operations
  if (operationQueue.length > 0) {
    setTimeout(processOperationQueue, 100);
  }
};

// ✅ OPTIMIZED: Queue operations for better performance
const queueOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).substring(2);
    operationQueue.push({
      id,
      operation,
      resolve,
      reject,
      timestamp: Date.now()
    });
    
    processOperationQueue();
  });
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  if (!db) {
    console.error('❌ Firebase Firestore is not configured. Please check your environment variables.');
    return false;
  }
  return true;
};

// ✅ OPTIMIZED: Enhanced retry wrapper with circuit breaker
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
      retryCount = 0;
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

// ✅ OPTIMIZED: Faster listing creation with batched operations and enhanced debugging
export async function createListing(listingData: BoxListingInput): Promise<string> {
  console.log('🟡 [DEBUG] ===== FIRESTORE CREATE LISTING STARTED =====');
  console.log('🟡 [DEBUG] Input data received:', {
    title: listingData.title,
    description: listingData.description,
    category: listingData.category,
    imageCount: listingData.images?.length || 0,
    images: listingData.images,
    location: listingData.location,
    isSpotted: listingData.isSpotted,
    userId: listingData.userId,
    userEmail: listingData.userEmail,
    username: listingData.username
  });
  
  if (!isFirebaseConfigured()) {
    console.error('❌ [DEBUG] Firebase not configured');
    throw new Error('Firebase is not configured. Please set up your Firebase project and environment variables.');
  }

  return queueOperation(async () => {
    try {
      console.log('🟡 [DEBUG] Starting queued operation for createListing');
      
      if (!listingData.userId) {
        console.error('❌ [DEBUG] Missing userId');
        throw new Error('Missing userId in listingData');
      }
      if (!listingData.location?.coordinates) {
        console.error('❌ [DEBUG] Missing location coordinates');
        throw new Error('Missing location coordinates');
      }
      
      console.log('✅ [DEBUG] Basic validation passed');
      
      // Convert input data to Firestore format
      const now = serverTimestamp();
      
      // Calculate expiry date (48 hours from now for non-spotted items)
      const expiresAt = listingData.isSpotted 
        ? null 
        : new Date(Date.now() + 48 * 60 * 60 * 1000);

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
        comments: [],
        status: 'active',
        createdAt: now,
        updatedAt: now,
        ...(expiresAt && { expiresAt: Timestamp.fromDate(expiresAt) }),
      };

      console.log('🟡 [DEBUG] Formatted document data:', docData);

      // ✅ OPTIMIZED: Use batch write for atomic operations
      console.log('🟡 [DEBUG] Creating batch write operation...');
      const batch = writeBatch(db);
      
      // Create the listing
      const listingRef = doc(collection(db, LISTINGS_COLLECTION));
      console.log('🟡 [DEBUG] Generated listing reference:', listingRef.id);
      batch.set(listingRef, docData);
      
      // Update user's itemsGiven count
      const userRef = doc(db, USERS_COLLECTION, listingData.userId);
      console.log('🟡 [DEBUG] Adding user update to batch for userId:', listingData.userId);
      batch.update(userRef, {
        itemsGiven: increment(1),
        lastActive: serverTimestamp()
      });
      
      // Commit batch
      console.log('🟡 [DEBUG] Committing batch operation...');
      await batch.commit();
      
      console.log('🎉 [DEBUG] ===== FIRESTORE CREATE LISTING SUCCESS =====');
      console.log('✅ [DEBUG] Listing saved with ID:', listingRef.id);
      console.log('✅ [DEBUG] User itemsGiven count incremented successfully');

      return listingRef.id;
    } catch (error: any) {
      console.error('❌ [DEBUG] ===== FIRESTORE CREATE LISTING FAILED =====');
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  });
}

// ✅ OPTIMIZED: Enhanced caching with compression
const compressData = (data: any): string => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('Failed to compress data:', error);
    return '[]';
  }
};

const decompressData = (compressed: string): any => {
  try {
    return JSON.parse(compressed);
  } catch (error) {
    console.warn('Failed to decompress data:', error);
    return [];
  }
};

// ✅ OPTIMIZED: Multi-level caching system
const cacheListings = (listings: BoxListing[]) => {
  try {
    const cacheData = {
      data: listings,
      timestamp: Date.now()
    };
    
    // Memory cache (fastest)
    sessionStorage.setItem('cached_listings', compressData(cacheData));
    
    // Persistent cache (survives page refresh)
    localStorage.setItem('cached_listings_persistent', compressData(cacheData));
  } catch (error) {
    console.warn('Failed to cache listings:', error);
  }
};

const getCachedListings = (): BoxListing[] => {
  try {
    // Try memory cache first
    let cached = sessionStorage.getItem('cached_listings');
    if (cached) {
      const { data, timestamp } = decompressData(cached);
      // Use cache if less than 2 minutes old
      if (Date.now() - timestamp < 2 * 60 * 1000) {
        console.log('📦 Using memory cached listings');
        return data;
      }
    }
    
    // Try persistent cache
    cached = localStorage.getItem('cached_listings_persistent');
    if (cached) {
      const { data, timestamp } = decompressData(cached);
      // Use cache if less than 10 minutes old
      if (Date.now() - timestamp < 10 * 60 * 1000) {
        console.log('📦 Using persistent cached listings');
        // Also update memory cache
        sessionStorage.setItem('cached_listings', compressData({ data, timestamp: Date.now() }));
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load cached listings:', error);
  }
  return [];
};

// Get all active listings with enhanced caching
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

// ✅ FIXED: Get user's listings with proper userId validation and caching
export const getUserListings = async (userId: string): Promise<BoxListing[]> => {
  if (!userId) {
    console.error('❌ getUserListings called with undefined or empty userId');
    return [];
  }

  // Check cache first
  const cacheKey = `user_listings_${userId}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 2 * 60 * 1000) { // 2 minutes
        console.log('📦 Using cached user listings');
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load cached user listings');
  }

  if (!isFirebaseConfigured()) {
    console.warn('⚠️ Firebase not configured, checking cached listings for userId:', userId);
    return getCachedListings().filter(listing => listing.userId === userId);
  }

  return withRetry(async () => {
    console.log('📦 Fetching listings for userId:', userId);
    
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    const listings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
    
    // Cache the results
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: listings,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache user listings');
    }
    
    console.log(`✅ Retrieved ${listings.length} listings for user ${userId}`);
    return listings;
  }, 'getUserListings').catch(error => {
    console.error('❌ Error fetching user listings:', error);
    return getCachedListings().filter(listing => listing.userId === userId);
  });
};

// ✅ FIXED: Enhanced real-time subscription with better error handling
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
    
    // ✅ OPTIMIZED: Debounce updates to prevent excessive re-renders
    let debounceTimeout: NodeJS.Timeout | null = null;
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        connectionState = 'connected';
        
        const listings = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as BoxListing));
        
        // Cache the results
        cacheListings(listings);
        
        // ✅ OPTIMIZED: Debounce callback to prevent excessive updates
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }
        
        debounceTimeout = setTimeout(() => {
          console.log(`📦 Real-time update: ${listings.length} listings`);
          callback(listings);
        }, 100);
      },
      (error) => {
        console.error('❌ Error in listings subscription:', error);
        connectionState = 'disconnected';
        
        // Handle specific errors
        if (error.code === 'permission-denied') {
          console.error('Permission denied for real-time updates. Check security rules.');
          callback(getCachedListings());
        } else if (error.code === 'unavailable' || error.code === 'deadline-exceeded' || error.code === 'failed-precondition') {
          console.error('Firestore temporarily unavailable. Using cached data.');
          callback(getCachedListings());
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
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
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

  return queueOperation(async () => {
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId);
    await updateDoc(listingRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    console.log(`✅ Listing ${listingId} status updated to ${status}`);
  });
};

// ✅ OPTIMIZED: Mark listing as found with batched operations
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

  return queueOperation(async () => {
    console.log(`[📦 Firestore] Marking listing ${listingId} as found by user ${userId}`);
    
    // ✅ OPTIMIZED: Use batch write for atomic operations
    const batch = writeBatch(db);
    
    // Update the listing
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId);
    const updateData: any = {
      status: 'taken',
      takenBy: userId,
      updatedAt: serverTimestamp(),
    };
    
    if (markAsSpotted) {
      updateData.isSpotted = true;
    }
    
    batch.update(listingRef, updateData);
    
    // Update user's itemsTaken count
    const userRef = doc(db, USERS_COLLECTION, userId);
    batch.update(userRef, {
      itemsTaken: increment(1),
      lastActive: serverTimestamp()
    });
    
    // Commit batch
    await batch.commit();
    
    console.log(`[🎉 Firestore] Successfully marked listing as found and updated user stats`);
  });
};

// ✅ OPTIMIZED: Enhanced rating function with batching
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

  return queueOperation(async () => {
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
      rating: parseFloat(avg.toFixed(2)),
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Rating added to listing ${listingId}: ${ratingValue}/5 (new avg: ${avg.toFixed(2)})`);
  });
};

// ✅ OPTIMIZED: Add comment with queuing
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

  return queueOperation(async () => {
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
  });
};

// Delete listing
export const deleteListing = async (listingId: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  return queueOperation(async () => {
    await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId));
    console.log(`✅ Listing ${listingId} deleted successfully`);
  });
};

// ✅ OPTIMIZED: Enhanced search with caching
export const searchListings = async (searchTerm: string): Promise<BoxListing[]> => {
  // Check cache first
  const cacheKey = `search_${searchTerm.toLowerCase()}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 minutes
        console.log('📦 Using cached search results');
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load cached search results');
  }

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
    const results = allListings.filter(listing => 
      listing.title.toLowerCase().includes(searchLower) ||
      listing.description.toLowerCase().includes(searchLower) ||
      listing.category.toLowerCase().includes(searchLower)
    );
    
    // Cache results
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: results,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache search results');
    }
    
    return results;
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

// ✅ OPTIMIZED: Get nearby listings with caching
export const getNearbyListings = async (
  userLat: number,
  userLng: number,
  radiusKm: number = 10
): Promise<(BoxListing & { distance: number })[]> => {
  const cacheKey = `nearby_${userLat.toFixed(3)}_${userLng.toFixed(3)}_${radiusKm}`;
  
  // Check cache first
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 2 * 60 * 1000) { // 2 minutes
        console.log('📦 Using cached nearby listings');
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load cached nearby listings');
  }

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
    
    const results = allListings
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
    
    // Cache results
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: results,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache nearby listings');
    }
    
    return results;
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

// Get current connection state
export const getConnectionState = () => connectionState;