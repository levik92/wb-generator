#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/wbgen/apps/wb-generator}"
REMOTE="${REMOTE:-origin}"
SOURCE_BRANCH="${SOURCE_BRANCH:-main}"
TARGET_BRANCH="${TARGET_BRANCH:-selfhosted}"
PUSH_TARGET="${PUSH_TARGET:-true}"
RUN_DEPLOY="${RUN_DEPLOY:-true}"

cd "$REPO_DIR"

git fetch "$REMOTE"
git checkout "$TARGET_BRANCH"
git pull --ff-only "$REMOTE" "$TARGET_BRANCH"
git merge --no-edit "$REMOTE/$SOURCE_BRANCH"

if [[ "$PUSH_TARGET" == "true" ]]; then
  git push "$REMOTE" "$TARGET_BRANCH"
fi

if [[ "$RUN_DEPLOY" == "true" ]]; then
  BRANCH="$TARGET_BRANCH" "$REPO_DIR/scripts/deploy-rf.sh"
fi

echo "Synced $SOURCE_BRANCH into $TARGET_BRANCH successfully."

