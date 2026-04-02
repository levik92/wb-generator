#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/wbgen/apps/wb-generator}"
REMOTE="${REMOTE:-origin}"
SOURCE_BRANCH="${SOURCE_BRANCH:-main}"
TARGET_BRANCH="${TARGET_BRANCH:-selfhosted}"
PUSH_TARGET="${PUSH_TARGET:-true}"
RUN_DEPLOY="${RUN_DEPLOY:-true}"

cd "$REPO_DIR"

ENV_BACKUP=""

preserve_local_env() {
  if git ls-files --error-unmatch .env >/dev/null 2>&1 && ! git diff --quiet -- .env; then
    ENV_BACKUP="$(mktemp)"
    cp .env "$ENV_BACKUP"
    git restore --source=HEAD --worktree -- .env
  fi
}

restore_local_env() {
  if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
    cp "$ENV_BACKUP" .env
    rm -f "$ENV_BACKUP"
    ENV_BACKUP=""
  fi
}

trap restore_local_env EXIT

preserve_local_env
git fetch "$REMOTE"
git checkout "$TARGET_BRANCH"
git pull --ff-only "$REMOTE" "$TARGET_BRANCH"
git merge --no-edit "$REMOTE/$SOURCE_BRANCH"
restore_local_env

if [[ "$PUSH_TARGET" == "true" ]]; then
  git push "$REMOTE" "$TARGET_BRANCH"
fi

if [[ "$RUN_DEPLOY" == "true" ]]; then
  BRANCH="$TARGET_BRANCH" bash "$REPO_DIR/scripts/deploy-rf.sh"
fi

echo "Synced $SOURCE_BRANCH into $TARGET_BRANCH successfully."
