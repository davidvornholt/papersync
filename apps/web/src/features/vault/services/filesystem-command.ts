export const runCommand = async (
  cmd: string[],
): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}> => {
  const process = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
};

export const isDirectoryPath = async (
  directoryPath: string,
): Promise<boolean> => {
  const result = await runCommand(['test', '-d', directoryPath]);
  return result.exitCode === 0;
};
