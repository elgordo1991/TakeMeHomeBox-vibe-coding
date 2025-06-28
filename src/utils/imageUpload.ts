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

// Simulate upload to cloud storage (in real app, this would upload to Firebase Storage, AWS S3, etc.)
export const uploadImage = async (file: File, folder: string = 'images'): Promise<string> => {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // In a real app, you would upload to your storage service here
  // For now, we'll create a data URL and store it locally
  try {
    const resizedImage = await resizeImage(file);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${folder}/${timestamp}-${randomId}.${extension}`;
    
    // Store in localStorage for persistence (in real app, this would be cloud storage)
    localStorage.setItem(`uploaded_image_${filename}`, resizedImage);
    
    // Return the "URL" (in real app, this would be the cloud storage URL)
    return `local://${filename}`;
  } catch (error) {
    throw new Error('Failed to process image');
  }
};

// Get uploaded image URL (simulate retrieving from storage)
export const getImageUrl = (path: string): string => {
  if (path.startsWith('local://')) {
    const filename = path.replace('local://', '');
    const storedImage = localStorage.getItem(`uploaded_image_${filename}`);
    return storedImage || 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400';
  }
  
  // If it's already a full URL, return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Fallback to placeholder
  return 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400';
};

// Upload multiple images
export const uploadMultipleImages = async (files: File[], folder: string = 'images'): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadImage(file, folder));
  return Promise.all(uploadPromises);
};

// Delete uploaded image (simulate deletion from storage)
export const deleteImage = async (path: string): Promise<void> => {
  if (path.startsWith('local://')) {
    const filename = path.replace('local://', '');
    localStorage.removeItem(`uploaded_image_${filename}`);
  }
  
  // In real app, you would delete from cloud storage here
  await new Promise(resolve => setTimeout(resolve, 500));
};