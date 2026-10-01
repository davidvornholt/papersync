'use client';

import { Button } from '@papersync/ui/button';
import { useRef } from 'react';

const acceptedImages = 'image/jpeg, image/png, image/webp';

type PagePickersProps = {
  readonly onFilesSelect: (files: ReadonlyArray<File>) => void;
  readonly cameraLabel: string;
  readonly filesLabel: string;
  readonly isCameraPrimary: boolean;
};

export const PagePickers = ({
  onFilesSelect,
  cameraLabel,
  filesLabel,
  isCameraPrimary,
}: PagePickersProps): React.ReactElement => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) {
      onFilesSelect(files);
    }
  };
  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept={acceptedImages}
        capture="environment"
        onChange={handleChange}
        className="hidden"
        aria-label="Take photo with camera"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedImages}
        multiple={true}
        onChange={handleChange}
        className="hidden"
        aria-label="Select images from device"
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          className="sm:min-w-[10rem]"
        >
          {filesLabel}
        </Button>
        <Button
          variant={isCameraPrimary ? 'primary' : 'secondary'}
          onClick={() => cameraInputRef.current?.click()}
          className="sm:min-w-[10rem]"
        >
          {cameraLabel}
        </Button>
      </div>
    </>
  );
};
