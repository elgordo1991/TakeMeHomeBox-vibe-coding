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
    console.log('🟡 [DEBUG] Converting file to data URL:', file.name);
    const reader = new FileReader();
    reader.onload = () => {
      console.log('✅ [DEBUG] File converted to data URL successfully');
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      console.error('❌ [DEBUG] Error converting file to data URL:', error);
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

// Validate image file
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  console.log('🟡 [DEBUG] Validating image file:', {
    name: file.name,
    type: file.type,
    size: file.size,
    sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
  });

  // Check file type
  if (!file.type.startsWith('image/')) {
    console.error('❌ [DEBUG] Invalid file type:', file.type);
    return { valid: false, error: 'Please select an image file' };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    console.error('❌ [DEBUG] File too large:', file.size, 'bytes (max:', maxSize, 'bytes)');
    return { valid: false, error: 'Image must be smaller than 5MB' };
  }

  console.log('✅ [DEBUG] File validation passed');
  return { valid: true };
};

// ✅ OPTIMIZED: Enhanced image resizing with better quality
export const resizeImage = (
  file: File, 
  maxWidth: number = 1200, 
  maxHeight: number = 800, 
  quality: number = 0.85
): Promise<Blob> => {
  return new Promise((resolve) => {
    console.log('🟡 [DEBUG] Starting image resize:', {
      originalFile: file.name,
      originalSize: file.size,
      maxWidth,
      maxHeight,
      quality
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      console.log('🟡 [DEBUG] Image loaded for resize:', {
        originalWidth: img.width,
        originalHeight: img.height
      });

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

      console.log('🟡 [DEBUG] New dimensions calculated:', { width, height });

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        console.log('✅ [DEBUG] Image resized successfully:', {
          originalSize: file.size,
          newSize: blob!.size,
          compressionRatio: ((file.size - blob!.size) / file.size * 100).toFixed(1) + '%'
        });
        resolve(blob!);
      }, 'image/jpeg', quality);
    };

    img.onerror = (error) => {
      console.error('❌ [DEBUG] Error loading image for resize:', error);
      // Fallback: return original file as blob
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
};

// Check if Firebase Storage is configured
const isStorageConfigured = () => {
  try {
    const configured = !!storage;
    console.log('🟡 [DEBUG] Firebase Storage configured:', configured);
    return configured;
  } catch (error) {
    console.warn('⚠️ [DEBUG] Firebase Storage not configured, falling back to local storage:', error);
    return false;
  }
};

// ✅ OPTIMIZED: Parallel upload processing
const uploadQueue: Array<() => Promise<any>> = [];
let isProcessingUploads = false;

const processUploadQueue = async () => {
  if (isProcessingUploads || uploadQueue.length === 0) return;
  
  console.log('🟡 [DEBUG] Processing upload queue:', uploadQueue.length, 'items');
  isProcessingUploads = true;
  
  // Process up to 3 uploads in parallel
  const batch = uploadQueue.splice(0, 3);
  
  try {
    await Promise.all(batch.map(upload => upload()));
    console.log('✅ [DEBUG] Upload batch completed successfully');
  } catch (error) {
    console.error('❌ [DEBUG] Batch upload error:', error);
  }
  
  isProcessingUploads = false;
  
  // Process remaining uploads
  if (uploadQueue.length > 0) {
    console.log('🟡 [DEBUG] Processing remaining uploads:', uploadQueue.length);
    setTimeout(processUploadQueue, 100);
  }
};

// ✅ OPTIMIZED: Enhanced upload with compression and parallel processing
export const uploadImage = async (file: File, folder: string = 'listings'): Promise<string> => {
  console.log('🟡 [DEBUG] ===== STARTING IMAGE UPLOAD =====');
  console.log('🟡 [DEBUG] Upload parameters:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    folder: folder,
    timestamp: new Date().toISOString()
  });
  
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    console.error('❌ [DEBUG] File validation failed:', validation.error);
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const uploadOperation = async () => {
      try {
        console.log('🟡 [DEBUG] Starting upload operation for:', file.name);

        // ✅ OPTIMIZED: Compress image before upload
        console.log('🟡 [DEBUG] Compressing image...');
        const compressedBlob = await resizeImage(file);
        console.log('✅ [DEBUG] Image compression completed:', {
          originalSize: file.size,
          compressedSize: compressedBlob.size,
          savings: file.size - compressedBlob.size
        });

        // Try Firebase Storage first
        if (isStorageConfigured()) {
          try {
            console.log('🟡 [DEBUG] Attempting Firebase Storage upload...');
            
            // Generate a unique filename
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2);
            const extension = file.name.split('.').pop() || 'jpg';
            const filename = `${timestamp}-${randomId}.${extension}`;
            
            console.log('🟡 [DEBUG] Generated filename:', filename);
            console.log('🟡 [DEBUG] Full storage path:', `${folder}/${filename}`);
            
            // Create storage reference
            const storageRef = ref(storage, `${folder}/${filename}`);
            console.log('🟡 [DEBUG] Storage reference created');
            
            // Upload compressed file
            console.log('🟡 [DEBUG] Starting Firebase Storage upload...');
            const uploadResult = await uploadBytes(storageRef, compressedBlob);
            console.log('✅ [DEBUG] Firebase Storage upload completed:', uploadResult);
            
            // Get download URL
            console.log('🟡 [DEBUG] Getting download URL...');
            const url = await getDownloadURL(storageRef);
            console.log('✅ [DEBUG] Download URL obtained:', url);
            
            console.log('🎉 [DEBUG] ===== FIREBASE UPLOAD SUCCESS =====');
            console.log('📸 [DEBUG] Final image URL:', url);
            
            resolve(url);
            return;
          } catch (error: any) {
            console.error('❌ [DEBUG] Firebase Storage upload failed:', error);
            console.error('❌ [DEBUG] Error details:', {
              code: error.code,
              message: error.message,
              stack: error.stack
            });
            
            if (error.code === 'storage/unauthorized') {
              console.error('❌ [DEBUG] Storage permission denied. Check your Firebase Storage rules.');
            } else if (error.code === 'storage/quota-exceeded') {
              console.error('❌ [DEBUG] Storage quota exceeded. Please check your Firebase plan.');
            } else if (error.code === 'storage/unauthenticated') {
              console.error('❌ [DEBUG] Authentication required for storage upload.');
            } else if (error.code === 'storage/retry-limit-exceeded') {
              console.error('❌ [DEBUG] Upload retry limit exceeded. Please try again later.');
            } else if (error.code === 'storage/invalid-format') {
              console.error('❌ [DEBUG] Invalid file format for upload.');
            } else {
              console.error('❌ [DEBUG] Unknown storage error:', error.message);
            }
            
            // Fall back to local storage
            console.log('🟡 [DEBUG] Falling back to local storage...');
          }
        } else {
          console.log('🟡 [DEBUG] Firebase Storage not configured, using local storage');
        }

        // Fallback to local storage
        try {
          console.log('🟡 [DEBUG] Starting local storage fallback for:', file.name);
          
          // Convert blob to data URL
          const reader = new FileReader();
          reader.onload = () => {
            console.log('🟡 [DEBUG] Blob converted to data URL for local storage');
            const dataUrl = reader.result as string;
            
            // Generate a unique filename
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2);
            const extension = file.name.split('.').pop() || 'jpg';
            const filename = `${folder}/${timestamp}-${randomId}.${extension}`;
            
            console.log('🟡 [DEBUG] Local storage filename:', filename);
            
            // Store in localStorage for persistence
            try {
              localStorage.setItem(`uploaded_image_${filename}`, dataUrl);
              console.log('✅ [DEBUG] Image stored in localStorage successfully');
              
              const localUrl = `local://${filename}`;
              console.log('🎉 [DEBUG] ===== LOCAL STORAGE SUCCESS =====');
              console.log('📸 [DEBUG] Local Image URL:', localUrl);
              
              resolve(localUrl);
            } catch (storageError) {
              console.error('❌ [DEBUG] localStorage write failed:', storageError);
              reject(new Error('Failed to store image locally: ' + storageError));
            }
          };
          
          reader.onerror = (readerError) => {
            console.error('❌ [DEBUG] FileReader error:', readerError);
            reject(new Error('Failed to process compressed image'));
          };
          
          console.log('🟡 [DEBUG] Reading blob as data URL...');
          reader.readAsDataURL(compressedBlob);
        } catch (error: any) {
          console.error('❌ [DEBUG] Local storage upload failed:', error);
          reject(new Error('Failed to process image: ' + error.message));
        }
      } catch (error: any) {
        console.error('❌ [DEBUG] ===== IMAGE UPLOAD FAILED =====');
        console.error('❌ [DEBUG] Upload operation error:', error);
        reject(error);
      }
    };

    // Add to queue for parallel processing
    console.log('🟡 [DEBUG] Adding upload to queue');
    uploadQueue.push(uploadOperation);
    processUploadQueue();
  });
};

