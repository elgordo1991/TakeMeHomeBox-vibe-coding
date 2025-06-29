import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase.config';

// Image upload utility functions
export interface UploadedImage {
  file: File;
  url: string;
  id: string;
}

// Convert file to base64 data URL for preview
export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Validate image file
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select an image file' };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be smaller than 5MB' };
  }

  // Check image dimensions (optional)
  return { valid: true };
};

// Resize image if needed
export const resizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.src = URL.createObjectURL(file);
  });
};

// Check if Firebase Storage is configured
const isStorageConfigured = () => {
  try {
    return !!storage;
  } catch (error) {
    console.warn('Firebase Storage not configured, falling back to local storage');
    return false;
  }
};

// Upload image to Firebase Storage or fallback to local storage
export const uploadImage = async (file: File, folder: string = 'listings'): Promise<string> => {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Try Firebase Storage first (aligns with your storage rules)
  if (isStorageConfigured()) {
    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${timestamp}-${randomId}.${extension}`;
      
      // Create storage reference - aligns with your rules
      const storageRef = ref(storage, `${folder}/${filename}`);
      
      // Upload file
      console.log(`📤 Uploading to Firebase Storage: ${folder}/${filename}`);
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ Image uploaded to Firebase Storage:', downloadURL);
      
      return downloadURL;
    } catch (error: any) {
      console.error('❌ Firebase Storage upload failed:', error);
      
      if (error.code === 'storage/unauthorized') {
        console.error('Storage permission denied. Check your Firebase Storage rules.');
      }
      
      // Fall back to local storage
      console.log('📦 Falling back to local storage...');
    }
  }

  // Fallback to local storage (existing implementation)
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  try {
    const resizedImage = await resizeImage(file);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${folder}/${timestamp}-${randomId}.${extension}`;
    
    // Store in localStorage for persistence
    localStorage.setItem(`uploaded_image_${filename}`, resizedImage);
    
    // Return the "URL"
    return `local://${filename}`;
  } catch (error) {
    throw new Error('Failed to process image');
  }
};

// Get uploaded image URL
export const getImageUrl = (path: string): string => {
  // If it's already a full URL (Firebase Storage), return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Handle local storage URLs
  if (path.startsWith('local://')) {
    const filename = path.replace('local://', '');
    const storedImage = localStorage.getItem(`uploaded_image_${filename}`);
    return storedImage || 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400';
  }
  
  // Fallback to placeholder
  return 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400';
};

// Upload multiple images
export const uploadMultipleImages = async (files: File[], folder: string = 'listings'): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadImage(file, folder));
  return Promise.all(uploadPromises);
};

// Delete uploaded image
export const deleteImage = async (path: string): Promise<void> => {
  // Handle Firebase Storage URLs
  if (path.startsWith('http') && isStorageConfigured()) {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      console.log('✅ Image deleted from Firebase Storage');
      return;
    } catch (error) {
      console.error('❌ Error deleting from Firebase Storage:', error);
    }
  }
  
  // Handle local storage
  if (path.startsWith('local://')) {
    const filename = path.replace('local://', '');
    localStorage.removeItem(`uploaded_image_${filename}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
};