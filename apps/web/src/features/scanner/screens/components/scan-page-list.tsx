'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { IconButton } from '@/shared/components/icon-button';
import { Modal } from '@/shared/components/modal';
import type { ScanPage } from '../../hooks/use-scan-types';
import { useObjectUrl } from '../hooks/use-object-url';

const thumbnailWidth = 300;
const thumbnailHeight = 400;
const viewerWidth = 1200;
const viewerHeight = 1600;

const PageImage = ({
  page,
  alt,
  width,
  height,
  className,
}: {
  readonly page: ScanPage;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly className: string;
}) => {
  const url = useObjectUrl(page.image);
  return url ? (
    <Image
      src={url}
      alt={alt}
      width={width}
      height={height}
      unoptimized={true}
      className={className}
    />
  ) : null;
};

type ScanPageListProps = {
  readonly pages: ReadonlyArray<ScanPage>;
  readonly onRemove: (id: string) => void;
  readonly isLocked: boolean;
};

export const ScanPageList = ({
  pages,
  onRemove,
  isLocked,
}: ScanPageListProps): React.ReactElement => {
  const [viewedId, setViewedId] = useState<string | null>(null);
  const viewedIndex = pages.findIndex((page) => page.id === viewedId);
  const viewed = pages[viewedIndex];
  return (
    <>
      <ul aria-label="Photos of the sheet" className="grid grid-cols-2 gap-3">
        {pages.map((page, index) => (
          <li key={page.id} className="relative border border-hairline">
            <button
              type="button"
              onClick={() => setViewedId(page.id)}
              aria-label={`View page ${index + 1}`}
              className="block w-full cursor-zoom-in bg-paper-deep"
            >
              <PageImage
                page={page}
                alt={`Page ${index + 1} of the sheet`}
                width={thumbnailWidth}
                height={thumbnailHeight}
                className="aspect-[3/4] h-auto w-full object-contain"
              />
            </button>
            <div className="absolute top-1 right-1 bg-paper/90">
              <IconButton
                label={`Remove page ${index + 1}`}
                onClick={() => onRemove(page.id)}
                disabled={isLocked}
              >
                <X size={18} aria-hidden={true} />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
      <Modal
        isOpen={viewed !== undefined}
        onClose={() => setViewedId(null)}
        title={`Page ${viewedIndex + 1}`}
        size="full"
      >
        {viewed ? (
          <PageImage
            page={viewed}
            alt={`Page ${viewedIndex + 1} of the sheet, full size`}
            width={viewerWidth}
            height={viewerHeight}
            className="h-auto w-full"
          />
        ) : null}
      </Modal>
    </>
  );
};
