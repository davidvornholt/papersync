export type Tag = {
  readonly id: string;
  readonly title: string;
};

export const normalizeSubject = (subject: string) =>
  subject.trim().toLowerCase();

export const getSubjectChoices = (
  subjects: ReadonlyArray<string>,
  tags: ReadonlyArray<Tag>,
) => {
  const unique = new Map(
    subjects.map((subject) => [normalizeSubject(subject), subject.trim()]),
  );
  return [...unique].map(([key, label]) => {
    const matches = tags.flatMap((tag, index) =>
      key && normalizeSubject(tag.title) === key ? [index] : [],
    );
    return {
      key,
      label: label || 'No subject',
      selected: matches.length === 1 ? String(matches[0]) : '',
    };
  });
};
