#!/usr/bin/env bash
# motion-capture.sh <url> [outdir]
#
# Loads <url> in a headless browser at two viewports (390x844, 1440x900),
# screenshots the load sequence and a stepped scroll of the full page so a
# human or an LLM judge can see reveal animations, then does the 390
# viewport a second time with reduced motion emulated. Writes one contact
# sheet per run (three sheets) plus every individual frame.
#
# The two normal-motion runs also get a scrub pass: 100 px scroll steps,
# one frame each, in a sheet of their own (two more sheets), so motion that
# follows the scroll position shows as a sequence.
#
# Before its final OK line it prints one MOTION VISIBILITY line for the
# phone run: VISIBLE, TOO SMALL, TOO LATE, OFF-SCREEN, NONE SEEN or
# NOT MEASURED (see README.md).
#
# Needs: a node binary, the "playwright" npm package (with its Chromium
# browser already downloaded), and ffmpeg. Nothing is installed by this
# script. See README.md for the environment variables that point it at
# non-default locations.
#
# Exit codes: 0 the capture ran (read the MOTION VISIBILITY line for the
# verdict), 1 a capture or sheet-build step failed, 2 bad arguments or no
# ffmpeg, 3 NOT VERIFIED: the browser could not start, so nothing was
# checked.

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

URL="${1:-}"
OUTDIR="${2:-}"

if [ -z "$URL" ]; then
  echo "usage: motion-capture.sh <url> [outdir]" >&2
  exit 2
fi
if [ -z "$OUTDIR" ]; then
  slug="$(echo "$URL" | sed -E 's#^[a-z]+://##; s#[^A-Za-z0-9._-]+#-#g; s#-+#-#g; s#^-|-$##g')"
  OUTDIR="./motion-capture-${slug}"
fi
mkdir -p "$OUTDIR" || { echo "site-craft: cannot create outdir $OUTDIR" >&2; exit 2; }

NODE_BIN="$(sitecraft_resolve_node)" || sitecraft_not_verified "no node binary"
PW_DIR="$(sitecraft_resolve_playwright_dir)" || sitecraft_not_verified "no Playwright package"
CHROMIUM_BIN="$(sitecraft_resolve_chromium)" || sitecraft_not_verified "no Chromium binary"
FFMPEG_BIN="$(sitecraft_resolve_ffmpeg)" || exit 2
sitecraft_preflight_browser "$NODE_BIN" "$PW_DIR" "$CHROMIUM_BIN"

echo "site-craft: node=$NODE_BIN" >&2
echo "site-craft: playwright module dir=$PW_DIR" >&2
echo "site-craft: chromium=$CHROMIUM_BIN" >&2
echo "site-craft: ffmpeg=$FFMPEG_BIN" >&2

start_ts=$(date +%s)

NODE_PATH="$PW_DIR" \
SITECRAFT_CHROMIUM_RESOLVED="$CHROMIUM_BIN" \
SITECRAFT_FFMPEG_RESOLVED="$FFMPEG_BIN" \
"$NODE_BIN" "$SCRIPT_DIR/capture-engine.js" "$URL" "$OUTDIR" > "$OUTDIR/engine.log" 2> "$OUTDIR/engine.err"
status=$?

end_ts=$(date +%s)
runtime=$((end_ts - start_ts))

grep -E '^[0-9A-Za-z].*(: [0-9]+ frames|: FAILED \()|^SHEET_BYTES_LIMIT_EXCEEDED ' "$OUTDIR/engine.log" | sed 's/^/site-craft: /'
cat "$OUTDIR/engine.err" >&2

if [ "$status" -ne 0 ]; then
  echo "site-craft: motion-capture FAILED after ${runtime}s (see $OUTDIR/engine.err)" >&2
  exit 1
fi

grep -E '^MOTION VISIBILITY ' "$OUTDIR/engine.log" | sed 's/^/site-craft: /'

sheet_count=$(ls "$OUTDIR/sheets"/*.jpg 2>/dev/null | wc -l | tr -d ' ')
echo "site-craft: motion-capture OK — $sheet_count sheets, ${runtime}s — outdir=$OUTDIR"
exit 0
