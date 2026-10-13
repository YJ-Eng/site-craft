#!/usr/bin/env bash
# budget-check.sh <url> [--budget=BYTES] [--text-ratio-min=RATIO]
#                       [--budget-scope=all|first-party] [--settle-ms=MS]
#
# Three checks against a real page load:
#  1. JS weight: every JS response (including scripts injected after load),
#     split into first-party and third-party, vs a gzip-byte budget
#     (default 60,000 bytes, see env/flag below). --budget-scope picks whether the
#     budget is checked against first-party JS only or against everything
#     (default: all).
#  2. JS-off: visible text with JavaScript disabled vs JavaScript enabled.
#  3. Reduced motion: two measures -- Web Animations API animations
#     running/pending, and an engine-agnostic screenshot diff -- with and
#     without reduced motion emulated, after load and after one scroll.
#
# Env overrides (see README.md): SITECRAFT_JS_BUDGET_GZIP, SITECRAFT_TEXT_RATIO_MIN,
# SITECRAFT_JS_BUDGET_SCOPE, SITECRAFT_SETTLE_MS, plus the node/playwright/chromium
# resolution vars shared with motion-capture.sh.
#
# Exit codes: 0 all checks passed, 1 at least one check failed,
# 2 bad arguments, 3 NOT VERIFIED: the browser could not start, so nothing
# was checked.

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

URL=""
BUDGET="${SITECRAFT_JS_BUDGET_GZIP:-60000}"
TEXT_RATIO_MIN="${SITECRAFT_TEXT_RATIO_MIN:-0.95}"
BUDGET_SCOPE="${SITECRAFT_JS_BUDGET_SCOPE:-all}"
SETTLE_MS="${SITECRAFT_SETTLE_MS:-3000}"

for arg in "$@"; do
  case "$arg" in
    --budget=*) BUDGET="${arg#--budget=}" ;;
    --text-ratio-min=*) TEXT_RATIO_MIN="${arg#--text-ratio-min=}" ;;
    --budget-scope=*) BUDGET_SCOPE="${arg#--budget-scope=}" ;;
    --settle-ms=*) SETTLE_MS="${arg#--settle-ms=}" ;;
    --*) echo "site-craft: unknown flag $arg" >&2; exit 2 ;;
    *) URL="$arg" ;;
  esac
done

if [ -z "$URL" ]; then
  echo "usage: budget-check.sh <url> [--budget=BYTES] [--text-ratio-min=RATIO] [--budget-scope=all|first-party] [--settle-ms=MS]" >&2
  exit 2
fi
case "$BUDGET" in ''|*[!0-9]*) echo "site-craft: --budget must be an integer byte count, got '$BUDGET'" >&2; exit 2 ;; esac
case "$TEXT_RATIO_MIN" in
  ''|*[!0-9.]*|*.*.*|.) echo "site-craft: --text-ratio-min must be a number, got '$TEXT_RATIO_MIN'" >&2; exit 2 ;;
esac
case "$BUDGET_SCOPE" in
  all|first-party) ;;
  *) echo "site-craft: --budget-scope must be 'all' or 'first-party', got '$BUDGET_SCOPE'" >&2; exit 2 ;;
esac
case "$SETTLE_MS" in ''|*[!0-9]*) echo "site-craft: --settle-ms must be an integer millisecond count, got '$SETTLE_MS'" >&2; exit 2 ;; esac

NODE_BIN="$(sitecraft_resolve_node)" || sitecraft_not_verified "no node binary"
PW_DIR="$(sitecraft_resolve_playwright_dir)" || sitecraft_not_verified "no Playwright package"
CHROMIUM_BIN="$(sitecraft_resolve_chromium)" || sitecraft_not_verified "no Chromium binary"
sitecraft_preflight_browser "$NODE_BIN" "$PW_DIR" "$CHROMIUM_BIN"

echo "site-craft: node=$NODE_BIN" >&2
echo "site-craft: playwright module dir=$PW_DIR" >&2
echo "site-craft: chromium=$CHROMIUM_BIN" >&2
echo "site-craft: budget=$BUDGET B gz (scope=$BUDGET_SCOPE), text-ratio-min=$TEXT_RATIO_MIN" >&2
echo "site-craft: settle-after-load=${SETTLE_MS}ms" >&2

TMPLOG="$(mktemp)"
TMPERR="$(mktemp)"
trap 'rm -f "$TMPLOG" "$TMPERR"' EXIT

start_ts=$(date +%s)

NODE_PATH="$PW_DIR" \
SITECRAFT_CHROMIUM_RESOLVED="$CHROMIUM_BIN" \
"$NODE_BIN" "$SCRIPT_DIR/budget-engine.js" "$URL" "$BUDGET" "$SETTLE_MS" > "$TMPLOG" 2> "$TMPERR"
engine_status=$?

end_ts=$(date +%s)
runtime=$((end_ts - start_ts))

cat "$TMPERR" >&2

if [ "$engine_status" -ne 0 ]; then
  echo "site-craft: budget-check engine FAILED after ${runtime}s (see above)" >&2
  exit 1
fi

"$NODE_BIN" "$SCRIPT_DIR/format-budget-result.js" "$TMPLOG" "$TEXT_RATIO_MIN" "$BUDGET_SCOPE"
format_status=$?

echo ""
echo "site-craft: runtime ${runtime}s"

exit $format_status
