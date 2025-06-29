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
  disableNetwork
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

// Connection retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  if (!db) {
    console.error('❌ Firebase Firestore is not configured. Please check your environment variables.');
    return false;
  }
  return true;
};

// Retry wrapper for Firestore operations
const withRetry = async <T>(operation: () => Promise<T>, operationName: string): Promise<T> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`❌ ${operationName} attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Failed after ${MAX_RETRIES} attempts`);
};

// Create a new listing - aligned with permissive rules
export const createListing = async (listingData: BoxListingInput): Promise<string> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Please set up your Firebase project and environment variables.');
  }

  return withRetry(async () => {
    const now = serverTimestamp();
    
    // Calculate expiry date (48 hours from now for non-spotted items)
    const expiresAt = listingData.isSpotted 
      ? null 
      : new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const docData: Omit<BoxListing, 'id'> = {
      ...listingData,
      location: {
        address: listingData.location.address,
        coordinates: new GeoPoint(
          listingData.location.coordinates.lat,
          listingData.location.coordinates.lng
        ),
      },
      rating: 0,
      ratings: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...(expiresAt && { expiresAt: Timestamp.fromDate(expiresAt) }),
    };

    console.log('📝 Creating listing:', { title: docData.title, category: docData.category });
    const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), docData);
    console.log('✅ Listing created successfully with ID:', docRef.id);
    return docRef.id;
  }, 'createListing');
};

// Get all active listings - only reads active listings per rules
export const getActiveListings = async (): Promise<BoxListing[]> => {
  if (!isFirebaseConfigured()) {
    console.warn('⚠️ Firebase not configured, returning empty listings');
    return [];
  }

  return withRetry(async () => {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(50) // Limit to improve performance
    );
    
    const querySnapshot = await getDocs(q);
    const listings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
    
    console.log(`📦 Retrieved ${listings.length} active listings`);
    return listings;
  }, 'getActiveListings').catch(error => {
    console.error('❌ Error fetching listings:', error);
    return [];
  });
};

// Get listings by category
export const getListingsByCategory = async (category: string): Promise<BoxListing[]> => {
  if (!isFirebaseConfigured()) {
    return [];
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
    return [];
  });
};

// Get user's listings - works with permissive rules
export const getUserListings = async (userId: string): Promise<BoxListing[]> => {
  if (!isFirebaseConfigured()) {
    return [];
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
    return [];
  });
};

// Subscribe to real-time listings updates with better error handling
export const subscribeToListings = (
  callback: (listings: BoxListing[]) => void,
  category?: string
) => {
  if (!isFirebaseConfigured()) {
    console.warn('⚠️ Firebase not configured, calling callback with empty array');
    callback([]);
    return () => {}; // Return empty unsubscribe function
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
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        reconnectAttempts = 0; // Reset on successful connection
        const listings = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as BoxListing));
        console.log(`📦 Real-time update: ${listings.length} listings`);
        callback(listings);
      },
      (error) => {
        console.error('❌ Error in listings subscription:', error);
        
        // Handle specific errors
        if (error.code === 'permission-denied') {
          console.error('Permission denied for real-time updates. Check security rules.');
          callback([]); // Don't retry for permission errors
        } else if (error.code === 'unavailable') {
          console.error('Firestore unavailable for real-time updates.');
          
          // Implement exponential backoff for reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
            console.log(`⏳ Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttempts})`);
            
            setTimeout(() => {
              // Try to re-enable network connection
              enableNetwork(db).catch(console.error);
            }, delay);
          } else {
            console.error('Max reconnection attempts reached. Falling back to empty data.');
            callback([]);
          }
        } else if (error.code === 'unauthenticated') {
          console.error('Authentication required for real-time updates.');
          callback([]);
        } else {
          console.error('Unknown error in real-time subscription:', error);
          callback([]);
        }
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to listings:', error);
    callback([]);
    return () => {};
  }
};

// Update listing status - works with permissive update rules
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

// Add rating to listing - works with permissive update rules
export const addRatingToListing = async (
  listingId: string,
  userId: string,
  rating: number,
  comment?: string
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
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
      const newRatings = [...filteredRatings, { userId, rating, comment }];
      
      // Calculate new average rating
      const averageRating = newRatings.reduce((sum, r) => sum + r.rating, 0) / newRatings.length;
      
      await updateDoc(listingRef, {
        ratings: newRatings,
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Rating added to listing ${listingId}`);
    }
  }, 'addRatingToListing');
};

// Delete listing - works with permissive delete rules
export const deleteListing = async (listingId: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  return withRetry(async () => {
    await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId));
    console.log(`✅ Listing ${listingId} deleted successfully`);
  }, 'deleteListing');
};

// Search listings - only searches active listings
export const searchListings = async (searchTerm: string): Promise<BoxListing[]> => {
  if (!isFirebaseConfigured()) {
    return [];
  }

  return withRetry(async () => {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation - for production, consider using Algolia or similar
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
    return [];
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

// Get nearby listings - only active listings
export const getNearbyListings = async (
  userLat: number,
  userLng: number,
  radiusKm: number = 10
): Promise<(BoxListing & { distance: number })[]> => {
  if (!isFirebaseConfigured()) {
    return [];
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
    return [];
  });
};

// Network status management
export const enableFirestoreNetwork = async (): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      await enableNetwork(db);
      console.log('✅ Firestore network enabled');
    } catch (error) {
      console.error('❌ Error enabling Firestore network:', error);
    }
  }
};

export const disableFirestoreNetwork = async (): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      await disableNetwork(db);
      console.log('✅ Firestore network disabled');
    } catch (error) {
      console.error('❌ Error disabling Firestore network:', error);
    }
  }
};