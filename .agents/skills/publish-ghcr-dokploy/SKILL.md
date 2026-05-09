---
name: publish-ghcr-dokploy
description: Publish a Dockerized app to GHCR, trigger the matching Dokploy deploy API for either an application or Compose service, and gate image publishing behind a successful quality-gates workflow. Use when creating or updating GitHub Actions for Docker releases to GHCR and Dokploy.
---

# Publish Docker Images to GHCR and Dokploy

Use this skill when the user wants a Dockerized app published to GHCR and deployed by Dokploy, especially when the release must wait for a successful `quality-gates` workflow.

Use this together with `github-actions` when editing workflow action versions or general workflow structure, and with `docker-runtime-config` when the task depends on build-time versus runtime env placement.

## What to inspect first

Before editing the release flow:

- Read the target Dockerfile and app README.
- Confirm the GHCR image name, whether the Dokploy target is a normal application or a Compose service, the matching Dokploy ID, and whether the image is private.
- Confirm which upstream workflow acts as the quality gate, usually `quality-gates`.
- Check existing workflows under `.github/workflows/`.

## Required workflow shape

Prefer a dedicated publish workflow that runs only after quality gates pass.

### Trigger

Use `workflow_run` on the `quality-gates` workflow:

```yaml
on:
  workflow_run:
    workflows:
      - quality-gates
    types:
      - completed
    branches:
      - main
```

Gate the job so it only runs for successful push-based quality runs:

```yaml
if: ${{ github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push' }}
```

### Commit correctness

Always check out the exact SHA that passed quality gates:

```yaml
- uses: actions/checkout@v6
  with:
    ref: ${{ github.event.workflow_run.head_sha }}
```

Do not build from the workflow-runner default ref, or you risk publishing the wrong commit.

## GHCR publishing pattern

Use GitHub Actions to build and push the image. Prefer:

- repo root as Docker build context when the Dockerfile depends on the monorepo
- GHCR login with `GITHUB_TOKEN`
- tags for `latest`, stable branch, and immutable SHA
- cache reuse via `type=gha`

Typical tags:

- `ghcr.io/<owner>/<image>:latest`
- `ghcr.io/<owner>/<image>:main`
- `ghcr.io/<owner>/<image>:sha-<commit-sha>`

For workflows triggered by `workflow_run`, derive SHA tags from `github.event.workflow_run.head_sha`.

## Dokploy deploy pattern

Do not rely on Dokploy's Git push auto-deploy for GHCR-backed apps. That can race ahead of the image push and deploy the previous image.

Instead, trigger Dokploy after the GHCR push completes by calling the matching official Dokploy API for the service type.

### Normal Dokploy application

Use this when the Dokploy target is an application service, such as URLs shaped like `/services/application/<id>`.

```sh
curl --fail-with-body --silent --show-error \
  -X POST "${DOKPLOY_BASE_URL%/}/api/application.deploy" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${DOKPLOY_API_KEY}" \
  -d "{
    \"applicationId\": \"${DOKPLOY_APPLICATION_ID}\"
  }"
```

Recommended secret pattern:

- `DOKPLOY_BASE_URL`
- `DOKPLOY_API_KEY`
- `DOKPLOY_<APP>_APPLICATION_ID`

### Dokploy Docker Compose service

Use this when the Dokploy target is a Compose service, such as URLs shaped like `/services/compose/<id>`.

```sh
curl --fail-with-body --silent --show-error \
  -X POST "${DOKPLOY_BASE_URL%/}/api/compose.deploy" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${DOKPLOY_API_KEY}" \
  -d "{
    \"composeId\": \"${DOKPLOY_COMPOSE_ID}\"
  }"
```

Use GitHub Actions secrets for all Dokploy values.

Recommended secret pattern:

- `DOKPLOY_BASE_URL`
- `DOKPLOY_API_KEY`
- `DOKPLOY_<APP>_COMPOSE_ID`

Keep app-specific IDs explicit instead of overloading one generic Dokploy secret.

## Dokploy registry authentication

If Dokploy pulls a private GHCR image, Dokploy needs registry credentials. Use:

- registry: `ghcr.io`
- username: GitHub username
- password/token: classic GitHub PAT with `read:packages`

Do not use the GitHub Actions `GITHUB_TOKEN` inside Dokploy. That token is for the workflow run, not for Dokploy's later image pulls.

## Documentation updates

When you change this release flow, update the app README with:

- GHCR image name
- produced tags
- required GitHub Actions secrets
- Dokploy deploy sequence, including whether it uses application or compose deploys
- any registry-auth requirement for private GHCR images

## Validation checklist

After edits:

1. Confirm the publish workflow is triggered by `workflow_run`, not direct `push`, unless the user explicitly wants otherwise.
2. Confirm the job checks out `github.event.workflow_run.head_sha`.
3. Confirm tags include an immutable SHA tag.
4. Confirm the Dokploy trigger happens after the image push step.
5. Confirm the workflow uses `application.deploy` plus `DOKPLOY_<APP>_APPLICATION_ID` for normal applications, or `compose.deploy` plus `DOKPLOY_<APP>_COMPOSE_ID` for Compose services.
6. Run `bun run check:fix`.
7. If the Dockerfile changed, consider validating with `docker build -f <dockerfile> .`.
