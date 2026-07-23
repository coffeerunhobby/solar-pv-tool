#!/usr/bin/env bash
# deploy.sh — Deploy Solar PV Tool to AWS S3 + CloudFront
#
# Skips files whose local MD5 matches the S3 ETag (no unnecessary uploads).
# Requires: AWS CLI configured  (aws configure)
# Run from project root:  ./deploy.sh
#
# TODO: obfuscate string-ui.js at deploy time (protect MODULE_LIST from scraping).
#   Build the obfuscated artifact into /tmp before uploading; keep local copy plain.
#   npx javascript-obfuscator js/string-ui.js --output /tmp/string-ui-obf.js \
#       --string-array true --string-array-encoding rc4
#   Then upload /tmp/string-ui-obf.js in place of js/string-ui.js.
#   No sourcemap — debugging happens locally. Do NOT obfuscate gate.js (gate must run first).

set -euo pipefail

BUCKET="solar-pv-tool"
CF_DIST="E1UY0TUQX490EN"
REGION="eu-central-1"
ROOT="$(cd "$(dirname "$0")" && pwd)"

TTL_HTML="no-cache"                  #  always revalidate — new deploys show on next reload, no 5-min stale HTML on mobile (assets stay long-cached + ?v= busted)
TTL_JS="max-age=86400,public"        #  1 day  — busted by ?v= in index.html
TTL_DATA="max-age=2592000,public"    # 30 days — grids are immutable once generated
TTL_ICO="max-age=604800,public"      #  7 days

CHANGED=0   # track whether any file was actually uploaded (for invalidation)

# md5 helper — works on macOS (md5 -q) and Linux (md5sum)
_md5() { md5 -q "$1" 2>/dev/null || md5sum "$1" | cut -d' ' -f1; }

# Upload only if local MD5 ≠ remote ETag
smart_cp() {
  local src="$1" key="$2" ttl="$3" ctype="$4"
  local local_md5 remote_etag
  local_md5=$(_md5 "$src")
  remote_etag=$(aws s3api head-object \
    --bucket "$BUCKET" --key "$key" --region "$REGION" \
    --query 'ETag' --output text 2>/dev/null | tr -d '"' || echo "missing")
  if [ "$local_md5" = "$remote_etag" ]; then
    echo "      – $key"
    return
  fi
  aws s3 cp "$src" "s3://$BUCKET/$key" \
    --cache-control "$ttl" --content-type "$ctype" --region "$REGION"
  echo "      ✓ $key"
  CHANGED=1
}

echo "==> Solar PV Tool — s3://$BUCKET (CF: $CF_DIST)"
echo

# ── SPA build (app/ — React+Vite shell for the PORTED routes) ────────────────
# PORTED routes: each entry's .html key on S3 is a COPY of the built SPA shell
# (same URL, no CloudFront changes). MUST match app/src/ported.js (the router's
# registry) — checked below. Unported pages keep their legacy smart_cp lines;
# when a page ports, move it here and DELETE its legacy line + the file from git.
PORTED=( index theory batteries inverters modules recalc consumption obstacles components strings connections protections economics wind report mounting yield schema defectoscopy pt )

echo "[0/4] SPA build (app/)"
npm --prefix "$ROOT/app" run build   # fail deploy on build failure (set -e)
for p in "${PORTED[@]}"; do
  grep -q "'/$p.html'" "$ROOT/app/src/ported.js" || {
    echo "!! deploy PORTED contains '$p' but app/src/ported.js does not — aborting"; exit 1; }
  grep -q "assets/index-" "$ROOT/app/dist/index.html" || {
    echo "!! app/dist/index.html has no hashed asset ref — bad build, aborting"; exit 1; }
done
# reverse: every route ported in app/src/ported.js must ALSO be in PORTED above,
# else it works locally but never gets its S3 shell object created. Exclude the
# intentional '/' (root object) and '/app-pilot.html' (dev-only, never deployed).
while IFS= read -r name; do
  case "$name" in app-pilot|'') continue;; esac
  printf '%s\n' "${PORTED[@]}" | grep -qxF "$name" || {
    echo "!! app/src/ported.js has '/$name.html' but deploy PORTED does not — aborting"; exit 1; }
done < <(grep -oE "'/[a-z0-9-]+\.html'" "$ROOT/app/src/ported.js" | sed "s#'/##; s#\.html'##")
# shell must never double-load the legacy chrome/gate (replaced by React)
if grep -qE 'js/(gate|site-nav|app)\.js' "$ROOT/app/dist/index.html"; then
  echo "!! SPA shell references gate.js/site-nav.js/app.js — double-load guard, aborting"; exit 1
