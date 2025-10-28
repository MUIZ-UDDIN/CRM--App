import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ImageCropperProps {
  imageFile: File;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageFile, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Load image
  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  const getCroppedImg = useCallback(async (useCrop: PixelCrop | null = null) => {
    if (!imgRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to match profile picture (200x200)
    const targetSize = 200;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Use provided crop or default to full image centered
    const cropToUse = useCrop || completedCrop;
    
    if (cropToUse) {
      // Draw the cropped image
      ctx.drawImage(
        image,
        cropToUse.x * scaleX,
        cropToUse.y * scaleY,
        cropToUse.width * scaleX,
        cropToUse.height * scaleY,
        0,
        0,
        targetSize,
        targetSize
      );
    } else {
      // No crop selected - use center square of image
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      const x = (image.naturalWidth - size) / 2;
      const y = (image.naturalHeight - size) / 2;
      
      ctx.drawImage(
        image,
        x,
        y,
        size,
        size,
        0,
        0,
        targetSize,
        targetSize
      );
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas is empty'));
          }
        },
        'image/jpeg',
        0.95
      );
    });
  }, [completedCrop]);

  const handleCropComplete = async () => {
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Crop Profile Picture</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            <p>Drag to adjust the crop area. The image will be resized to 200x200 pixels for your profile picture.</p>
          </div>

          <div className="flex justify-center mb-6 bg-gray-100 p-4 rounded-lg">
            {imageSrc && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  style={{ maxHeight: '60vh', maxWidth: '100%' }}
                />
              </ReactCrop>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCropComplete}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center"
            >
              <CheckIcon className="h-5 w-5 mr-2" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
