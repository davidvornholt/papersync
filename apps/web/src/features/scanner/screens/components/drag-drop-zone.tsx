'use client';

import { Button } from '@papersync/ui/button';
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
      className={`w-full border border-dashed py-10 sm:py-12 px-5 sm:px-8 transition-colors duration-300 ${
        isDragging
          ? 'border-accent bg-accent-soft/30'
          : 'border-hairline-strong'
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
            isDragging ? { scale: 1.05, rotate: 3 } : { scale: 1, rotate: 0 }
          }
          className="w-14 h-14 mx-auto mb-5 rounded-full bg-accent-soft/60 flex items-center justify-center"
        >
          <svg
            className={`w-7 h-7 transition-colors ${
              isDragging ? 'text-accent' : 'text-graphite'
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

        <p className="serif text-[18px] text-ink mb-1">
          {isDragging ? 'Drop image here' : 'Capture your planner'}
        </p>
        {!isDragging && (
          <p className="text-[13px] text-graphite mb-5">
            Take a photo or upload an existing scan
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-center">
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="sm:min-w-[10rem]"
          >
            Upload image
          </Button>
          <Button
            onClick={() => cameraInputRef.current?.click()}
            className="sm:min-w-[10rem]"
          >
            Take photo
          </Button>
        </div>
      </div>
    </section>
  );
};
