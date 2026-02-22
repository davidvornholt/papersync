'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { Button, Spinner } from '@/shared/components';

type ImagePreviewProps = {
  readonly preview: string;
  readonly onClear: () => void;
  readonly onProcess: () => void;
  readonly isProcessing: boolean;
};

export const ImagePreview = ({
  preview,
  onClear,
  onProcess,
  isProcessing,
}: ImagePreviewProps): React.ReactElement => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-4"
  >
    <div className="relative rounded-xl overflow-hidden border border-border group">
      <Image
        src={preview}
        alt="Scanned planner preview"
        className="w-full h-auto"
        width={800}
        height={600}
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
        <Button variant="secondary" size="sm" onClick={onClear}>
          Change Image
        </Button>
      </div>
    </div>
    <Button
      onClick={onProcess}
      disabled={isProcessing}
      className="w-full"
      size="lg"
    >
      {isProcessing ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Analyzing...
        </>
      ) : (
        'Process Scan'
      )}
    </Button>
  </motion.div>
);
