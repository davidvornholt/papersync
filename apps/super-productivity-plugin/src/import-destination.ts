import { Effect } from 'effect';
import type { PluginApi } from './api';
import { ImportError } from './error';
import { getSubjectChoices, type Tag } from './subject-tags';

export type ImportDestination = {
  readonly projectId: string;
  readonly subjectTagIds: ReadonlyMap<string, ReadonlyArray<string>>;
};
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const selectValue = (selector: string) => {
  const element = document.querySelector(selector);
  return element instanceof HTMLSelectElement ? element.value : null;
};

const selectedTagIds = (value: string | null, tags: ReadonlyArray<Tag>) => {
  if (value === 'none') {
    return [];
  }
  const tag = tags.find((_tag, index) => value === String(index));
  return tag ? [tag.id] : null;
};

export const chooseImportDestination = (
  api: PluginApi,
  subjects: ReadonlyArray<string>,
) =>
  Effect.tryPromise({
    try: async (): Promise<ImportDestination | null> => {
      const [projects, tags] = await Promise.all([
        api.getAllProjects(),
        api.getAllTags(),
      ]);
      const prefix = `papersync-import-${crypto.randomUUID()}`;
      const activeProjects = projects.filter((project) => !project.isArchived);
      const projectOptions = activeProjects
        .map(
          (project) =>
            `<option value="${escapeHtml(project.id)}">${escapeHtml(project.title)}</option>`,
        )
        .join('');
      const choices = getSubjectChoices(subjects, tags);
      const subjectOptions = choices
        .map((subject, index) => {
          const options = tags
            .map(
              (tag, tagIndex) =>
                `<option value="${tagIndex}"${subject.selected === String(tagIndex) ? ' selected' : ''}>${escapeHtml(tag.title)}</option>`,
            )
            .join('');
          return `<label for="${prefix}-subject-${index}" style="display:block;margin-top:16px">${escapeHtml(subject.label)}</label><select id="${prefix}-subject-${index}" style="display:block;width:100%;padding:12px"><option value=""${subject.selected === '' ? ' selected' : ''} disabled>Choose a tag</option><option value="none">No tag</option>${options}</select>`;
        })
        .join('');
      let destination: ImportDestination | null = null;
      await api.openDialog({
        title: `Import ${subjects.length} homework tasks`,
        htmlContent: `<p>Choose where new tasks go. Previously imported tasks keep their project and tags.</p><label for="${prefix}-project">Project</label><select id="${prefix}-project" style="display:block;width:100%;padding:12px">${projectOptions}</select><fieldset style="margin-top:16px"><legend>Subject tags</legend><p>Matching names are selected automatically. Choose a tag or “No tag” for each subject.</p>${subjectOptions}</fieldset>`,
        buttons: [
          { label: 'Cancel' },
          {
            label: 'Import homework',
            onClick: () => {
              const projectId = selectValue(`#${prefix}-project`);
              if (
                !(
                  projectId &&
                  activeProjects.some((project) => project.id === projectId)
                )
              ) {
                api.showSnack({
                  msg: 'Choose a project before importing. If none are listed, create one in Super Productivity and try again.',
                  type: 'ERROR',
                });
                return;
              }
              const subjectTagIds = new Map<string, ReadonlyArray<string>>();
              for (const [index, subject] of choices.entries()) {
                const value = selectValue(`#${prefix}-subject-${index}`);
                const tagIds = selectedTagIds(value, tags);
                if (!tagIds) {
                  api.showSnack({
                    msg: `Choose a tag or “No tag” for ${subject.label}, then import again.`,
                    type: 'ERROR',
                  });
                  return;
                }
                subjectTagIds.set(subject.key, tagIds);
              }
              destination = {
                projectId,
                subjectTagIds,
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
