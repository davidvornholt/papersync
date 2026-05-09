# AGENTS.md

This file is the root operating contract for agents in this repository. Keep root instructions for non-negotiable constraints; put specialized workflows in `.agents/skills/*/SKILL.md`.

## Research First

- Understand the request, current code, and relevant constraints before changing files.
- Check whether the request conflicts with repo architecture or standards.
- Ask before broad product, UX, architectural, naming, workflow, scope, or business-logic decisions.
- Do not invent business rules, defaults, thresholds, permissions, states, or domain behavior.
- For clearly scoped implementation work, proceed once the scope and success criteria are clear.
- Prefer cleaner architecture when justified. Do not preserve messy code only to avoid churn.

## Skill Routing

Before generating code, inspect the `description` frontmatter for every local skill at `.agents/skills/<name>/SKILL.md`. Follow every matching skill, not just the first match.

## Package Management

- Use Bun only.
- Add dependencies with `bun add`; do not manually edit dependency versions into `package.json`.
- Bun loads `.env` automatically. Do not add `dotenv`.
- Never use or add `@effect/schema`; use `Schema` from `effect`.
- A workspace must declare every package it imports directly. Do not rely on hoisted, transitive, or sibling-workspace dependencies.
- Workspaces that rely on Bun runtime or `bun:test` types must declare `@types/bun`. Do not add custom Bun ambient declaration shims when `@types/bun` is sufficient.

## Monorepo Structure

- App-local code lives in `apps/*`; shared/foundational code lives in `packages/*`.
- Put code where ownership is clearest. Keep single-app code in the owning app unless there is an intentional shared contract.
- Package names must use the real project alias: `@<actual-project-name>/<package-name>`.
- Internal packages use version `"0.0.0"` and internal dependencies use `workspace:*`.
- Use package aliases for workspace imports. Never import another package through relative paths.
- Do not use placeholder aliases such as `@repo` or `@my-repository` in real repo files.
- Extend shared TypeScript config from `packages/typescript-config`; do not create standalone `tsconfig.json` files.
- Packages must define public APIs with `exports`.
- Do not add `index.ts` barrel files in apps, features, shared folders, or packages.

## Architecture Boundaries

- Entrypoints route, parse initial inputs, wire Effect layers, and bridge to runtime/UI.
- Business logic belongs in app-local `src/features/*` or intentional shared packages.
- App-local shared infrastructure belongs in `src/shared/*`.
- Dependency flow is one-way: `entrypoint -> features -> shared -> packages`.
- Features may depend on `src/shared/*` and packages, but not sibling features.
- `src/shared/*` must not import from `src/features/*`; `packages/*` must not import from `apps/*`.
- Prefer colocated tests next to the files they protect.
- Code files should ideally not exceed 200 lines; split larger files into focused modules instead of combining mixed services, schemas, errors, UI concerns, or unrelated responsibilities.

## Default Shapes

- App code defaults to `src/app`, `src/features/<domain>/{schemas,errors,services,ui}`, and `src/shared/<module>`.
- Package code defaults to `src/<capability>.ts(x)` plus colocated tests, with deeper folders only for complex capabilities.

## Workspace Scripts

- Workspace packages must expose `check-types`, `lint`, `lint:fix`, and `test` with `tsc --noEmit`, `biome check --error-on-warnings`, `biome check --write --error-on-warnings`, and `bun test`.
- Root scripts must include `check: turbo run lint check-types test` and `check:fix: turbo run lint:fix check-types test`.
- Operational scripts belong to the owning workspace. Put the real command in that workspace's `package.json`.
- Root convenience scripts must delegate through Turbo with an explicit package filter, such as `turbo run dev --filter @my-repository/admin`.
- Keep root `package.json` scripts minimal: cross-workspace quality gates plus narrowly useful filtered convenience aliases only.

## Environment Variables

Every workspace under `apps/*` or `packages/*` that reads environment variables must maintain a workspace-local `README.md` and `.env.example`. Document every consumed variable in both places, including runtime, build, test, local tooling, OS-provided, and development-only variables. Explain requiredness, behavior, defaults/fallbacks, and provide safe runnable examples.

## TypeScript Standards

