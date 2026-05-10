'use client';

import { Button } from '@papersync/ui/button';
import { Spinner } from '@/shared/components/motion';
import { InputField } from './settings-controls';

export type SuperProductivityConnectionStatus =
  | 'idle'
  | 'testing'
  | 'ok'
  | 'failed';

type SettingsVaultSuperProductivityPanelProps = {
  readonly endpoint: string;
  readonly projectId: string;
  readonly tagIdsInput: string;
  readonly status: SuperProductivityConnectionStatus;
  readonly errorMessage: string | null;
  readonly onChangeEndpoint: (endpoint: string) => void;
  readonly onChangeProjectId: (projectId: string) => void;
  readonly onChangeTagIds: (tagIds: string) => void;
  readonly onTestConnection: () => void;
};

const StatusLine = ({
  status,
  endpoint,
  errorMessage,
}: {
  readonly status: SuperProductivityConnectionStatus;
  readonly endpoint: string;
  readonly errorMessage: string | null;
}): React.ReactElement => {
  if (status === 'testing') {
    return (
      <span className="flex items-center gap-2 text-[13px] text-graphite">
        <Spinner size="sm" />
        <span>Reaching the local app…</span>
      </span>
    );
  }

  if (status === 'ok') {
    return (
      <span className="flex items-baseline gap-2 text-[13px]">
        <span aria-hidden className="mono text-[11px] text-positive">
          ●
        </span>
        <span className="text-ink">
          <span className="serif-italic">Reachable</span>
          <span className="text-graphite">{` at `}</span>
          <span className="mono text-[12px] text-graphite">
            {endpoint || 'http://127.0.0.1:3876'}
          </span>
        </span>
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className="flex flex-col gap-0.5 text-[13px]">
        <span className="flex items-baseline gap-2">
          <span aria-hidden className="mono text-[11px] text-accent">
            ●
          </span>
          <span className="serif-italic text-accent">Unreachable</span>
        </span>
        {errorMessage && (
          <span className="mono text-[11px] text-graphite leading-relaxed pl-4">
            {errorMessage}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="text-[13px] text-graphite">
      Test the connection before saving.
    </span>
  );
};

export const SettingsVaultSuperProductivityPanel = ({
  endpoint,
  projectId,
  tagIdsInput,
  status,
  errorMessage,
  onChangeEndpoint,
  onChangeProjectId,
  onChangeTagIds,
  onTestConnection,
}: SettingsVaultSuperProductivityPanelProps): React.ReactElement => (
  <div className="space-y-5">
    <p className="text-[13px] text-graphite leading-relaxed measure">
      Super Productivity is a{' '}
      <span className="serif-italic text-ink">local-first task app</span>. Open
      the desktop app and enable the REST API under{' '}
      <span className="mono text-[12px] text-ink">
        Settings → General → Misc settings
      </span>
      , then point PaperSync at it. Your tasks never leave your machine.
    </p>

    <InputField
      id="sp-endpoint"
      label="Endpoint"
      value={endpoint}
      onChange={onChangeEndpoint}
      placeholder="http://127.0.0.1:3876"
    />

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <InputField
        id="sp-project-id"
        label="Project id (optional)"
        value={projectId}
        onChange={onChangeProjectId}
        placeholder="proj-…"
      />
      <InputField
        id="sp-tag-ids"
        label="Tag ids (optional)"
        value={tagIdsInput}
        onChange={onChangeTagIds}
        placeholder="tag-a, tag-b"
      />
    </div>

    <p className="mono-tag pt-1">
      Find these in Super Productivity → Project / Tag settings. Comma-separate
      multiple tags.
    </p>

    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <Button
        variant="secondary"
        size="sm"
        onClick={onTestConnection}
        disabled={status === 'testing'}
      >
        {status === 'testing' ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Testing…
          </>
        ) : status === 'ok' ? (
          'Test again'
        ) : (
          'Test connection'
        )}
      </Button>
      <StatusLine
        status={status}
        endpoint={endpoint}
        errorMessage={errorMessage}
      />
    </div>
  </div>
);
