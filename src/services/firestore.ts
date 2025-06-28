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
  Timestamp
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

// Create a new listing
export const createListing = async (listingData: BoxListingInput): Promise<string> => {
  try {
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

    const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), docData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
};

// Get all active listings
export const getActiveListings = async (): Promise<BoxListing[]> => {
  try {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
  } catch (error) {
    console.error('Error fetching listings:', error);
    throw error;
  }
};

// Get listings by category
export const getListingsByCategory = async (category: string): Promise<BoxListing[]> => {
  try {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('status', '==', 'active'),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
  } catch (error) {
    console.error('Error fetching listings by category:', error);
    throw error;
  }
};

// Get user's listings
export const getUserListings = async (userId: string): Promise<BoxListing[]> => {
  try {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoxListing));
  } catch (error) {
    console.error('Error fetching user listings:', error);
    throw error;
  }
};

// Subscribe to real-time listings updates
export const subscribeToListings = (
  callback: (listings: BoxListing[]) => void,
  category?: string
) => {
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

    return onSnapshot(q, (querySnapshot) => {
      const listings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BoxListing));
      callback(listings);
    });
  } catch (error) {
    console.error('Error subscribing to listings:', error);
    throw error;
  }
};

// Update listing status
export const updateListingStatus = async (
  listingId: string, 
  status: 'active' | 'taken' | 'expired'
): Promise<void> => {
  try {
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId);
    await updateDoc(listingRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating listing status:', error);
    throw error;
  }
};

// Add rating to listing
export const addRatingToListing = async (
  listingId: string,
  userId: string,
  rating: number,
  comment?: string
): Promise<void> => {
  try {
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
    }
  } catch (error) {
    console.error('Error adding rating:', error);
    throw error;
  }
};

// Delete listing
export const deleteListing = async (listingId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId));
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
};

// Search listings
export const searchListings = async (searchTerm: string): Promise<BoxListing[]> => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation - for production, consider using Algolia or similar
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
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
  } catch (error) {
    console.error('Error searching listings:', error);
    throw error;
  }
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
  try {
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
  } catch (error) {
    console.error('Error getting nearby listings:', error);
    throw error;
  }
};