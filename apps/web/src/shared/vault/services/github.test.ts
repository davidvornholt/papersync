import { afterAll, afterEach, expect, it, spyOn } from 'bun:test';
import { Effect } from 'effect';
import { githubService } from './github';

const location = {
  token: 'test-token',
  owner: 'student',
  repo: 'notes',
  path: 'homework/week.md',
};
const fetchSpy = spyOn(globalThis, 'fetch');
afterEach(() => fetchSpy.mockReset());
afterAll(() => fetchSpy.mockRestore());
it('decodes the file and retains its revision for conflict protection', async () => {
  fetchSpy.mockResolvedValue(
    Response.json({ content: btoa('existing homework'), sha: 'revision-1' }),
  );
  const file = await Effect.runPromise(githubService.getFile(location));
  expect(file).toEqual({ content: 'existing homework', sha: 'revision-1' });
  fetchSpy.mockResolvedValue(Response.json({}));
  await Effect.runPromise(
    githubService.setFile({
      ...location,
      content: 'corrected homework',
      message: 'Correct date',
      sha: file?.sha,
    }),
  );
  expect(fetchSpy.mock.lastCall?.[1]?.body).toContain('"sha":"revision-1"');
});
const forbiddenStatus = 403;
const serverErrorStatus = 500;
const failureStatuses = [forbiddenStatus, serverErrorStatus];
it.each(failureStatuses)(
  'fails a read on HTTP %s instead of treating the file as absent',
  async (status) => {
    fetchSpy.mockResolvedValue(new Response(null, { status }));
    const result = await Effect.runPromise(
      githubService.getFile(location).pipe(Effect.either),
    );
    expect(result._tag).toBe('Left');
  },
);
it('distinguishes an absent file from an invalid response', async () => {
  const missingStatus = 404;
  fetchSpy.mockResolvedValue(new Response(null, { status: missingStatus }));
  expect(await Effect.runPromise(githubService.getFile(location))).toBeNull();
  fetchSpy.mockResolvedValue(
    Response.json({ sha: 'revision-without-content' }),
  );
  const result = await Effect.runPromise(
    githubService.getFile(location).pipe(Effect.either),
  );
  expect(result._tag).toBe('Left');
});
