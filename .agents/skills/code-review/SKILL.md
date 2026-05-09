---
name: code-review
description: Strict local code review skill. Use by default for any review request, including "review", "code review", "strict review", diff review, or pre-merge review in the local workspace. Checks severe defects, AGENTS.md violations, architecture, naming, style drift, tests, and nits.
---

# Strict Code Review

Use this skill for local review requests. Review only; do not edit files unless the user explicitly asks for fixes after the review.

## Review Posture

- Act as a strict reviewer looking for problems, regressions, and repo-contract violations.
- Findings must be grounded in inspected code, diffs, tests, command output, `AGENTS.md`, matching skills, or documented framework/package behavior.
- Do not hallucinate requirements, business rules, files, APIs, runtime behavior, tests, command results, or user intent.
- If evidence is incomplete, either inspect more local context or describe the risk precisely without pretending it is confirmed.

## What To Inspect

Before reviewing, gather enough local context to support findings:

- Read the relevant `AGENTS.md` instructions.
- Inspect the `description` frontmatter for local skills under `.agents/skills/*/SKILL.md` and follow any that match the reviewed code.
- Inspect the changed files or requested files, plus nearby callers, tests, package manifests, scripts, and docs as needed.
- Use `git diff`, `git status`, `rg`, and focused file reads to understand scope.
- Prefer `bun run check` from the repo root. If unavailable, inspect `package.json` and run the closest relevant lint/typecheck/test command.

## Finding Categories

Group findings by these sections, ordered by severity within each section:

1. **Blocking Findings**
   - Any `AGENTS.md` violation, even small ones.
   - Correctness bugs, runtime crashes, broken builds, security issues, data loss, accessibility failures, invalid types, broken public APIs, missing required env documentation, missing required tests, or architecture boundary violations.
   - Major maintainability issues that should block acceptance, such as misplaced ownership, dependency direction violations, or bad abstractions that make the change unsafe to build on.

2. **Non-Blocking Findings**
   - Real issues that should be fixed but do not block acceptance.
   - Examples: confusing names, unclear errors, weak but present tests, avoidable duplication, awkward structure, minor performance concerns, local style drift, or maintainability risks.

3. **Nits**
   - Tiny polish issues and small consistency improvements.
   - Include nits when they exist, but keep them after substantive findings.

## Output Contract

- Use file and line references for every finding whenever possible.
- Explain the impact and the concrete problem, not just a preference.
- Keep findings concise and actionable.
- If no problems are found, say that no review findings were found, summarize what was inspected, and mention checks actually run.
- If findings exist, end by asking whether you should fix all findings and issues.
- Mention tests or checks run only if they were actually run. Mention meaningful verification gaps when they affect confidence.
