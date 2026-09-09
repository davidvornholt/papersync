import { expect, it } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { homework, integration } from './schema';

it('homework identities are unique and acknowledgement starts empty', () => {
  const { columns } = getTableConfig(homework);
  expect(columns.find((column) => column.name === 'id')?.primary).toBe(true);
  expect(
    columns.find((column) => column.name === 'imported_revision')?.notNull,
  ).toBe(false);
  expect(columns.find((column) => column.name === 'revision')?.notNull).toBe(
    true,
  );
  expect(
    getTableConfig(integration).columns.find(
      (column) => column.name === 'token_hash',
    )?.notNull,
  ).toBe(true);
});
