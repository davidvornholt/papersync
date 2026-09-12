'use client';

import { useState } from 'react';
import type { UseScanReturn } from '../hooks/use-scan-types';
import { NetworkScannersPanel } from './components/network-scanners-panel';
import { ResultsPanel } from './components/results-panel';
import { UploadScanCard } from './components/upload-scan-card';
import { useScanScreen } from './hooks/use-scan-screen';

const getWeekHelp = (scan: UseScanReturn) => {
  if (scan.state.status === 'complete' && !scan.weekId) {
    return 'The printed week could not be read. Enter it and analyze again to resolve dates before saving.';
  }
  if (scan.hasDetectedWeek) {
    return 'Read from the QR code. You can correct it here.';
  }
  return 'The model reads the printed week if the QR code is unreadable. You can override it here.';
};

const WeekEditor = ({ scan }: { readonly scan: UseScanReturn }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <details
      className="mb-5"
      open={isOpen || (scan.state.status === 'complete' && !scan.weekId)}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer">
        {scan.weekId
          ? `Sheet week: ${scan.weekId}`
          : 'Week detected automatically when analyzing'}
      </summary>
      <label className="mt-3 block">
        Week printed on the sheet
        <input
          type="week"
          value={scan.weekId ?? ''}
          onChange={(event) => {
            setIsOpen(true);
            scan.setWeekId(event.target.value);
          }}
          className="mt-2 block w-full border border-hairline bg-paper p-3"
        />
      </label>
      <p className="mt-2 text-graphite text-sm">{getWeekHelp(scan)}</p>
    </details>
  );
};

export const ScanScreen = (): React.ReactElement => {
  const controller = useScanScreen();
  const { scan, isBusy } = controller;
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
            {scan.imagePreview ? <WeekEditor scan={scan} /> : null}
            <UploadScanCard
              preview={scan.imagePreview}
              isDragging={controller.isDragging}
              setIsDragging={controller.setIsDragging}
              isProcessing={isBusy}
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
              canSave={scan.weekId !== null}
            />
          </fieldset>
        </section>
      </div>
    </div>
  );
};
