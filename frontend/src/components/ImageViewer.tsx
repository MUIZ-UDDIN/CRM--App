import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
  userName?: string;
}

export default function ImageViewer({ imageUrl, onClose, userName }: ImageViewerProps) {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
      >
        <XMarkIcon className="h-8 w-8" />
      </button>
      
      <div className="max-w-4xl max-h-[90vh] flex flex-col items-center">
        {userName && (
          <div className="text-white text-lg font-medium mb-4">
            {userName}'s Profile Picture
          </div>
        )}
        <img
          src={imageUrl}
          alt="Profile"
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
