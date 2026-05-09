import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const packageRoot = import.meta.dir;
const exportedConfigFiles = ['base.json', 'nextjs.json'] as const;

describe('@papersync/typescript-config', () => {
  it('publishes every shared TypeScript config file', () => {
    expect(
      exportedConfigFiles.every((file) => existsSync(join(packageRoot, file))),
    ).toBe(true);
  });
});
