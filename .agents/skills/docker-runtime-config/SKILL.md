---
name: docker-runtime-config
description: Place Docker and Compose build-time and runtime configuration correctly. Use this skill when deciding between `ARG`, Dockerfile `ENV`, Compose `environment`, runtime secrets, or Next.js public-vs-server runtime config for containerized apps.
---

# Docker Runtime Config

## Overview

Use this skill when a task is primarily about where configuration belongs in Docker, Compose, or deployment-time wiring. It is about build-time versus runtime placement, secret handling, and runtime config behavior in containerized apps.

## Core Rules

- `ARG` is build-time only.
- Dockerfile `ENV` defines image defaults and is available in later image stages.
- Compose `environment` is runtime-only when Compose uses `image:`. It does not flow back into `docker build`.
- Values needed during the build must be passed explicitly with `build.args` or an appropriate build secret mechanism.
- Secrets must stay out of `ARG`. Prefer runtime environment injection or build secrets.
- Safe defaults such as `NODE_ENV`, `PORT`, and `HOSTNAME` may live in Dockerfile `ENV`.

## Choosing Where A Value Belongs

Ask these questions in order:

1. Is the value needed while the image is being built?
   - If yes, pass it explicitly as a build input.
2. Is it secret?
   - If yes, do not use `ARG`; prefer runtime env or a build secret.
3. Is it only needed when the container starts?
   - If yes, supply it from Compose or the deployment platform at runtime.
4. Is it browser-visible in Next.js, such as `NEXT_PUBLIC_*`?
   - Treat it as build-time unless you deliberately move it behind a runtime endpoint.
5. Must it vary by deployment without rebuilding the image?
   - Resolve it at request time from the current origin, headers, or a dynamic server endpoint instead of baking it into the client bundle.

## Next.js Runtime Config Rules

- Do not assume browser-visible variables can change after `next build`.
- Prefer runtime config endpoints for values that must differ between deployments without rebuilding.
- Ensure those endpoints stay request-time. In Next.js, a route handler that reads env can still be prerendered or cached during the build unless you force runtime behavior, for example with `await connection()`.
- If a client library auto-reads environment variables, audit its defaults instead of checking only your own `process.env` usage.

## What Not To Do

- Do not assume Compose runtime env becomes available during the image build.
- Do not bake secrets into images.
- Do not rely on `.env` files existing inside containers unless they are intentionally copied there.
- Do not assume a prebuilt registry image can pick up build-time values from production Compose.
