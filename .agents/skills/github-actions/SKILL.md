---
name: github-actions
description: Review and update GitHub Actions workflows safely. Use this skill when editing `.github/workflows/*.yml`, adding or changing `uses:` actions, modernizing workflow versions, or checking whether a touched workflow should upgrade stale action majors.
---

# Github Actions

## Overview

Use this skill when a task touches GitHub Actions workflow files or action version selection. It defines how to choose action versions, when to upgrade the rest of a workflow, and which shortcuts are forbidden.

## Workflow Rules

Before changing a workflow:

- Read the whole touched workflow, not just the one line you plan to edit.
- List every `uses:` action in that workflow.
- Check the latest stable major version from the action's official repository metadata or releases before choosing a version.

When editing a workflow:

- Use the newest published stable major for every `uses:` entry you touch.
- Upgrade stale major versions elsewhere in the same workflow while you are already editing it, unless there is a documented compatibility reason not to.
- Prefer stable major tags such as `actions/checkout@v6`.
- Do not use floating refs such as `@main`, `@master`, or another branch name unless the user explicitly asks for that strategy.

## What Not To Do

- Do not guess action versions.
- Do not copy an older workflow blindly.
- Do not update one `uses:` line and leave the rest of the touched workflow stale without a reason.
- Do not treat branch refs as acceptable substitutes for stable tags.
