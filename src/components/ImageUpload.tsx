import React, { useState, useRef } from 'react';
import { Camera, Upload, X, AlertCircle, Loader } from 'lucide-react';
import { uploadImage, validateImageFile, fileToDataURL, getImageUrl } from '../utils/imageUpload';

interface ImageUploadProps {
  currentImage?: string;
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'square' | 'circle';
  placeholder?: string;
  folder?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageUploaded,
  onImageRemoved,
  className = '',
  size = 'md',
  shape = 'square',
  placeholder = 'Upload Image',
  folder = 'images'
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const shapeClasses = {
    square: 'rounded-lg',
    circle: 'rounded-full'
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      // Show preview immediately
      const previewUrl = await fileToDataURL(file);
      setPreview(previewUrl);
      setUploading(true);

      // Upload file
      const uploadedUrl = await uploadImage(file, folder);
      onImageUploaded(uploadedUrl);
      setPreview(null);
    } catch (error: any) {
      setError(error.message || 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    if (onImageRemoved) {
      onImageRemoved();
    }
    setPreview(null);
    setError(null);
  };

  const displayImage = preview || (currentImage ? getImageUrl(currentImage) : null);

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClasses[size]} ${shapeClasses[shape]} border-2 border-dashed border-silver/30 overflow-hidden relative group hover:border-silver transition-colors`}>
        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt="Upload preview"
              className="w-full h-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <Loader className="w-6 h-6 text-silver animate-spin" />
              </div>
            )}
            {!uploading && onImageRemoved && (
              <button
                onClick={handleRemove}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-dark-blue-light transition-colors">
            {uploading ? (
              <Loader className="w-6 h-6 text-silver animate-spin mb-1" />
            ) : (
              <Camera className="w-6 h-6 text-silver/60 mb-1" />
            )}
            <span className="text-xs text-silver/60 text-center px-1">
              {uploading ? 'Uploading...' : placeholder}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 flex items-center space-x-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;