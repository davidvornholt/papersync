'use client';

import { motion } from 'motion/react';
import { useCallback, useRef } from 'react';

type DragDropZoneProps = {
  readonly onFileSelect: (file: File) => void;
  readonly isDragging: boolean;
  readonly setIsDragging: (dragging: boolean) => void;
};

export const DragDropZone = ({
  onFileSelect,
  isDragging,
  setIsDragging,
}: DragDropZoneProps): React.ReactElement => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      onFileSelect(file);
      event.target.value = '';
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) {
        onFileSelect(file);
      }
    },
    [onFileSelect, setIsDragging],
  );

  return (
    <section
      aria-label="Drop zone for planner images"
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      className={`w-full border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
        isDragging ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border'
      }`}
    >
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Take photo with camera"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select image from device"
      />

      <div className="text-center">
        <motion.div
          animate={
            isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }
          }
          className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center"
        >
          <svg
            className={`w-8 h-8 transition-colors ${
              isDragging ? 'text-accent' : 'text-muted-light'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Scan</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </motion.div>

        <p className="text-foreground font-medium mb-2">
          {isDragging ? 'Drop image here' : 'Capture your planner'}
        </p>
        {!isDragging && (
          <p className="text-sm text-muted mb-6">
            Take a photo or upload an existing scan
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            Take Photo
          </motion.button>

          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface border border-border text-foreground font-medium rounded-lg hover:bg-background hover:border-accent/50 transition-colors"
          >
            Upload Image
          </motion.button>
        </div>
      </div>
    </section>
  );
};
