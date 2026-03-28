import { useState, useRef, useCallback } from 'react';
import { Camera as CameraIcon, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface PhotoUploadProps {
  onUpload: (url: string) => void;
  onRemove: () => void;
  photoUrl: string | null;
  label?: string;
  required?: boolean;
  folder?: string;
}

export default function PhotoUpload({
  onUpload,
  onRemove,
  photoUrl,
  label = 'Photo',
  required = false,
  folder = 'general',
}: PhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${folder}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, { upsert: false });

      if (error) throw error;

      const { data } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(path);

      onUpload(data.publicUrl);
      toast.success('Photo uploaded!');
    } catch {
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [user, folder, onUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleTakePhoto = async () => {
    if (!Capacitor.isNativePlatform()) {
      inputRef.current?.click();
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (photo.dataUrl) {
        const blob = await (await fetch(photo.dataUrl)).blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await uploadFile(file);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const handleChooseFromGallery = async () => {
    if (!Capacitor.isNativePlatform()) {
      inputRef.current?.click();
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (photo.dataUrl) {
        const blob = await (await fetch(photo.dataUrl)).blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await uploadFile(file);
      }
    } catch (error) {
      console.error('Error choosing photo:', error);
    }
  };

  return (
    <div>
      <label className="block text-gray-300 text-sm font-medium mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {photoUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-800">
          <img
            src={photoUrl}
            alt="Uploaded"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 w-8 h-8 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white/80 text-xs">
            <CameraIcon className="w-3.5 h-3.5" />
            <span>Photo uploaded</span>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 text-xs bg-black/50 hover:bg-black/70 text-white px-2 py-1 rounded-lg transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all ${
            dragOver
              ? 'border-yellow-400 bg-yellow-400/5'
              : 'border-gray-700 bg-gray-800/50'
          }`}
        >
          {uploading ? (
            <>
              <div className="w-10 h-10 border-2 border-gray-600 border-t-yellow-400 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-gray-300 text-sm font-medium">
                  {dragOver ? 'Drop image here' : 'Select photo source'}
                </p>
                <p className="text-gray-500 text-xs mt-1">JPG, PNG, WebP up to 10MB</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                {Capacitor.isNativePlatform() && (
                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors w-full sm:w-auto"
                  >
                    <CameraIcon className="w-4 h-4" />
                    Take Photo
                  </button>
                )}
                <button
                  type="button"
                  onClick={Capacitor.isNativePlatform() ? handleChooseFromGallery : () => inputRef.current?.click()}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-4 py-2.5 rounded-lg transition-colors w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  {Capacitor.isNativePlatform() ? 'Choose from Gallery' : 'Choose Photo'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
