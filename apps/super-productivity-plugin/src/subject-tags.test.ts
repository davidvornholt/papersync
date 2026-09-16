import { expect, it } from 'bun:test';
import { getSubjectChoices } from './subject-tags';

it('matches unique names ignoring case and surrounding spaces', () => {
  expect(
    getSubjectChoices(
      ['Math', ' MATH ', 'English'],
      [
        { id: 'english', title: ' english ' },
        { id: 'math', title: 'MATH' },
      ],
    ),
  ).toEqual([
    { key: 'math', label: 'MATH', selected: '1' },
    { key: 'english', label: 'English', selected: '0' },
  ]);
});

it('requires a choice for missing, ambiguous, and empty subject names', () => {
  expect(
    getSubjectChoices(
      ['Math', 'Science', ''],
      [
        { id: 'math-1', title: 'Math' },
        { id: 'math-2', title: ' math ' },
        { id: 'empty', title: '' },
      ],
    ).map((choice) => choice.selected),
  ).toEqual(['', '', '']);
});
