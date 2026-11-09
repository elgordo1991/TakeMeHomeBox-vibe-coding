import React, { useState, useRef } from 'react';
import { Camera, X, AlertCircle, Loader, Image as ImageIcon } from 'lucide-react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
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

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-3">
        {allImages.map((image, index) => (
          <div key={index} className="relative">
            <img
              src={image}
              alt={`Upload ${index + 1}`}
              className="h-24 w-full rounded-2xl object-cover"
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
        
        {uploading && (
          <div className="flex h-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line">
            <Loader className="mb-1 h-6 w-6 animate-spin text-muted" />
            <span className="text-xs text-subtle">Uploading...</span>
          </div>
        )}

        {canAddMore && (
          <>
            {/* Opens the camera straight away on phones */}
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/40 text-accent-dark transition-colors hover:border-accent hover:bg-accent-soft">
              <Camera className="mb-1 h-6 w-6" />
              <span className="text-xs font-bold">Take photo</span>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {/* Opens the photo library */}
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line text-subtle transition-colors hover:border-line-strong hover:bg-sand">
              <ImageIcon className="mb-1 h-6 w-6" />
              <span className="text-xs font-bold">Choose photo</span>
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
          </>
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