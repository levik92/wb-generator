#!/usr/bin/env bash
set -euo pipefail

FUNCTIONS_SRC="${1:-$PWD/supabase/functions}"
FUNCTIONS_DST="${2:-/home/wbgen/apps/supabase-project/volumes/functions}"

if [[ ! -d "$FUNCTIONS_SRC" ]]; then
  echo "Functions source directory not found: $FUNCTIONS_SRC" >&2
  exit 1
fi

if [[ ! -d "$FUNCTIONS_DST" ]]; then
  echo "Functions destination directory not found: $FUNCTIONS_DST" >&2
  exit 1
fi

for dir in "$FUNCTIONS_SRC"/*; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  mkdir -p "$FUNCTIONS_DST/$name"
  rsync -a --delete "$dir/" "$FUNCTIONS_DST/$name/"
done

for dir in "$FUNCTIONS_DST"/*; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  case "$name" in
    main|hello)
      continue
      ;;
  esac

  if [[ ! -d "$FUNCTIONS_SRC/$name" ]]; then
    rm -rf "$dir"
  fi
done

