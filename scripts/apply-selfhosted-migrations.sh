#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/wbgen/apps/wb-generator}"
SELFHOSTED_DIR="${SELFHOSTED_DIR:-/home/wbgen/apps/supabase-project}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$REPO_DIR/supabase/migrations}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
BASELINE_ALL_MIGRATIONS="${BASELINE_ALL_MIGRATIONS:-false}"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

cd "$SELFHOSTED_DIR"

psql_query() {
  docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" "$@"
}

psql_value() {
  psql_query -tA -c "$1"
}

apply_file() {
  local file="$1"
  echo "Applying migration: $(basename "$file")"
  docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$file"
}

psql_query -c "
create table if not exists public.app_migration_history (
  filename text primary key,
  applied_at timestamptz not null default now()
);
"

history_count="$(psql_value "select count(*) from public.app_migration_history;")"

if [[ "$history_count" == "0" ]]; then
  if [[ "$BASELINE_ALL_MIGRATIONS" == "true" ]]; then
    echo "Baselining all existing migration files without executing them."
    while IFS= read -r file; do
      filename="$(basename "$file")"
      psql_query -c "
        insert into public.app_migration_history (filename)
        values ('$filename')
        on conflict (filename) do nothing;
      " >/dev/null
    done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)
  else
    has_supabase_history="$(psql_value "select coalesce(to_regclass('supabase_migrations.schema_migrations') is not null, false);")"

    if [[ "$has_supabase_history" == "t" ]]; then
      existing_versions="$(psql_value "select version from supabase_migrations.schema_migrations order by version;")"

      if [[ -n "$existing_versions" ]]; then
        echo "Bootstrapping app_migration_history from supabase_migrations.schema_migrations."
        while IFS= read -r file; do
          filename="$(basename "$file")"
          version="${filename%%_*}"

          if grep -qx "$version" <<< "$existing_versions"; then
            psql_query -c "
              insert into public.app_migration_history (filename)
              values ('$filename')
              on conflict (filename) do nothing;
            " >/dev/null
          fi
        done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)
      else
        echo "supabase_migrations.schema_migrations exists but is empty." >&2
        echo "Either set BASELINE_ALL_MIGRATIONS=true for the first run or apply migrations manually once." >&2
        exit 1
      fi
    else
      echo "Migration history is empty and supabase_migrations.schema_migrations was not found." >&2
      echo "Refusing to apply all migrations blindly." >&2
      echo "Set BASELINE_ALL_MIGRATIONS=true for the first run if this database is already up to date." >&2
      exit 1
    fi
  fi
fi

applied_count=0

while IFS= read -r file; do
  filename="$(basename "$file")"
  already_applied="$(psql_value "select exists(select 1 from public.app_migration_history where filename = '$filename');")"

  if [[ "$already_applied" == "t" ]]; then
    continue
  fi

  apply_file "$file"
  psql_query -c "
    insert into public.app_migration_history (filename)
    values ('$filename');
  " >/dev/null
  applied_count=$((applied_count + 1))
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

echo "Database migrations complete. Applied $applied_count new file(s)."
