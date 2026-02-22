const toShellArgument = (value: string): string =>
  `'${value.replaceAll("'", "'\\''")}'`;

export const runCommand = (
  cmd: string[],
): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}> =>
  Bun.$`${{ raw: cmd.map(toShellArgument).join(' ') }}`
    .quiet()
    .nothrow()
    .then((result) => ({
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    }));

export const isDirectoryPath = (directoryPath: string): Promise<boolean> =>
  runCommand(['test', '-d', directoryPath]).then(
    (result) => result.exitCode === 0,
  );
