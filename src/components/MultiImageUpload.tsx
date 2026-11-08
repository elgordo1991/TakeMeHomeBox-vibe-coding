import React, { useState, useRef } from 'react';
import { Camera, X, AlertCircle, Loader, Plus } from 'lucide-react';
import { uploadMultipleImages, validateImageFile, fileToDataURL, getImageUrl } from '../utils/imageUpload';

interface MultiImageUploadProps {
  images: string[];
  onImagesChanged: (images: string[]) => void;
  maxImages?: number;
  className?: string;
  folder?: string;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  images,
  onImagesChanged,
  maxImages = 5,
  className = '',
  folder = 'listings'
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    console.log('🟡 [DEBUG] ===== MULTI IMAGE UPLOAD STARTED =====');
    console.log('🟡 [DEBUG] Files selected:', {
      count: files.length,
      currentImages: images.length,
      maxImages: maxImages,
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    setError(null);

    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      const errorMsg = `Maximum ${maxImages} images allowed`;
      console.error('❌ [DEBUG] Too many images:', errorMsg);
      setError(errorMsg);
      return;
    }

    // Validate all files
    for (const file of files) {
      console.log('🟡 [DEBUG] Validating file:', file.name);
      const validation = validateImageFile(file);
      if (!validation.valid) {
        console.error('❌ [DEBUG] File validation failed:', validation.error);
        setError(validation.error || 'Invalid file');
        return;
      }
    }

    console.log('✅ [DEBUG] All files validated successfully');

    try {
      // Show previews immediately
      console.log('🟡 [DEBUG] Generating previews...');
      const previewUrls = await Promise.all(files.map(file => fileToDataURL(file)));
      console.log('✅ [DEBUG] Previews generated:', previewUrls.length);
      
      setPreviews(previewUrls);
      setUploading(true);

      // Upload files
      console.log('🟡 [DEBUG] Starting upload process...');
      const uploadedUrls = await uploadMultipleImages(files, folder);
      console.log('✅ [DEBUG] Upload process completed:', uploadedUrls);
      
      const newImages = [...images, ...uploadedUrls];
      console.log('🟡 [DEBUG] Updating images state:', {
        previousImages: images,
        uploadedUrls: uploadedUrls,
        newImages: newImages
      });
      
      onImagesChanged(newImages);
      setPreviews([]);
      
      console.log('🎉 [DEBUG] ===== MULTI IMAGE UPLOAD SUCCESS =====');
    } catch (error: any) {
      console.error('❌ [DEBUG] ===== MULTI IMAGE UPLOAD FAILED =====');
      console.error('❌ [DEBUG] Upload error:', error);
      setError(error.message || 'Upload failed');
      setPreviews([]);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    console.log('🟡 [DEBUG] Removing image at index:', index);
    console.log('🟡 [DEBUG] Current images:', images);
    
    const newImages = images.filter((_, i) => i !== index);
    console.log('🟡 [DEBUG] Images after removal:', newImages);
    
    onImagesChanged(newImages);
  };

  const allImages = [...images.map(img => getImageUrl(img)), ...previews];
  const canAddMore = allImages.length < maxImages && !uploading;

  console.log('🟡 [DEBUG] MultiImageUpload render state:', {
    images: images,
    previews: previews,
    allImages: allImages.length,
    canAddMore: canAddMore,
    uploading: uploading,
    error: error
  });

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-3">
        {allImages.map((image, index) => (
          <div key={index} className="relative">
            <img
              src={image}
              alt={`Upload ${index + 1}`}
              className="w-full h-24 object-cover rounded-lg"
            />
            {uploading && index >= images.length ? (
              <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <Loader className="w-4 h-4 text-muted animate-spin" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                disabled={uploading || index >= images.length}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        
        {canAddMore && (
          <label className="border-2 border-dashed border-line rounded-2xl h-24 flex flex-col items-center justify-center cursor-pointer hover:border-line-strong transition-colors hover:bg-sand">
            {uploading ? (
              <Loader className="w-6 h-6 text-muted animate-spin mb-1" />
            ) : (
              <Plus className="w-6 h-6 text-subtle mb-1" />
            )}
            <span className="text-xs text-subtle">
              {uploading ? 'Uploading...' : 'Add Photo'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <p className="text-sm text-subtle">
          {allImages.length} of {maxImages} photos
          {allImages.length > 0 && ' • First photo will be the main image'}
        </p>
        
        {error && (
          <div className="flex items-center space-x-1 text-red-600 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiImageUpload;