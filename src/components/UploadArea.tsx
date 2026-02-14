import { useRef, useCallback } from 'react';
import type { UploadedImage } from '../types';
import { PlusIcon, CloseIcon } from './Icons';

interface UploadAreaProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
}

let nextId = 0;

export default function UploadArea({ images, onImagesChange, maxImages = 5 }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const remaining = maxImages - images.length;
      if (remaining <= 0) return;

      const newFiles = Array.from(fileList).slice(0, remaining);
      const newImages: UploadedImage[] = newFiles.map((file, i) => ({
        id: `img-${++nextId}`,
        file,
        previewUrl: URL.createObjectURL(file),
        index: images.length + i + 1,
      }));

      onImagesChange([...images, ...newImages]);
    },
    [images, maxImages, onImagesChange]
  );

  const removeImage = useCallback(
    (id: string) => {
      const removed = images.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);

      const updated = images
        .filter((img) => img.id !== id)
        .map((img, i) => ({ ...img, index: i + 1 }));
      onImagesChange(updated);
    },
    [images, onImagesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const canAdd = images.length < maxImages;

  return (
    <div className="flex items-start gap-2 flex-shrink-0">
      {/* Uploaded thumbnails */}
      {images.map((img) => (
        <div key={img.id} className="relative group w-14 h-14 flex-shrink-0">
          <img
            src={img.previewUrl}
            alt={`参考图 ${img.index}`}
            className="w-full h-full object-cover rounded-lg border border-gray-700"
          />
          <span className="absolute bottom-0 left-0 bg-black/70 text-[10px] text-cyan-400 px-1 rounded-br-lg rounded-tl-lg">
            @{img.index}
          </span>
          <button
            onClick={() => removeImage(img.id)}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <CloseIcon className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      ))}

      {/* Add button */}
      {canAdd && (
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="w-14 h-14 flex-shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-600 hover:border-cyan-500 hover:bg-cyan-500/5 transition-colors cursor-pointer"
        >
          <PlusIcon className="w-5 h-5 text-gray-400" />
          <span className="text-[9px] text-gray-500 leading-tight">参考内容</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
