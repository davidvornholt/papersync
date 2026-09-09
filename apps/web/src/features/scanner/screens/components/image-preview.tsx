'use client';

import { Button } from '@papersync/ui/button';
import { motion } from 'motion/react';
import Image from 'next/image';
import { Spinner } from '@/shared/components/motion-loading';

type ImagePreviewProps = {
  readonly preview: string;
  readonly onClear: () => void;
  readonly onProcess: () => void;
  readonly isProcessing: boolean;
  readonly canProcess: boolean;
};

export const ImagePreview = ({
  preview,
  onClear,
  onProcess,
  isProcessing,
  canProcess,
}: ImagePreviewProps): React.ReactElement => (
  <motion.div
    initial={false}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-4"
  >
    <div className="relative overflow-hidden border border-hairline">
      <Image
        src={preview}
        alt="Scanned planner preview"
        className="h-auto w-full"
        width={800}
        height={600}
        unoptimized={true}
      />
    </div>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
      <Button variant="secondary" onClick={onClear} className="sm:flex-1">
        Change image
      </Button>
      <Button
        onClick={onProcess}
        disabled={isProcessing || !canProcess}
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
