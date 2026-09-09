#!/usr/bin/env bash
set -euo pipefail
image="${1:-papersync:smoke}"
engine="${2:-docker}"
suffix="$(date +%s)-$$"
network="papersync-smoke-$suffix"
database="papersync-db-$suffix"
application="papersync-web-$suffix"
cleanup() {
  "$engine" rm -f "$application" "$database" >/dev/null 2>&1 || true
  "$engine" network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
"$engine" network create "$network" >/dev/null
"$engine" run -d --name "$database" --network "$network" \
  -e POSTGRES_USER=papersync -e POSTGRES_PASSWORD=fixture-password -e POSTGRES_DB=papersync \
  docker.io/library/postgres:18-alpine >/dev/null
for attempt in {1..30}; do
  # PostgreSQL initdb briefly serves only on its Unix socket; probe TCP for the final server.
  if "$engine" exec "$database" pg_isready -h 127.0.0.1 -U papersync >/dev/null 2>&1; then break; fi
  sleep 1
done
"$engine" exec "$database" pg_isready -h 127.0.0.1 -U papersync
uri="postgresql://papersync:fixture-password@$database:5432/papersync"
"$engine" run --rm --network "$network" -e "DATABASE_URL=$uri" \
  "$image" bun run --cwd /app/packages/db db:migrate:deploy
"$engine" run -d --name "$application" --network "$network" -p 127.0.0.1::3000 \
  --memory=512m --read-only --tmpfs /tmp:rw,size=64m --cap-drop ALL --security-opt no-new-privileges \
  -e "DATABASE_URL=$uri" -e BETTER_AUTH_URL=http://localhost:3000 \
  -e BETTER_AUTH_SECRET=papersync-container-fixture-secret-with-no-real-access \
  -e GITHUB_CLIENT_ID=fixture -e GITHUB_CLIENT_SECRET=fixture \
  -e GITHUB_ALLOWED_ACCOUNT_ID=fixture "$image" >/dev/null
port="$("$engine" port "$application" 3000/tcp | sed 's/.*://')"
origin="http://127.0.0.1:$port"
for attempt in {1..30}; do
  if curl --fail --silent "$origin/api/health" >/dev/null; then break; fi
  sleep 1
done
if ! curl --fail --silent "$origin/api/health"; then
  "$engine" logs "$application"
  exit 1
fi
test "$(curl --silent -o /dev/null -w '%{http_code}' "$origin/api/homework")" = 401
for route in /scan /planner /settings /api/plugin; do
  reply="$(curl --fail --silent -i "$origin$route" | tr -d '\r')"
  # Next.js sends a meta redirect after a streaming response has begun.
  if [[ "$reply" != *$'\nlocation: /login'* && "$reply" != *'http-equiv="refresh" content="1;url=/login"'* ]]; then
    printf 'Missing sign-in redirect for %s\n' "$route" >&2
    exit 1
  fi
done
login="$(curl --fail --silent "$origin/login")"
[[ "$login" == *"Sign in with GitHub"* ]]
