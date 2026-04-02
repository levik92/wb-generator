#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/wbgen/apps/wb-generator}"
SELFHOSTED_DIR="${SELFHOSTED_DIR:-/home/wbgen/apps/supabase-project}"
FRONTEND_WEB_ROOT="${FRONTEND_WEB_ROOT:-/var/www/wbgen}"
BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
APPLY_DB_MIGRATIONS="${APPLY_DB_MIGRATIONS:-true}"

cd "$APP_DIR"

git fetch "$REMOTE"
git checkout "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

npm run build

mkdir -p "$FRONTEND_WEB_ROOT"
rsync -a --delete "$APP_DIR/dist/" "$FRONTEND_WEB_ROOT/"

bash "$APP_DIR/scripts/sync-selfhosted-functions.sh" \
  "$APP_DIR/supabase/functions" \
  "$SELFHOSTED_DIR/volumes/functions"

cd "$SELFHOSTED_DIR"

if [[ "$APPLY_DB_MIGRATIONS" == "true" ]]; then
  bash "$APP_DIR/scripts/apply-selfhosted-migrations.sh"
fi

docker compose up -d --force-recreate --no-deps functions

echo "Deploy completed successfully."
