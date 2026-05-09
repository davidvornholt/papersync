'use client';

import { EditorialHeader } from '@papersync/ui/editorial-header';
import { motion } from 'motion/react';
import { PageTransition } from '@/shared/components/motion';
import { NetworkScannersPanel } from './components/network-scanners-panel';
import { ResultsPanel } from './components/results-panel';
import { UploadScanCard } from './components/upload-scan-card';
import { useScanScreen } from './hooks/use-scan-screen';

const easeOut = [0.2, 0.6, 0.2, 1] as const;

export const ScanScreen = (): React.ReactElement => {
  const controller = useScanScreen();

  return (
    <PageTransition>
      <div className="shell page-shell">
        <EditorialHeader
          index="Section ii"
          section="Scan & sync"
          title="From ink"
          italicSuffix="to second brain."
          description="Drop a scan, photograph a page, or pull from a network scanner on your local network. PaperSync hands the image to the vision model you chose, then waits for your approval before writing anything to your vault."
          aside={
            <dl className="space-y-5">
              <div>
                <dt className="mono-tag">Provider</dt>
                <dd className="mt-1 serif text-[20px] text-ink">
                  Your chosen vision model
                </dd>
              </div>
              <div>
                <dt className="mono-tag">Trust model</dt>
                <dd className="mt-1 serif-italic text-[16px] text-ink-soft">
                  Nothing syncs without you.
                </dd>
              </div>
            </dl>
          }
        />

        <div className="mt-8 sm:mt-10 md:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-y-10 sm:gap-y-12 lg:gap-x-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: easeOut }}
            className="lg:col-span-5 space-y-10 sm:space-y-12"
          >
            <div>
              <p className="section-number">01 — Source</p>
              <h2 className="mt-3 text-[24px] sm:text-[28px]">
                A page to read.
              </h2>
              <div className="mt-5 sm:mt-6">
                <UploadScanCard
                  preview={controller.scan.imagePreview}
                  isDragging={controller.isDragging}
                  setIsDragging={controller.setIsDragging}
                  isProcessing={controller.scan.state.status === 'processing'}
                  onFileSelect={(file) =>
                    void controller.handleFileSelect(file)
                  }
                  onClear={controller.handleClear}
                  onProcess={() => void controller.handleProcess()}
                />
              </div>
            </div>

            <div>
              <p className="section-number">02 — Network</p>
              <h2 className="mt-3 text-[24px] sm:text-[28px]">
                <span className="serif-italic">or</span> a scanner across the
                room.
              </h2>
              <div className="mt-5 sm:mt-6">
                <NetworkScannersPanel
                  onScanComplete={(imageData) =>
                    void controller.handleScanFromDevice(imageData)
                  }
                  isDisabled={controller.scan.state.status === 'processing'}
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: easeOut }}
            className="lg:col-span-7 lg:border-l lg:border-hairline lg:pl-12"
          >
            <p className="section-number">03 — Reading</p>
            <h2 className="mt-3 text-[24px] sm:text-[28px]">
              What the model <span className="serif-italic ink">found</span>.
            </h2>
            <div className="mt-5 sm:mt-6">
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
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};