fi
echo

# ── HTML + favicon ────────────────────────────────────────────────────────────
echo "[1/4] HTML"
# SPA shell at each ported route path (no-cache, like all HTML)
for p in "${PORTED[@]}"; do
  smart_cp "$ROOT/app/dist/index.html" "$p.html" "$TTL_HTML" "text/html; charset=utf-8"
done
smart_cp "$ROOT/pay.html"          "pay.html"          "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/pay-test.html"     "pay-test.html"     "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/subscribe.html"    "subscribe.html"    "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/unsubscribe.html"  "unsubscribe.html"  "$TTL_HTML" "text/html; charset=utf-8"
# batteries.html + theory.html PORTED to the SPA (shell copies uploaded above)
smart_cp "$ROOT/elevationViz.html" "elevationViz.html" "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/tlViz.html"        "tlViz.html"        "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/ktViz.html"        "ktViz.html"        "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/tempViz.html"      "tempViz.html"      "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/windViz.html"      "windViz.html"      "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/extremeWindViz.html" "extremeWindViz.html" "$TTL_HTML" "text/html; charset=utf-8"
smart_cp "$ROOT/favicon.ico"            "favicon.ico"            "$TTL_ICO"  "image/x-icon"
smart_cp "$ROOT/logo.png"              "logo.png"              "$TTL_ICO"  "image/png"

# ── Vendor (self-hosted, avoids CDN dependency) ───────────────────────────────
echo "[1b/4] Vendor"
smart_cp "$ROOT/vendor/bootstrap.min.css"        "vendor/bootstrap.min.css"        "max-age=31536000,public,immutable" "text/css; charset=utf-8"
smart_cp "$ROOT/vendor/bootstrap.bundle.min.js"  "vendor/bootstrap.bundle.min.js"  "max-age=31536000,public,immutable" "application/javascript; charset=utf-8"
smart_cp "$ROOT/vendor/chart.umd.js"             "vendor/chart.umd.js"             "max-age=31536000,public,immutable" "application/javascript; charset=utf-8"
smart_cp "$ROOT/vendor/leaflet.js"  "vendor/leaflet.js"  "max-age=31536000,public,immutable" "application/javascript; charset=utf-8"
smart_cp "$ROOT/vendor/leaflet.css" "vendor/leaflet.css" "max-age=31536000,public,immutable" "text/css; charset=utf-8"
smart_cp "$ROOT/vendor/images/marker-icon.png"    "vendor/images/marker-icon.png"    "max-age=31536000,public,immutable" "image/png"
smart_cp "$ROOT/vendor/images/marker-icon-2x.png" "vendor/images/marker-icon-2x.png" "max-age=31536000,public,immutable" "image/png"
smart_cp "$ROOT/vendor/images/marker-shadow.png"  "vendor/images/marker-shadow.png"  "max-age=31536000,public,immutable" "image/png"

# ── SPA assets (hashed filenames → immutable, never needs invalidation) ──────
echo "[1b/4] SPA assets"
if aws s3 sync "$ROOT/app/dist/assets/" "s3://$BUCKET/assets/" --region "$REGION" \
     --cache-control "max-age=31536000,public,immutable" --size-only \
     | grep -q upload; then CHANGED=1; echo "      ✓ assets synced"; else echo "      – assets unchanged"; fi

# ── CSS ───────────────────────────────────────────────────────────────────────
echo "[2/4] CSS"
smart_cp "$ROOT/css/style.css"    "css/style.css"    "$TTL_JS" "text/css; charset=utf-8"   # single merged stylesheet (was style + site-nav + viz)

# ── JS ────────────────────────────────────────────────────────────────────────
echo "[3/4] JS"
JS_FILES=(
  canvas.js
  config.js
  constants.js
  convention.js
  data-loader.js
  electricity-prices.js
  elevation-png.js
  elevation.js
  explain.js
  catalog.js
  grid-deshuffle.js
  i18n.js
  i18n_en.js
  i18n_ro.js
  iec-symbols.js
  mounting-svg.js
  panel-svg.js
  pt-doc.js
  pt-text-ro.js
  pt-text-en.js
  share.js
  irradiance-hofierka.js
  irradiance-ineichen.js
  kt-grid.js
  kt-png.js
  horizon-grid.js
  horizon-png.js
  map.js
  obstacles.js
  planes.js
  project-state.js
  schema-svg.js
  site-map.js
  site-nav.js
  viz-basemap.js
  solar-geometry.js
  string-ui.js
  battery-list.js
  temp-grid.js
  temp-png.js
  theme.js
  tl-grid.js
  tl-png.js
  wind-png.js
  extremewind-png.js
  wind-grid.js
  formulas.js
  yield-engine.js
)
for f in "${JS_FILES[@]}"; do
  smart_cp "$ROOT/js/$f" "js/$f" "$TTL_JS" "application/javascript; charset=utf-8"
