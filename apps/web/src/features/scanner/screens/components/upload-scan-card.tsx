import { Card, CardContent } from '@papersync/ui/card';
import { DragDropZone } from './drag-drop-zone';
import { ImagePreview } from './image-preview';

type UploadScanCardProps = {
  readonly preview: string | null;
  readonly isDragging: boolean;
  readonly setIsDragging: (dragging: boolean) => void;
  readonly isProcessing: boolean;
  readonly onFileSelect: (file: File) => void;
  readonly onClear: () => void;
  readonly onProcess: () => void;
};

export const UploadScanCard = ({
  preview,
  isDragging,
  setIsDragging,
  isProcessing,
  onFileSelect,
  onClear,
  onProcess,
}: UploadScanCardProps): React.ReactElement => (
  <Card>
    <CardContent>
      {preview ? (
        <ImagePreview
          preview={preview}
          onClear={onClear}
          onProcess={onProcess}
          isProcessing={isProcessing}
        />
      ) : (
        <DragDropZone
          onFileSelect={onFileSelect}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
      )}
    </CardContent>
  </Card>
);