- No `any`; use `unknown` plus Schema decoding where validation is needed.
- Use named exports and prefer inline exports, such as `export const value = ...`.
- Default exports are allowed only where framework conventions require them, such as Next.js `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `route.ts`.
- Use `import type` for type-only imports.
- Use `kebab-case` files/folders, `camelCase` variables/functions, and `PascalCase` types/classes.
- Prefer `const`, `readonly`, `ReadonlyArray<T>`, and arrow functions assigned to `const`. `function*` is allowed for Effect generators.

## Effect Standards

- Use Effect for application logic, async work, recoverable errors, and validation.
- Do not `throw` for expected failures; return typed Effect errors.
- Recoverable Effect errors must be specific `Data.TaggedError` classes with stable `_tag` values and actionable `message` fields.
- Do not use plain `Error`, strings, `unknown`, or untagged objects in expected Effect error channels.
- Internal logic should not use `async/await`; use `Effect.gen`.
- In `Effect.gen`, always use `yield*`, not plain `yield`.
- Use `Effect.log`, `Effect.logInfo`, or `Effect.logError`; do not add `console.log`.
- Prefer Effect combinators for Effectful branching when they make control flow clearer.
- Use `Schema` from `effect`; do not use `zod`, `joi`, or `yup`.

## Next.js Notes

- Server Components, Route Handlers, and Server Actions may be `async`; bridge Effect programs with `await Effect.runPromise(program)`.
- Use Next.js Cache Components patterns. Do not add route segment config (`runtime`, `dynamic`, `revalidate`, etc.). Use `'use cache'` plus `cacheLife`/`cacheTag` for cacheable async data, and Suspense/request-time APIs for genuinely dynamic content.
- Read relevant docs in `node_modules/next/dist/docs/` before changing behavior that may depend on current framework semantics.

## Frontend Standards

- Use matching frontend skills before UI work.
- Meet WCAG 2.2 AA with semantic HTML, correct heading hierarchy, keyboard navigation, visible focus states, and non-color-only communication.
- Use framework metadata/document primitives for SEO and prefer server-rendered/indexable content when SEO matters.
- Use sentence case where sensible for UI text such as button labels and command-style actions, while preserving proper nouns, acronyms, and domain terms.
- Use components for repeated visual patterns; use local Tailwind utilities for one-offs when clearer than extraction.
- Define color tokens and authored CSS colors with `oklch(...)`.

## State Management

- Keep state as local as practical. Use React local state for component-owned UI state.
- Use Zustand by default for shared client-side UI/app state in React and Next.js.
- Do not use Zustand as a server-data cache. If client-side remote data needs caching, refetching, invalidation, pagination, optimistic updates, or mutation coordination, propose TanStack Query before building custom store logic.

## Testing

- Add or update tests for meaningful behavior changes.
- New Effect, Schema, or utility logic needs focused unit coverage for success and failure behavior.
- UI/page wiring should have a small, meaningful test surface when logic, state, error, or empty-state behavior changes.
- Prefer tests that protect behavior, state transitions, data contracts, accessibility-relevant states, and regression-prone cases.
- Do not add tests that only pin trivial copy, labels, static literals, or states the type system already makes unrepresentable.

## Definition of Done

Use this as a feedback loop, not a ritual.

1. Verify tests are proportional to the risk:
   - new or changed logic has meaningful success and failure coverage
   - UI/page changes cover at least the important success plus empty/error states when behavior changed
   - no low-signal tests were added just to increase test count
2. Search for stale references to changed concepts, names, paths, env vars, commands, public APIs, error types, or architectural patterns. Update docs, examples, and `.env.example` files when needed.
3. Run `bun run check:fix` from the repo root for code changes.
4. If `bun run check:fix` fails, read the full error, identify the root cause, fix it, and repeat the loop.

For documentation-only changes, run a narrower verification when the full check would not add useful signal. State what was run and why.

## Debugging

- Read the full stack trace or error output before changing code.
- Reproduce the failure with a focused test or minimal command before fixing when practical.
- Identify the specific file, line, schema, Effect, or boundary involved.
- Do not guess or try random variations.
- If a fix attempt fails, re-read the error and architecture before trying again.
- If two fix attempts fail, stop and reconsider the approach or ask for human input.

## Naming

- Network operations: use `fetch`, not `retrieve` or `download`.
- Getters: use `get`, not `read` or `load`.
- Setters: use `set`, not `write` or `update`.
- Booleans: prefix with `is`, `has`, or `can`.

## Comments

- Prefer self-documenting code.
- Add comments only for non-obvious intent, complex regex, or complex math.
- Do not leave commented-out code or redundant narration.
