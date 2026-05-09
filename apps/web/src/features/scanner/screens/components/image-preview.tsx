'use client';

import { Button } from '@papersync/ui/button';
import { motion } from 'motion/react';
import Image from 'next/image';
import { Spinner } from '@/shared/components/motion';

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
    <div className="relative overflow-hidden border border-hairline">
      <Image
        src={preview}
        alt="Scanned planner preview"
        className="w-full h-auto"
        width={800}
        height={600}
        unoptimized
      />
    </div>
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
      <Button variant="secondary" onClick={onClear} className="sm:flex-1">
        Change image
      </Button>
      <Button
        onClick={onProcess}
        disabled={isProcessing}
        className="sm:flex-[2]"
      >
        {isProcessing ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Analyzing...
          </>
        ) : (
          'Process scan'
        )}
      </Button>
    </div>
  </motion.div>
);
