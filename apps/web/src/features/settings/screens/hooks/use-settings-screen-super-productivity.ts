import type { Settings } from '@/shared/hooks/use-settings-schema';
export const useSettingsScreenSuperProductivity = ({
  settings,
  updateVault,
}: {
  readonly settings: Settings;
  readonly updateVault: (updates: Partial<Settings['vault']>) => void;
}) => ({
  superProductivityTagIdsInput: (
    settings.vault.superProductivityTagIds ?? []
  ).join(', '),
  handleChangeSuperProductivityProjectId: (projectId: string) =>
    updateVault({ superProductivityProjectId: projectId }),
  handleChangeSuperProductivityTagIds: (input: string) =>
    updateVault({
      superProductivityTagIds: input
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }),
});
