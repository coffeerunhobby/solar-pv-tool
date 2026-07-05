# Mobile packaging — Capacitor spike (v1.2.1)

Status: **feasibility proven, native build not produced here.** The SPA runs unmodified inside a
Capacitor webview; the Android platform is fully scaffolded and the web bundle is copied into it.
The only thing standing between this repo and an installable `.apk`/`.ipa` is native toolchains that
this build machine (macOS 12.7, Node 20, no JDK, no Android SDK, Command-Line-Tools only — no Xcode)
does not have. Everything that *can* be validated in a browser has been.

## Why Capacitor (not React Native / Flutter)

The SPA migration (v1.2.0) was chosen partly to keep this option cheap. Capacitor wraps the **existing
built SPA** in a native WebView — no rewrite, no second codebase. React Native / Flutter would be a
full rewrite of every page + the whole classic-script engine layer. Capacitor's app IS `app/dist/`.

## What the spike proved (all green)

- **Webview routing works.** Capacitor serves `webDir` as static files with **no SPA fallback**. In-app
  navigation is History-API `pushState` so it never hits the file server, but a hard cold-start on a deep
  route (`/yield.html`) makes the webview fetch that literal file. Solved exactly like the S3 deploy:
  **every ported route's `.html` is a byte copy of `dist/index.html`** (`scripts/cap-prep.mjs`), so React
  Router boots at any path. Verified by static-serving `dist/` (a no-fallback server == the webview) and
  cold-loading `/yield.html`, `/theory.html`: shell + all 44 engine scripts + css + vendor + data grids +
  hashed React bundle all resolve `200`, `document.body.dataset.page` is set, the route renders.
- **Bundled data works.** The 7 core grids (elevation/kt-global/temp/tl/wind/extremewind + horizon-index)
  load from inside the bundle. **The 6 value grids are bundled OBFUSCATED** (`cap-prep.mjs` runs the same
  block-shuffle + per-block XOR as `deploy.sh`, `obf`-marked; horizon-index stays plain), so the offline APK
  never ships pristine grids — decoded at runtime from the in-memory key blob (`GridObfus.init`). Cost ~+30%
  (~4.6 MB obfuscated vs 3.6 MB plain); total `dist/` ≈ 6 MB. Verified: correct decode in the WebView.
- **Build reality on THIS (Windows) box:** JDK, Android Studio, the full Android SDK and Node are installed,
  so the APK compiles here (`gradlew assembleDebug`) — the macOS "blocked" table below is stale for this
  machine. **Windows `cap sync` gotcha:** it throws `ENOTEMPTY` on stale `android/app/src/main/assets/public`
  + `android/**/build` dirs; workaround `gradlew --stop` + purge those dirs before `cap sync`.
- **`node_modules` on the shared NAS (two-agent, cross-OS).** The repo lives on `\\storage_nas_01\work`
  (mounted W:\ on Windows, Samba on macOS). `node_modules` holds PLATFORM-NATIVE binaries (esbuild/rollup/
  Capacitor + `.cmd` vs shell shims) so the two agents CANNOT share one `app/node_modules`. macOS keeps its
  deps off-share and symlinks (`app/node_modules` XSym → `/Users/user5/.solar-pv-node-mac/node_modules`).
  Windows CANNOT create a symlink/junction on the NAS (`Local NTFS volumes are required` / `Access is denied`),
  so it uses a **rename-swap**: Windows deps live as the real folder **`app/node_modules_win`** and are renamed
  into place as `node_modules` when active (rename is metadata-only → instant, same volume). Both
  `node_modules_win`/`node_modules_mac` are gitignored. Install with **`npm ci`** (never rewrites the lockfile
  → no cross-OS `package-lock.json` churn). Switch commands:
  - **Windows resume** (mac symlink is at `node_modules`): `Remove-Item app/node_modules -Force; Rename-Item app/node_modules_win app/node_modules`
  - **Windows hand-off**: `Rename-Item app/node_modules app/node_modules_win` (then macOS recreates its symlink).
- **The gate works from a non-production origin.** Silent revalidation reached the shared Lambda from
  `localhost` (`OPTIONS → 204`, `POST → 200`) and correctly rejected a bogus key. So the gate endpoint's
  CORS is **not** production-only (unlike `/subscribe`).
- **Android platform scaffolds cleanly.** `npx cap add android` created `app/android/` and copied the web
  bundle (all 20 route shells + css/data/js/vendor) into `android/app/src/main/assets/public/`.

## Architecture: bundled assets + remote API/tiles

The Capacitor bundle is **self-contained for compute, network for the rest**:

| In the bundle (`dist/`) | Fetched from `https://solar.coffeerunhobby.ro` at runtime |
|---|---|
| SPA shell + 19 route shells | Terrain-horizon tiles `data/horizon/<lat>_<lon>.png` (82 MB, lazy, ~50 KB per user location) |
| 44 classic engine scripts, css, vendor | Gate validation (shared Lambda) |
| 7 core data grids (~5 MB) | PVGIS per-string import (user-initiated) |
| favicon.ico, logo.png | Cloud saves / share (paid features) |

