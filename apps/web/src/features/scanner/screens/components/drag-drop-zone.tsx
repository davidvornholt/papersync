'use client';

import { motion } from 'motion/react';
import { PagePickers } from './page-pickers';

type DragDropZoneProps = {
  readonly onFilesSelect: (files: ReadonlyArray<File>) => void;
  readonly isDragging: boolean;
  readonly setIsDragging: (dragging: boolean) => void;
};

export const DragDropZone = ({
  onFilesSelect,
  isDragging,
  setIsDragging,
}: DragDropZoneProps): React.ReactElement => {
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length > 0) {
      onFilesSelect(files);
    }
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Drag-and-drop augments the keyboard-accessible upload and camera buttons.
    <section
      aria-label="Drop zone for planner images"
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      className={`w-full border border-dashed px-5 py-10 transition-colors duration-300 sm:px-8 sm:py-12 ${
        isDragging
          ? 'border-accent bg-accent-soft/30'
          : 'border-hairline-strong'
      }`}
    >
      <div className="text-center">
        <motion.div
          animate={
            isDragging ? { scale: 1.05, rotate: 3 } : { scale: 1, rotate: 0 }
          }
          className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-accent-soft/60"
        >
          <svg
            className={`size-7 transition-colors ${
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

        <p className="serif mb-1 text-[18px] text-ink">
          {isDragging ? 'Drop images here' : 'Capture your planner'}
        </p>
        {isDragging ? null : (
          <p className="mb-5 text-[13px] text-graphite">
            Photograph the front and back, upload scans, or paste an image with
            Ctrl+V or ⌘V
          </p>
        )}

        <PagePickers
          onFilesSelect={onFilesSelect}
          cameraLabel="Take photo"
          filesLabel="Upload images"
          isCameraPrimary={true}
        />
      </div>
    </section>
  );
};