done

# ── Data grids ────────────────────────────────────────────────────────────────
# Only files the browser fetches at runtime. Source .bin files stay local.
# Uncomment tl1.png / temp1.png once generation is done and config.js is updated.
echo "[4/4] Data"
DATA_FILES=(
  # The 7 grids the browser fetches at runtime (zopfli-recompressed). The old kt1.png base, the .bin
  # sources, and the 5°/0.5° backups (elevation05/temp5/tl5/wind5) were removed entirely - the Kt
  # builders now fill sea/no-data cells from kt-global itself (CLARA is global, no gaps).
  "elevation.png"    # 0.1°×0.1° ETOPO2022 elevation        745 KB
  "kt-global.png"        # 0.25° CLARA-A3 GLOBAL Kt base, PVGIS-de-biased (runtime base; only Kt grid now)   2.2 MB
  # kt-europe-01.png DROPPED for load time (KT_TILES emptied in config.js once the base was de-biased)
  "temp1.png"        # 1°×1°    NASA POWER monthly temp      120 KB
  "tl1.png"          # 1°×1°    Linke turbidity (ghiFull)    150 KB
  "wind1.png"        # 1°×1°    NASA POWER wind speed WS2M    255 KB
  "extremewind1.png" # 0.1°×0.1° global vb,0 (normalised, multi-standard)   94 KB
  "horizon-index.png" # tiny global bitmask of which 1° terrain-horizon tiles exist (no-404 pre-filter)  ~1 KB
)
# Obfuscate the value grids (scraping deterrent: block-shuffle + per-block XOR, see
# js/grid-deshuffle.js) into a staging dir; the browser loaders reverse it via the
# tEXt 'obf' marker. horizon-index.png stays plain (trivial bitmask). Deterministic
# output → smart_cp's MD5-vs-ETag change detection still works. Local data/ stays pristine.
OBF_DIR="$ROOT/.deploy-grids"
OBF_GRIDS=( elevation.png kt-global.png temp1.png tl1.png wind1.png extremewind1.png )
echo "  obfuscating ${#OBF_GRIDS[@]} value grids (block-shuffle + XOR)…"
node "$ROOT/scripts/shuffle-grids.cjs" --dir "$ROOT/data" "$OBF_DIR" "${OBF_GRIDS[@]}"

for f in "${DATA_FILES[@]}"; do
  if [ -f "$OBF_DIR/$f" ]; then
    smart_cp "$OBF_DIR/$f" "data/$f" "$TTL_DATA" "image/png"     # obfuscated grid
  else
    smart_cp "$ROOT/data/$f" "data/$f" "$TTL_DATA" "image/png"   # plain (horizon-index)
  fi
done

# ── Terrain-horizon tiles: a GROWING folder (data/horizon/<lat>_<lon>.png), lazy-loaded per location.
#    Synced as a directory (not enumerated) so new mountain tiles ship without editing this script. ──
if [ -d "$ROOT/data/horizon" ] && compgen -G "$ROOT/data/horizon/*.png" > /dev/null; then
  echo "  syncing data/horizon/ (terrain-horizon tiles)…"
  # NOTE: --size-only skips a same-byte-size content change (rare for these PNGs;
  # dropping it re-uploads all ~80 MB by mtime every deploy — deliberate tradeoff).
  # Set CHANGED only when the sync actually uploaded/deleted something, so a no-op
  # deploy does not trigger a CloudFront invalidation.
  hz=$(aws s3 sync "$ROOT/data/horizon/" "s3://$BUCKET/data/horizon/" --region "$REGION" \
    --exclude "*.bak" --exclude ".*" \
    --cache-control "$TTL_DATA" --content-type "image/png" --size-only)
  [ -n "$hz" ] && printf '%s\n' "$hz"
  printf '%s\n' "$hz" | grep -qE '^(upload|delete):' && CHANGED=1
fi