`scripts/cap-prep.mjs` stages `/js /css /vendor /data` (minus the horizon-tile dir) + the two root
statics into `dist/` after `vite build`. It reads the PORTED list from `src/ported.js` — same single
source of truth deploy.sh uses — so the mobile route list can never drift from the web one.

## Two packaging modes

- **Bundled (default, `capacitor.config.json` → `webDir: dist`).** Offline-capable for everything except
  the network column above. This is what the spike validated. **Open item (being addressed):** the WebView
  origin is `https://localhost` (Android, `androidScheme: https`) / `capacitor://localhost` (iOS). The gate
  Lambda's CORS allowlist must include these or first-time interactive login fails closed (a stored session
  still passes — silent reval fails open on a network error). That allowlist lives in the **shared Lambda
  (anre-quiz's domain)** — not a change in this repo. The matcher going in there:
  `const LOCALHOST_ORIGIN = /^(https?|capacitor):\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;` (covers all three
  Capacitor/dev origins; `^…(:\d+)?$` anchoring blocks `localhost.evil.com` suffix bypass). The handler must
  echo the matched Origin back in `Access-Control-Allow-Origin` (not `*` with credentials), answer the
  OPTIONS preflight, and set `Vary: Origin`.
- **Remote (`server.url = "https://solar.coffeerunhobby.ro"`).** WebView points at the live site; nothing
  bundled, origin == production so the gate/CORS "just works" today with zero backend change. Downside: a
  thin wrapper (no offline, Apple/Google sometimes reject pure-webview wrappers). Good for a first internal
  build; migrate to bundled once the Lambda CORS is updated.

## Build workflow (on a machine with the toolchains)

```bash
# one-time, per platform
npm --prefix app install
npx --prefix app cap add android      # and/or: cap add ios   (regenerates the gitignored app/android|ios)

# every build
npm --prefix app run cap:sync         # vite build → cap-prep (shell copies + staged assets) → cap sync
npm --prefix app run cap:android      # + cap open android  (opens Android Studio)
# then Android Studio → Run, or:  cd app/android && ./gradlew assembleDebug
```

`app/android/` and `app/ios/` are **gitignored** (regenerable, ~7 MB of generated Gradle scaffold) —
only `capacitor.config.json` + `scripts/cap-prep.mjs` + the npm scripts are tracked.

## Blocked in THIS environment (what to install to finish)

| Need | For | Status here |
|---|---|---|
| **JDK 17** | `gradlew assembleDebug` | **INSTALLED** — Temurin 17.0.19 at `~/.jdks/jdk-17.0.19+10` (symlinked into `~/Library/Java/JavaVirtualMachines/`, `JAVA_HOME` wired in `~/.zshrc` via `/usr/libexec/java_home -v 17`). NB: `brew install openjdk@17` FAILS on macOS 12 — Homebrew has no bottle for it and source-builds need full Xcode; use the prebuilt Adoptium tarball instead. |
| **Android SDK** (cmdline-tools or Android Studio) | Android build + emulator | absent — the next (and last) blocker for an APK |
| **Xcode + CocoaPods** (`sudo gem install cocoapods`) | iOS build | absent (Command-Line-Tools only). This box is a **Late-2014 Mac mini (Macmini7,1) stuck on macOS 12.7** (can't upgrade past Monterey → 2018+ mini needed). Max Xcode here is **14.2 / iOS 16 SDK** → LOCAL/Simulator iOS builds only. The App Store now requires Xcode 16 / iOS 18 SDK → **iOS distribution is impossible from this Mac**; do it on an Apple-Silicon / 2018+ / cloud Mac (regenerate `ios/` via `cap add ios` there). |
| Capacitor 8 CLI | latest | not usable — needs Node ≥ 22 (this repo runs Capacitor **7**, Node-20 compatible; pinned in `app/package.json`) |

The scaffold, asset copy, and config are all done. Android now builds on the Windows box (JDK + full SDK).
iOS distribution needs a Mac running current Xcode (Apple-Silicon / 2018+ Intel / cloud runner) — this
2014 mini can only do local/Simulator iOS builds (Xcode 14.2 ceiling). Nothing in this repo blocks either.

## Follow-ups (not this spike)

- Add `https://localhost` + `capacitor://localhost` to the shared gate Lambda CORS allowlist (bundled mode).
- App icon / splash from `assets/designed-icon.png` (Capacitor `@capacitor/assets`).
- Optional: pre-seed a few horizon tiles for a chosen launch region so mountains shade offline.
- Vite code-splitting to trim the 500 KB main chunk (cosmetic; fine over local bundle load).
