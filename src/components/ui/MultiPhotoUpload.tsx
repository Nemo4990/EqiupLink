import { useRef, useCallback } from 'react';
import { Camera as CameraIcon, X, Upload, Image as ImageIcon, Plus } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { applyWatermarkToUrl } from '../../lib/useWatermark';
import toast from 'react-hot-toast';

interface MultiPhotoUploadProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  required?: boolean;
  folder?: string;
  maxPhotos?: number;
}

export default function MultiPhotoUpload({
  urls,
  onChange,
  label = 'Photos',
  required = false,
  folder = 'general',
  maxPhotos = 6,
}: MultiPhotoUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB.'); return null; }

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: false });
    if (error) { toast.error('Failed to upload photo. Try again.'); return null; }

    const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
    let publicUrl = data.publicUrl;

    const watermarkedUrl = await applyWatermarkToUrl(publicUrl, user.id);
    return watermarkedUrl;
  }, [user, folder]);

  const handleFiles = async (files: FileList) => {
    const remaining = maxPhotos - urls.length;
    if (remaining <= 0) { toast.error(`Maximum ${maxPhotos} photos allowed.`); return; }

    const toUpload = Array.from(files).slice(0, remaining);
    const uploadToast = toast.loading(`Uploading ${toUpload.length} photo${toUpload.length > 1 ? 's' : ''}...`);
    const results = await Promise.all(toUpload.map(uploadFile));
    toast.dismiss(uploadToast);
    const newUrls = results.filter((u): u is string => !!u);
    if (newUrls.length) {
      onChange([...urls, ...newUrls]);
      toast.success(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} uploaded`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleTakePhoto = async () => {
    if (!Capacitor.isNativePlatform()) { inputRef.current?.click(); return; }
    try {
      const photo = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
      if (photo.dataUrl) {
        const blob = await (await fetch(photo.dataUrl)).blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = await uploadFile(file);
        if (url) { onChange([...urls, url]); toast.success('Photo added'); }
      }
    } catch { /* user cancelled */ }
  };

  const removePhoto = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const movePhoto = (from: number, to: number) => {
    const next = [...urls];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const canAddMore = urls.length < maxPhotos;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-gray-300 text-sm font-medium">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <span className="text-gray-500 text-xs">{urls.length}/{maxPhotos} photos</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {urls.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-gray-700 group">
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
            >
              <X className="w-3 h-3 text-white" />
            </button>
            {i === 0 && (
              <div className="absolute bottom-1.5 left-1.5 bg-yellow-400 text-gray-900 text-xs font-bold px-1.5 py-0.5 rounded">
                Cover
              </div>
            )}
            {i > 0 && (
              <button
                type="button"
                onClick={() => movePhoto(i, i - 1)}
                className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all"
              >
                &larr; Move
              </button>
            )}
          </div>
        ))}

        {canAddMore && (
          <div
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-yellow-400 hover:bg-yellow-400/5 transition-all group"
          >
            <div className="w-8 h-8 bg-gray-700 group-hover:bg-yellow-400/20 rounded-lg flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4 text-gray-400 group-hover:text-yellow-400" />
            </div>
            <p className="text-gray-500 text-xs text-center group-hover:text-gray-300 transition-colors px-1">
              {urls.length === 0 ? 'Add photos' : 'Add more'}
            </p>
          </div>
        )}
      </div>

      {urls.length === 0 && (
        <div className="mt-3 border-2 border-dashed border-gray-700 bg-gray-800/50 rounded-xl p-6 flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-300 text-sm font-medium">Upload part photos</p>
            <p className="text-gray-500 text-xs mt-1">Up to {maxPhotos} photos · JPG, PNG, WebP up to 10MB each</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {Capacitor.isNativePlatform() && (
              <button type="button" onClick={handleTakePhoto}
                className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors w-full sm:w-auto">
                <CameraIcon className="w-4 h-4" /> Take Photo
              </button>
            )}
            <button type="button" onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-4 py-2.5 rounded-lg transition-colors w-full sm:w-auto">
              <Upload className="w-4 h-4" />
              {Capacitor.isNativePlatform() ? 'Choose from Gallery' : 'Choose Photos'}
            </button>
          </div>
        </div>
      )}

      <p className="text-gray-600 text-xs mt-1.5">First photo is the cover. Hover a photo to remove or reorder.</p>

      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
    </div>
  );
}
