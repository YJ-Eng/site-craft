#!/usr/bin/env bash
# page-gates.sh <url> [--widths 300,320,360,390,414,768,1024,1280,1440,1920]
#                     [--ask-selector CSS] [--json]
#
# Three gates against a real page load (details in page-gates.js and
# README.md):
#  1. OVERFLOW: nothing sticks out of the viewport at any width.
#  2. ONE ASK: at most one distinct destination among filled buttons/links
#     inside <main>, at 1440 and 390.
#  3. DARK LEGIBILITY: text on dark backgrounds is at least 13.5 px and
#     meets 7:1 contrast (4.5:1 from 24 px).
# Each prints PASS/FAIL lines with the worst offenders.
#
# Needs: a node binary and the "playwright" npm package with its Chromium
# browser already downloaded. Nothing is installed by this script. See
# README.md for the environment variables that point it at non-default
# locations.
#
# Exit codes: 0 all gates pass, 1 any gate fails, 2 bad arguments,
# 3 NOT VERIFIED: the browser could not start, so nothing was checked.

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

if [ $# -lt 1 ]; then
  echo "usage: page-gates.sh <url> [--widths a,b,c] [--ask-selector CSS] [--json]" >&2
  exit 2
fi

NODE_BIN="$(sitecraft_resolve_node)" || sitecraft_not_verified "no node binary"
PW_DIR="$(sitecraft_resolve_playwright_dir)" || sitecraft_not_verified "no Playwright package"
CHROMIUM_BIN="$(sitecraft_resolve_chromium)" || sitecraft_not_verified "no Chromium binary"
sitecraft_preflight_browser "$NODE_BIN" "$PW_DIR" "$CHROMIUM_BIN"

echo "site-craft: node=$NODE_BIN" >&2
echo "site-craft: playwright module dir=$PW_DIR" >&2
echo "site-craft: chromium=$CHROMIUM_BIN" >&2

start_ts=$(date +%s)

NODE_PATH="$PW_DIR" \
SITECRAFT_CHROMIUM_RESOLVED="$CHROMIUM_BIN" \
"$NODE_BIN" "$SCRIPT_DIR/page-gates.js" "$@"
status=$?

echo "site-craft: runtime $(( $(date +%s) - start_ts ))s" >&2
exit $status
