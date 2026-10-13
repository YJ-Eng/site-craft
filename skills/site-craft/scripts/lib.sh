#!/usr/bin/env bash
# Shared resolution helpers for site-craft scripts.
# Source this file; do not execute it directly.
#
# Every resolver checks an explicit env var first, then a short list of
# common locations, then gives up with one clear line on stderr naming what
# is missing and which env var sets it by hand.
#
# Env vars this file reads:
#   SITECRAFT_NODE             path to a node binary
#   SITECRAFT_PLAYWRIGHT_DIR   a node_modules dir (or its parent) that has
#                               playwright installed under it
#   SITECRAFT_CHROMIUM         path to a chromium / chrome-headless-shell
#                               executable
#   SITECRAFT_BROWSERS_PATH    a Playwright browsers cache dir
#                               (same meaning as PLAYWRIGHT_BROWSERS_PATH)
#   SITECRAFT_FFMPEG           path to an ffmpeg binary

sitecraft_die() {
  echo "site-craft: $1" >&2
  exit 1
}

# Prints the one line a caller must report when a check could not run at
# all, then exits 3. A check that did not run is not a pass.
sitecraft_not_verified() {
  echo "site-craft: NOT VERIFIED, browser unavailable ($1). Report this build as \"not verified, browser unavailable\"; do not report a pass." >&2
  echo "site-craft: NOT VERIFIED, browser unavailable"
  exit 3
}

# sitecraft_preflight_browser <node> <playwright module dir> <chromium>
# Starts the browser once and closes it. Returns 0 if that works. If the
# Playwright package does not load, or Chromium cannot start (a sandbox
# that blocks it, a missing system library, a 20 s hang), prints the
# NOT VERIFIED line and exits 3.
sitecraft_preflight_browser() {
  local out rc
  out="$(NODE_PATH="$2" SITECRAFT_CHROMIUM_RESOLVED="$3" "$1" -e '
    const giveUp = setTimeout(() => { console.log("browser did not start within 20 s"); process.exit(3); }, 20000);
    let pw;
    try { pw = require("playwright"); } catch (e) { console.log("Playwright package did not load"); process.exit(3); }
    pw.chromium.launch({ headless: true, executablePath: process.env.SITECRAFT_CHROMIUM_RESOLVED || undefined })
      .then(async (b) => { const p = await b.newPage(); await p.setContent("<p>ok</p>"); await b.close(); clearTimeout(giveUp); process.exit(0); })
      .catch((e) => {
        const lines = String(e && e.message || e).split("\n").map((l) => l.trim()).filter(Boolean);
        const fatal = lines.find((l) => /FATAL|error while loading|No usable sandbox|cannot open shared object/i.test(l));
        console.log(("Chromium did not start: " + (fatal || lines[0] || "unknown error")).slice(0, 240));
        process.exit(3);
      });
  ' 2>/dev/null)"
  rc=$?
  [ "$rc" -eq 0 ] && return 0
  sitecraft_not_verified "${out:-browser preflight failed}"
}

# Prints the node binary to use, or dies.
sitecraft_resolve_node() {
  if [ -n "${SITECRAFT_NODE:-}" ]; then
    [ -x "$SITECRAFT_NODE" ] || sitecraft_die "SITECRAFT_NODE=$SITECRAFT_NODE is not executable"
    echo "$SITECRAFT_NODE"
    return 0
  fi
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi
  sitecraft_die "no node found. Set SITECRAFT_NODE=/path/to/node or put node on PATH."
}

# Prints a directory to set as NODE_PATH so `require('playwright')` resolves,
# or dies. Searches, in order: SITECRAFT_PLAYWRIGHT_DIR, a node_modules next
# to the caller's cwd, the global npm root, then npx's package cache under
# $HOME/.npm/_npx (the most recently modified entry).
sitecraft_resolve_playwright_dir() {
  local cand

  if [ -n "${SITECRAFT_PLAYWRIGHT_DIR:-}" ]; then
    cand="$SITECRAFT_PLAYWRIGHT_DIR"
    [ -d "$cand/node_modules/playwright" ] && { echo "$cand/node_modules"; return 0; }
    [ -d "$cand/playwright" ] && { echo "$cand"; return 0; }
    sitecraft_die "SITECRAFT_PLAYWRIGHT_DIR=$SITECRAFT_PLAYWRIGHT_DIR has no playwright package under it"
  fi

  if [ -d "./node_modules/playwright" ]; then
    echo "$(pwd)/node_modules"
    return 0
  fi

  if command -v npm >/dev/null 2>&1; then
    local g
    g="$(npm root -g 2>/dev/null)"
    if [ -n "$g" ] && [ -d "$g/playwright" ]; then
      echo "$g"
      return 0
    fi
  fi

  if [ -d "$HOME/.npm/_npx" ]; then
    # Most recently modified npx cache entry that holds playwright.
    cand="$(ls -dt "$HOME"/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1)"
    if [ -n "$cand" ]; then
      dirname "$cand"
      return 0
    fi
  fi

  sitecraft_die "no playwright package found. Set SITECRAFT_PLAYWRIGHT_DIR to a directory whose node_modules/ has playwright (e.g. run 'npx playwright --version' once to populate the npx cache), or npm install playwright in the caller's directory."
}

# Prints a chromium/chrome-headless-shell executable path, or dies.
sitecraft_resolve_chromium() {
  local cand base

  if [ -n "${SITECRAFT_CHROMIUM:-}" ]; then
    [ -x "$SITECRAFT_CHROMIUM" ] || sitecraft_die "SITECRAFT_CHROMIUM=$SITECRAFT_CHROMIUM is not executable"
    echo "$SITECRAFT_CHROMIUM"
    return 0
  fi

  for base in "${SITECRAFT_BROWSERS_PATH:-}" "${PLAYWRIGHT_BROWSERS_PATH:-}" "$HOME/.cache/ms-playwright"; do
    [ -n "$base" ] && [ -d "$base" ] || continue
    cand="$(ls -d "$base"/chromium-[0-9]*/chrome-linux*/chrome 2>/dev/null | sort -V | tail -1)"
    [ -n "$cand" ] && [ -x "$cand" ] && { echo "$cand"; return 0; }
    cand="$(ls -d "$base"/chromium_headless_shell-[0-9]*/chrome-headless-shell-linux*/chrome-headless-shell 2>/dev/null | sort -V | tail -1)"
    [ -n "$cand" ] && [ -x "$cand" ] && { echo "$cand"; return 0; }
  done

  sitecraft_die "no Chromium or chrome-headless-shell binary found. Set SITECRAFT_CHROMIUM=/path/to/chrome, or run 'npx playwright install chromium' to populate a cache under ~/.cache/ms-playwright (or point SITECRAFT_BROWSERS_PATH at an existing one)."
}

# Prints the ffmpeg binary to use, or dies.
sitecraft_resolve_ffmpeg() {
  if [ -n "${SITECRAFT_FFMPEG:-}" ]; then
    [ -x "$SITECRAFT_FFMPEG" ] || sitecraft_die "SITECRAFT_FFMPEG=$SITECRAFT_FFMPEG is not executable"
    echo "$SITECRAFT_FFMPEG"
    return 0
  fi
  if command -v ffmpeg >/dev/null 2>&1; then
    command -v ffmpeg
    return 0
  fi
  sitecraft_die "no ffmpeg found. Set SITECRAFT_FFMPEG=/path/to/ffmpeg or put ffmpeg on PATH."
}