# ── Equipment catalog (data/db): content-hashed IMMUTABLE json + a short-cache manifest.
#    Adding a panel = edit the seed → `node scripts/build-db-json.cjs` → deploy (no APK rebuild).
#    The hashed files never need invalidation (filename changes on content change); ONLY the
#    manifest is short-cached + invalidated. Old unreferenced hashed files are pruned from S3. ──
if [ -d "$ROOT/data/db" ] && [ -f "$ROOT/data/db/manifest.json" ]; then
  echo "  syncing data/db/ (equipment catalog)…"
  # hashed registry files → immutable, long cache (manifest handled separately below)
  db=$(aws s3 sync "$ROOT/data/db/" "s3://$BUCKET/data/db/" --region "$REGION" \
    --exclude "manifest.json" --exclude "*.bak" --exclude ".*" \
    --cache-control "public,max-age=31536000,immutable" --content-type "application/json" --size-only)
  [ -n "$db" ] && printf '%s\n' "$db"
  printf '%s\n' "$db" | grep -qE '^(upload|delete):' && CHANGED=1
  # manifest → short cache + revalidate (the freshness checker). Only re-upload +
  # mark CHANGED when its CONTENT differs from the deployed one — a plain cp always
  # uploads, which would mark CHANGED and invalidate on EVERY (even no-op) deploy.
  remote_mf=$(aws s3 cp "s3://$BUCKET/data/db/manifest.json" - --region "$REGION" 2>/dev/null || true)
  if [ "$remote_mf" != "$(cat "$ROOT/data/db/manifest.json")" ]; then
    aws s3 cp "$ROOT/data/db/manifest.json" "s3://$BUCKET/data/db/manifest.json" --region "$REGION" \
      --cache-control "max-age=60,must-revalidate" --content-type "application/json" >/dev/null && CHANGED=1
  fi
  # prune remote hashed files not referenced by the current manifest (prevents growth;
  # the manifest's 60 s TTL + invalidation makes a stale-pointer 404 window negligible)
  # cd + relative require so it works on both macOS and Windows/Git-Bash (Node-for-Windows
  # can't resolve a Git-Bash-style "$ROOT" like /w/solar-pv; a relative path resolves from cwd).
  KEEP=$(cd "$ROOT/data/db" && node -e "const m=require('./manifest.json');console.log(['manifest.json'].concat(Object.values(m.files)).join('\n'))")
  aws s3 ls "s3://$BUCKET/data/db/" --region "$REGION" | awk '{print $4}' | while read -r obj; do
    [ -z "$obj" ] && continue
    if ! printf '%s\n' "$KEEP" | grep -qxF "$obj"; then
      aws s3 rm "s3://$BUCKET/data/db/$obj" --region "$REGION" >/dev/null && echo "    pruned old catalog file $obj"
    fi
  done
fi

# ── CloudFront invalidation — only if something actually changed ──────────────
echo
if [ "$CHANGED" -eq 1 ]; then
  echo "==> Invalidating CloudFront $CF_DIST …"
  # MSYS_NO_PATHCONV=1: on Git Bash (Windows) MSYS rewrites leading-slash args like
  # "/js/*" into Windows paths (C:/Program Files/Git/js/*) before aws sees them, so
  # CloudFront rejects them ("invalid invalidation paths"). Harmless on macOS/Linux.
  MSYS_NO_PATHCONV=1 aws cloudfront create-invalidation \
      --region us-east-1 \
      --distribution-id "$CF_DIST" \
      --paths "/index.html" "/pay.html" "/pay-test.html" "/subscribe.html" "/unsubscribe.html" "/inverters.html" "/modules.html" "/batteries.html" "/theory.html" "/strings.html" "/obstacles.html" "/consumption.html" "/yield.html" "/recalc.html" "/connections.html" "/protections.html" "/economics.html" "/defectoscopy.html" "/schema.html" "/wind.html" "/report.html" "/pt.html" "/components.html" "/mounting.html" "/favicon.ico" "/logo.png" "/css/style.css" "/js/*" "/data/kt-global.png" "/data/horizon/*" "/data/horizon-index.png" "/data/db/manifest.json" "/elevationViz.html" "/tlViz.html" "/ktViz.html" "/tempViz.html" "/windViz.html" "/extremeWindViz.html" \
      --query 'Invalidation.{Id:Id,Status:Status}' \
      --output table
else
  echo "==> No files changed — CloudFront invalidation skipped."
fi

echo
echo "==> Done → https://solar.coffeerunhobby.ro"
