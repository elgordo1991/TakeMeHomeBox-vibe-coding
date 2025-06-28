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

    setError(null);

    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate all files
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }
    }

    try {
      // Show previews immediately
      const previewUrls = await Promise.all(files.map(file => fileToDataURL(file)));
      setPreviews(previewUrls);
      setUploading(true);

      // Upload files
      const uploadedUrls = await uploadMultipleImages(files, folder);
      onImagesChanged([...images, ...uploadedUrls]);
      setPreviews([]);
    } catch (error: any) {
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
    const newImages = images.filter((_, i) => i !== index);
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
              className="w-full h-24 object-cover rounded-lg"
            />
            {uploading && index >= images.length ? (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <Loader className="w-4 h-4 text-silver animate-spin" />
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
          <label className="border-2 border-dashed border-silver/30 rounded-lg h-24 flex flex-col items-center justify-center cursor-pointer hover:border-silver transition-colors hover:bg-dark-blue-light">
            {uploading ? (
              <Loader className="w-6 h-6 text-silver animate-spin mb-1" />
            ) : (
              <Plus className="w-6 h-6 text-silver/60 mb-1" />
            )}
            <span className="text-xs text-silver/60">
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
        <p className="text-sm text-silver/60">
          {allImages.length} of {maxImages} photos
          {allImages.length > 0 && ' • First photo will be the main image'}
        </p>
        
        {error && (
          <div className="flex items-center space-x-1 text-red-400 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiImageUpload;