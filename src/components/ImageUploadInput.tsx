import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { showError } from '../lib/toast';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  businessId?: string;
  previewHeightClass?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  label = 'Image (URL or File Upload)',
  placeholder = 'https://... or click Upload',
  businessId,
  previewHeightClass = 'h-24'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressAndUploadImage = (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      showError('Invalid File', 'Please upload a valid JPG, JPEG, PNG or WEBP image.');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress image using canvas
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);

        // Upload to server endpoint
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            base64: compressedBase64,
            businessId: businessId || 'global'
          })
        })
          .then(res => res.json())
          .then(data => {
            setIsUploading(false);
            if (data && data.url) {
              onChange(data.url);
            } else {
              // Fallback to base64 directly
              onChange(compressedBase64);
            }
          })
          .catch(err => {
            console.warn('Server upload fallback to base64:', err);
            setIsUploading(false);
            // Fallback directly to compressed base64 if server upload endpoint unreachable
            onChange(compressedBase64);
          });
      };
      img.onerror = () => {
        setIsUploading(false);
        showError('Image Read Error', 'Failed to read image file.');
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      compressAndUploadImage(files[0]);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block font-bold text-slate-500 uppercase tracking-wider text-[11px]">
          {label}
        </label>
      )}

      {/* Input row with URL input and Upload Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-8"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-2.5 text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
              title="Clear Image URL"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Image</span>
            </>
          )}
        </button>
      </div>

      {/* Preview Section */}
      {value ? (
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2 overflow-hidden group">
          <div className={`w-full ${previewHeightClass} flex items-center justify-center bg-slate-100 rounded-xl overflow-hidden relative`}>
            <img
              src={value}
              alt="Uploaded preview"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow cursor-pointer transition"
              title="Remove/Delete Image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1 flex justify-between items-center px-1 text-[10px] text-slate-400 font-medium">
            <span className="truncate max-w-[200px] font-mono">{value}</span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-rose-600 hover:underline font-bold cursor-pointer"
            >
              Delete Image
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 flex items-center justify-center text-slate-400 gap-2 text-xs">
          <ImageIcon className="h-4 w-4 text-slate-300" />
          <span>No image selected. Paste URL or click Upload Image above.</span>
        </div>
      )}
    </div>
  );
};
