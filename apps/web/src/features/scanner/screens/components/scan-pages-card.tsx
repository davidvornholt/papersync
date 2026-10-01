import { Button } from '@papersync/ui/button';
import { Card, CardContent } from '@papersync/ui/card';
import { Spinner } from '@/shared/components/motion-loading';
import type { UseScanReturn } from '../../hooks/use-scan-types';
import { DragDropZone } from './drag-drop-zone';
import { PagePickers } from './page-pickers';
import { ScanPageList } from './scan-page-list';

type ScanPagesCardProps = {
  readonly scan: UseScanReturn;
  readonly isDragging: boolean;
  readonly setIsDragging: (dragging: boolean) => void;
  readonly isLocked: boolean;
};

const analyzeLabel = (scan: UseScanReturn) => {
  if (scan.state.status === 'processing') {
    return 'Analyzing…';
  }
  const photos =
    scan.pages.length === 1 ? 'photo' : `${scan.pages.length} photos`;
  return scan.state.status === 'complete'
    ? `Analyze ${photos} again`
    : `Analyze ${photos}`;
};

export const ScanPagesCard = ({
  scan,
  isDragging,
  setIsDragging,
  isLocked,
}: ScanPagesCardProps): React.ReactElement => (
  <Card>
    <CardContent>
      {scan.pages.length === 0 ? (
        <DragDropZone
          onFilesSelect={scan.addPages}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
      ) : (
        <div className="space-y-4">
          <ScanPageList
            pages={scan.pages}
            onRemove={scan.removePage}
            isLocked={isLocked}
          />
          {scan.pages.length < scan.pageLimit ? (
            <PagePickers
              onFilesSelect={scan.addPages}
              cameraLabel="Take another photo"
              filesLabel="Add images"
              isCameraPrimary={false}
            />
          ) : (
            <p className="text-center text-graphite text-sm">
              {scan.pageLimit} photos is the most PaperSync reads at once.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 border-hairline border-t pt-4 sm:flex-row sm:gap-3">
            <Button variant="ghost" onClick={scan.clear} className="sm:flex-1">
              Start over
            </Button>
            <Button onClick={scan.analyze} className="sm:flex-[2]">
              {scan.state.status === 'processing' ? (
                <Spinner size="sm" className="mr-2" />
              ) : null}
              {analyzeLabel(scan)}
            </Button>
          </div>
        </div>
      )}
      {scan.isPreparing ? (
        <p role="status" className="mt-3 text-center text-graphite text-sm">
          Preparing photos…
        </p>
      ) : null}
    </CardContent>
  </Card>
);
