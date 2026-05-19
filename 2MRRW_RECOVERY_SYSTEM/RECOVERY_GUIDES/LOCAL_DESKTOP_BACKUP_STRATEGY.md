# Local Desktop Backup Strategy

Keep a **second copy** of recovery assets outside GitHub — laptop disk failure or account lockout should not erase your runbook.

## What to back up

| Item | Path |
|------|------|
| Recovery bundle | `2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/` |
| Full control repo | `2MRRW-Control-System/` |
| Frontend repo | `artist-platform/` |
| Env name list | `2MRRW_RECOVERY_SYSTEM/RECOVERY_GUIDES/ENVIRONMENT_VARIABLE_RECOVERY.md` |
| Secret values | **Password manager only** — never in zip |

## Zip archive (quick)

```bash
DATE=$(date +%Y%m%d)
CONTROL=~/2MRRW-Control-System
DESKTOP=~/Desktop

# Recovery bundle only (small, email-friendly)
(cd "$CONTROL" && zip -r "$DESKTOP/2MRRW-recovery-$DATE.zip" 2MRRW_RECOVERY_SYSTEM/)

# Full control repo (exclude node_modules)
(cd "$(dirname "$CONTROL")" && zip -r "$DESKTOP/2MRRW-control-full-$DATE.zip" \
  "$(basename "$CONTROL")" \
  -x "$(basename "$CONTROL")/node_modules/*" -x "$(basename "$CONTROL")/.next/*")

# Frontend
ARTIST=~/artist-platform
(cd "$(dirname "$ARTIST")" && zip -r "$DESKTOP/2MRRW-artist-$DATE.zip" \
  "$(basename "$ARTIST")" \
  -x "$(basename "$ARTIST")/node_modules/*" -x "$(basename "$ARTIST")/.next/*")
```

Upload `2MRRW-recovery-*.zip` to iCloud / Google Drive / Dropbox.

## rsync to external drive

```bash
DATE=$(date +%Y%m%d)
DEST="/Volumes/BackupDisk/2MRRW-$DATE"
mkdir -p "$DEST"

rsync -a --delete \
  --exclude node_modules --exclude .next --exclude .git/objects \
  ~/2MRRW-Control-System/ "$DEST/control/"

rsync -a --delete \
  --exclude node_modules --exclude .next \
  ~/artist-platform/ "$DEST/artist-platform/"
```

Add `--progress` for visibility on large transfers.

## Incremental daily (optional cron)

```bash
# ~/.local/bin/2mrrw-backup.sh
rsync -a --exclude node_modules --exclude .next \
  ~/2MRRW-Control-System/2MRRW_RECOVERY_SYSTEM/ \
  ~/Backups/2MRRW/recovery-system/
```

## Restore from desktop backup

1. Unzip or rsync back to `~/2MRRW-Control-System`.
2. `git fetch --tags origin && git checkout foundation-stable-v1`
3. Follow [`RAPID_RESTORE_CHECKLIST.md`](RAPID_RESTORE_CHECKLIST.md).

## Rotation

- Weekly: recovery zip to cloud
- Monthly: full repo rsync to external drive
- After every foundation tag: new zip + note in `FOUNDATION_SNAPSHOTS/`
