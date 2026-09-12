import { Effect } from 'effect';
import type { PluginApi } from './api';
import { ImportError } from './error';

export type ImportDestination = {
  readonly projectId: string;
  readonly tagIds: ReadonlyArray<string>;
};
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const chooseImportDestination = (api: PluginApi, count: number) =>
  Effect.tryPromise({
    try: async (): Promise<ImportDestination | null> => {
      const [projects, tags] = await Promise.all([
        api.getAllProjects(),
        api.getAllTags(),
      ]);
      const prefix = `papersync-import-${crypto.randomUUID()}`;
      const projectOptions = projects
        .filter((project) => !project.isArchived)
        .map(
          (project) =>
            `<option value="${escapeHtml(project.id)}">${escapeHtml(project.title)}</option>`,
        )
        .join('');
      const tagOptions = tags
        .map(
          (tag) =>
            `<label style="display:block;padding:8px"><input type="checkbox" name="${prefix}-tag" value="${escapeHtml(tag.id)}" /> ${escapeHtml(tag.title)}</label>`,
        )
        .join('');
      let destination: ImportDestination | null = null;
      await api.openDialog({
        title: `Import ${count} homework tasks`,
        htmlContent: `<p>Choose where new tasks go. Previously imported tasks keep their project and tags.</p><label for="${prefix}-project">Project</label><select id="${prefix}-project" style="display:block;width:100%;padding:12px">${projectOptions}</select><fieldset style="margin-top:16px"><legend>Tags (optional)</legend>${tagOptions || '<p>No tags yet. Create tags in Super Productivity to use them here.</p>'}</fieldset>`,
        buttons: [
          { label: 'Cancel' },
          {
            label: 'Import homework',
            onClick: () => {
              const select = document.querySelector(`#${prefix}-project`);
              if (!(select instanceof HTMLSelectElement && select.value)) {
                api.showSnack({
                  msg: 'Choose a project before importing. If none are listed, create one in Super Productivity and try again.',
                  type: 'ERROR',
                });
                return;
              }
              const selectedTags = Array.from(
                document.querySelectorAll<HTMLInputElement>(
                  `input[name="${prefix}-tag"]:checked`,
                ),
              ).map((input) => input.value);
              destination = {
                projectId: select.value,
                tagIds: selectedTags,
              };
            },
          },
        ],
      });
      return destination;
    },
    catch: (cause) =>
      new ImportError({
        message: 'Could not load projects and tags. Try importing again.',
        cause,
      }),
  });
