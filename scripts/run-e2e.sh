#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
postgres_bin="$(command -v postgres || true)"
initdb_bin="$(command -v initdb || true)"
pg_ctl_bin="$(command -v pg_ctl || true)"
createdb_bin="$(command -v createdb || true)"

if [[ -z "$postgres_bin" || -z "$initdb_bin" || -z "$pg_ctl_bin" || -z "$createdb_bin" ]]; then
  echo "PostgreSQL 16 command-line tools are required for isolated E2E tests." >&2
  exit 1
fi

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/rococo-outreach-e2e.XXXXXX")"
data_dir="$work_dir/postgres"
postgres_log="$work_dir/postgres.log"

pick_port() {
  node -e 'const net=require("node:net");const server=net.createServer();server.listen(0,"127.0.0.1",()=>{console.log(server.address().port);server.close()})'
}

postgres_port="$(pick_port)"
app_port="$(pick_port)"
while [[ "$app_port" == "$postgres_port" ]]; do
  app_port="$(pick_port)"
done

cleanup() {
  if [[ -s "$data_dir/postmaster.pid" ]]; then
    "$pg_ctl_bin" -D "$data_dir" -m fast stop >/dev/null 2>&1 || true
  fi
  rm -rf "$work_dir"
}
trap cleanup EXIT INT TERM

"$initdb_bin" -D "$data_dir" -A trust -U postgres --encoding=UTF8 --no-locale >/dev/null
"$pg_ctl_bin" -D "$data_dir" -l "$postgres_log" -o "-h 127.0.0.1 -p $postgres_port" -w start >/dev/null
"$createdb_bin" -h 127.0.0.1 -p "$postgres_port" -U postgres rococo_outreach_e2e

export DATABASE_URL="postgresql://postgres@127.0.0.1:$postgres_port/rococo_outreach_e2e?schema=public"
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:$app_port"
export PORT="$app_port"
export HOSTNAME=127.0.0.1
export NEXT_PUBLIC_OUTREACH_ENV=dev
export SMTP_TEST_API_TOKEN=e2e-operator-token-with-enough-entropy
export OUTREACH_MAIL_TRANSPORT=simulated
export OUTREACH_QUEUE_WORKER=true
export OUTREACH_SEND_INTERVAL_MS=25
export TENCENT_MAIL_SMTP_HOST=localhost.invalid
export TENCENT_MAIL_SMTP_PORT=465
export TENCENT_MAIL_SMTP_SECURE=true
export TENCENT_MAIL_SMTP_USER=winnie@next2p.com
export TENCENT_MAIL_SMTP_PASSWORD=e2e-not-a-real-password
export TEST_RECIPIENT_EMAIL=operator@example.test
export OUTREACH_ALLOWED_SENDER_DOMAINS=next2p.com

cd "$repo_dir"
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/playwright test "$@"
