'use client';

import { motion } from 'motion/react';
import { PageTransition } from '@/shared/components';
import { NetworkScannersPanel } from './components/network-scanners-panel';
import { ResultsPanel } from './components/results-panel';
import { UploadScanCard } from './components/upload-scan-card';
import { useScanScreen } from './hooks/use-scan-screen';

export const ScanScreen = (): React.ReactElement => {
  const controller = useScanScreen();

  return (
    <PageTransition>
      <div className="page-container">
        <header className="page-header">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Scan & Sync
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted mt-1"
          >
            Import handwritten notes with AI-powered extraction
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <UploadScanCard
              preview={controller.scan.imagePreview}
              isDragging={controller.isDragging}
              setIsDragging={controller.setIsDragging}
              isProcessing={controller.scan.state.status === 'processing'}
              onFileSelect={(file) => void controller.handleFileSelect(file)}
              onClear={controller.handleClear}
              onProcess={() => void controller.handleProcess()}
            />

            <NetworkScannersPanel
              onScanComplete={(imageData) =>
                void controller.handleScanFromDevice(imageData)
              }
              isDisabled={controller.scan.state.status === 'processing'}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="h-full"
          >
            <ResultsPanel
              state={controller.panelState}
              entries={controller.editedEntries}
              confidence={
                controller.scan.state.status === 'complete'
                  ? controller.scan.state.confidence
                  : 0
              }
              modelUsed={
                controller.scan.state.status === 'complete'
                  ? controller.scan.state.modelUsed
                  : undefined
              }
              errorMessage={
                controller.scan.state.status === 'error'
                  ? controller.scan.state.error
                  : undefined
              }
              onUpdateEntry={controller.handleUpdateEntry}
              onDeleteEntry={controller.handleDeleteEntry}
              onSync={() => void controller.handleSync()}
              isSyncing={controller.isSyncing}
            />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};
