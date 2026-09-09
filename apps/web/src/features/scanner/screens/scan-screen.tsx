'use client';

import { NetworkScannersPanel } from './components/network-scanners-panel';
import { ResultsPanel } from './components/results-panel';
import { UploadScanCard } from './components/upload-scan-card';
import { useScanScreen } from './hooks/use-scan-screen';
export const ScanScreen = (): React.ReactElement => {
  const controller = useScanScreen();
  const { scan } = controller;
  const isBusy =
    controller.isLoading ||
    scan.state.status === 'processing' ||
    scan.state.status === 'uploading' ||
    controller.isSyncing;
  return (
    <div className="shell page-shell">
      <p className="mono-tag">After school</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">
        Turn today’s page into a plan.
      </h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Scan your homework sheet, check it against the photo, then approve what
        you want to save.
      </p>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-label="Your paper" className="space-y-6">
          <h2 className="text-2xl">1. Scan the sheet</h2>
          <fieldset disabled={isBusy}>
            {scan.imagePreview ? (
              <label className="mb-5 block">
                Week printed on the sheet
                <input
                  type="week"
                  value={scan.weekId ?? ''}
                  onChange={(event) => scan.setWeekId(event.target.value)}
                  required={true}
                  className="mt-2 block w-full border border-hairline bg-paper p-3"
                />
                <span className="mt-2 block text-graphite text-sm">
                  {scan.hasDetectedWeek
                    ? 'Read from the sheet’s QR code. Check it before continuing.'
                    : 'Choose the week printed on this sheet before reading the handwriting.'}
                </span>
              </label>
            ) : null}
            <UploadScanCard
              preview={scan.imagePreview}
              isDragging={controller.isDragging}
              setIsDragging={controller.setIsDragging}
              isProcessing={isBusy}
              canProcess={scan.weekId !== null}
              onFileSelect={controller.handleFileSelect}
              onClear={controller.handleClear}
              onProcess={controller.handleProcess}
            />
          </fieldset>
          <details className="border-hairline border-t pt-4">
            <summary className="cursor-pointer">Use a network scanner</summary>
            <p className="my-3 text-graphite text-sm">
              Available when PaperSync is running on the scanner’s network. For
              this hosted app, upload a photo or a scan saved on your device.
            </p>
            <NetworkScannersPanel
              onScanComplete={controller.handleScanFromDevice}
              isDisabled={isBusy}
            />
          </details>
        </section>
        <section aria-label="Review homework">
          <h2 className="mb-6 text-2xl">2. Check and save</h2>
          <fieldset disabled={isBusy}>
            <ResultsPanel
              state={controller.panelState}
              entries={controller.editedEntries}
              confidence={
                scan.state.status === 'complete' ? scan.state.confidence : 0
              }
              modelUsed={
                scan.state.status === 'complete'
                  ? scan.state.modelUsed
                  : undefined
              }
              errorMessage={
                scan.state.status === 'error' ? scan.state.error : undefined
              }
              onUpdateEntry={controller.handleUpdateEntry}
              onDeleteEntry={controller.handleDeleteEntry}
              onSync={controller.handleSync}
              isSyncing={controller.isSyncing}
            />
          </fieldset>
        </section>
      </div>
    </div>
  );
};