// Get uploaded image URL
export const getImageUrl = (path: string): string => {
  console.log('🟡 [DEBUG] Getting image URL for path:', path);
  
  // If it's already a full URL (Firebase Storage), return as is
  if (path.startsWith('http')) {
    console.log('✅ [DEBUG] Returning Firebase Storage URL:', path);
    return path;
  }
  
  // Handle local storage URLs
  if (path.startsWith('local://')) {
    const filename = path.replace('local://', '');
    console.log('🟡 [DEBUG] Looking up local storage image:', filename);
    const storedImage = localStorage.getItem(`uploaded_image_${filename}`);
    if (storedImage) {
      console.log('✅ [DEBUG] Found local storage image');
      return storedImage;
    } else {
      console.warn('⚠️ [DEBUG] Local storage image not found, using placeholder');
      return 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400';
    }
  }
  
  // Fallback to placeholder
  console.warn('⚠️ [DEBUG] Unknown path format, using placeholder:', path);
  return 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400';
};

// ✅ OPTIMIZED: Enhanced multiple image upload with parallel processing
export const uploadMultipleImages = async (files: File[], folder: string = 'listings'): Promise<string[]> => {
  console.log('🟡 [DEBUG] ===== STARTING BATCH IMAGE UPLOAD =====');
  console.log('🟡 [DEBUG] Batch upload parameters:', {
    fileCount: files.length,
    folder: folder,
    files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
  });
  
  try {
    // ✅ OPTIMIZED: Process uploads in parallel with concurrency limit
    const uploadPromises = files.map((file, index) => {
      console.log(`🟡 [DEBUG] Queuing upload ${index + 1}/${files.length}:`, file.name);
      return uploadImage(file, folder);
    });
    
    console.log('🟡 [DEBUG] Starting parallel upload of', files.length, 'images...');
    
    // Process all uploads in parallel
    const results = await Promise.all(uploadPromises);
    
    console.log('🎉 [DEBUG] ===== BATCH UPLOAD SUCCESS =====');
    console.log('✅ [DEBUG] All uploads completed:', {
      totalFiles: files.length,
      successCount: results.length,
      urls: results
    });
    
    return results;
  } catch (error: any) {
    console.error('❌ [DEBUG] ===== BATCH UPLOAD FAILED =====');
    console.error('❌ [DEBUG] Batch upload error:', error);
    throw new Error('Failed to upload multiple images: ' + error.message);
  }
};

// Delete uploaded image
export const deleteImage = async (path: string): Promise<void> => {
  console.log('🟡 [DEBUG] Starting image deletion:', path);
  
  // Handle Firebase Storage URLs
  if (path.startsWith('http') && isStorageConfigured()) {
    try {
      console.log('🟡 [DEBUG] Deleting from Firebase Storage...');
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      console.log('✅ [DEBUG] Image deleted from Firebase Storage');
      return;
    } catch (error: any) {
      console.error('❌ [DEBUG] Error deleting from Firebase Storage:', error);
      
      if (error.code === 'storage/object-not-found') {
        console.warn('⚠️ [DEBUG] Image not found in storage (may have been already deleted)');
      } else if (error.code === 'storage/unauthorized') {
        console.error('❌ [DEBUG] Permission denied for image deletion');
      }
    }
  }
  
  // Handle local storage
  if (path.startsWith('local://')) {
    try {
      console.log('🟡 [DEBUG] Deleting from local storage...');
      const filename = path.replace('local://', '');
      localStorage.removeItem(`uploaded_image_${filename}`);
      console.log('✅ [DEBUG] Image deleted from local storage');
    } catch (error: any) {
      console.error('❌ [DEBUG] Error deleting from local storage:', error);
    }
  }
};