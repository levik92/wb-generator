# RF Deploy

Simple deploy flow for the RF production server:

1. Push code to GitHub.
2. On the RF server, keep a clone of this repository at `/home/wbgen/apps/wb-generator`.
3. Configure nginx to serve frontend files from `/var/www/wbgen`.
4. Run:

```bash
chmod +x /home/wbgen/apps/wb-generator/scripts/deploy-rf.sh
chmod +x /home/wbgen/apps/wb-generator/scripts/sync-selfhosted-functions.sh
/home/wbgen/apps/wb-generator/scripts/deploy-rf.sh
```

The script:

- pulls the latest Git branch
- installs dependencies
- builds the frontend
- syncs `supabase/functions` into self-hosted Supabase
- recreates the `functions` container

Environment overrides:

```bash
APP_DIR=/home/wbgen/apps/wb-generator
SELFHOSTED_DIR=/home/wbgen/apps/supabase-project
FRONTEND_WEB_ROOT=/var/www/wbgen
BRANCH=main
REMOTE=origin
```

Important:

- Do not edit frontend or edge functions directly on the server.
- Keep GitHub as the single source of truth.
- Apply DB migrations as a separate controlled step before prod deploys that change schema.
