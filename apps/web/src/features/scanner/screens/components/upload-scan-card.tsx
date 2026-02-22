import { Card, CardContent, CardHeader } from '@/shared/components';
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
    <CardHeader>
      <h2 className="text-lg font-semibold font-display">Upload Scan</h2>
    </CardHeader>
    <CardContent>
      {!preview ? (
        <DragDropZone
          onFileSelect={onFileSelect}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
      ) : (
        <ImagePreview
          preview={preview}
          onClear={onClear}
          onProcess={onProcess}
          isProcessing={isProcessing}
        />
      )}
    </CardContent>
  </Card>
);
