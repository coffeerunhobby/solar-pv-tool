# CHANGELOG — Solar Path & Yield Tool

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.11] - Planșa IE004 (TE-CC board) + protecția muncii/mediu chapters + DC section picker

- **Two new PT chapters, closing course pts 21 + 22** - both were entirely absent (zero occurrences of
  PSI / protecția muncii / protecția mediului anywhere in the document):
  - **MĂSURI DE PROTECȚIA MUNCII ȘI PSI** - legal framework (L319/2006, HG1425/2006, HG1146/2006,
    HG1048/2006, HG1091/2006, L307/2006, P118, I7/2011), then the risks that are SPECIFIC to PV and are
    routinely missed: DC parts are permanently live and cannot be de-energised by disconnection; a DC arc
    has no zero crossing and does not self-extinguish (so connectors must never be pulled under load);
    work at height; module handling as a sail; isolation + lock-off. Fire section: powder/CO₂ only, never
    water on live parts, DC-source labelling at the board and inverter, PV presence signposted for
    emergency responders.
  - **MĂSURI PENTRU PROTECȚIA MEDIULUI** - operation (no emissions/effluent/waste, negligible noise),
    execution (selective waste collection per L211/2011), end of life (modules and inverters under the
    WEEE regime, OUG 5/2015, manufacturer take-back; batteries handled separately), closing on
    OUG 195/2005. The intro substitutes the project's own estimated CO₂ saving.
  - Both are NORMATIVE text, deliberately rendered UNCONDITIONALLY (a PT always needs them), unlike the
    computed Protecții / Analiză economică chapters which appear only when their step has data - so
    chapter numbering adapts correctly either way. Verified RO + EN, no unresolved placeholders.
  - **Not added: the Gantt / execution schedule** (the remaining part of course pt. 20) - per request.
    Note pt. 20 is otherwise already covered: PIF verifications in the *Teste* chapter and the
    installation stages in *Faze determinante*.

- **Conexiuni: manual DC cable section picker** next to "Secțiune recomandată" - a per-string dropdown
  (2,5 / 4 / 6 / 10 mm²) for the cable actually being installed. The recommendation stays visible; the
  CHOSEN section drives R, ΔU and ΔP, and a pick below the recommendation flags the card as a warning
  instead of being silently accepted. Persisted as `connections.sections = {stringId: mm²}`, and the
  stored loss/section data now carries the chosen value, so the parts list and the PT quote the real
  cable. (The existing "Pierdere tensiune max. DC (%)" input also moves the computed section, but it is
  a single GLOBAL design criterion - it cannot differ per string, and steering it to back into a desired
  section misstates the criterion actually designed to.)
  Verified: choosing 2,5 mm² on a 25 m string → R 0.179 Ω, ΔP 63.0 W (vs 39.4 W at the recommended
  4 mm²), warning shown, value persisted.
- **Section range extended to the full industry series**: the picker now offers
  1,5 / 2,5 / 4 / 6 / 10 / 16 / 25 / 35 / 50 / 70 / 95 / 120 / 150 / 185 / 240 mm², and `STD_CROSS`
  (auto sizing) reaches 240 mm² instead of stopping at 50.
  - `AMP_DC` was extended to match, so the ampacity check stays meaningful across the whole range
    instead of silently degrading above 25 mm². **The existing 2,5-25 mm² entries are UNCHANGED**, so no
    current design shifts; 1,5 and 35-240 mm² continue the same conservative series. These remain
    APPROXIMATE reference values (as the table already was) - grouping, ambient temperature and laying
    method move them substantially, so they must be checked against the cable datasheet and the real
    installation method before a design is issued.
  - ⚠ `STD_CROSS` deliberately still STARTS at 2,5: it feeds the AUTO sizing, and adding 1,5 there would
    have let AC circuits auto-select 1,5 mm² where they previously floored at 2,5 (the DC path floors at
    4 mm² regardless). 1,5 mm² stays available only as a MANUAL pick, where an under-sized choice is
    flagged.

- **Planșa IE004: TE-CC combiner-board drawing (new shared PanelSVG engine).**
- **New shared engine `js/panel-svg.js` (`window.PanelSVG`)** — a device-layout drawing of the DC
  combiner board TE-CC, on the SAME cartouche zone-grid as the single-line schematic (same 1480×940
  geometry, 0-9 column ruler, A-H rows, faint cell grid, data-bound title block). Third member of the
  shared-drawing family alongside `schema-svg.js` and `mounting-svg.js`.
- **DATA-BOUND, one row per PV string** — `PanelSVG.buildDC()` reads `Project.section('strings')` for the
  row count/labels and `protections.dc` (persisted by the Protecții step) for each string's gPV fuse rating
  and SPD Uc. Each row draws a 2-pole switch-disconnector **Q** (SB216PV diagonal poles: pins 1/3 on top,
  4/2 on bottom - `+` enters pin 1 and exits pin 2, `−` enters pin 3 and exits pin 4, with the downstream
  crossover shown), a per-pole gPV fuse pair **F**, and a 3-terminal Type-2 surge arrester **SPD** (shunt:
  `+`/`−` in, `PE` out to an IEC earth symbol). Uniform terminal pads; red `+` / black `−` / green PE.
- **Fills the empty Planșa IE004** (`Schemă monofilară TE-CC`) in the Proiect Tehnic - a bare rotated
  landscape plate carrying its own cartouche (title cell stamped "Planșa IE004"), emitted in borderou
  order next to IE002. Falls back to the "se anexează" placeholder + a pre-flight entry when there are no
  strings. The document now DRAWS three plates (IE002 / IE004 / IE005); IE001 + IE003 remain placeholders.
- **Live preview on the Conexiuni step** (`Connections.jsx`) - a "Tablou de curent continuu (TE-CC)" card
  renders the same drawing from the same persisted data, so the board and the PT plate can never disagree.
  Labels `cx.panel_dc`/`cx.panel_none` (RO/EN).

## [1.2.10] - PT: Protecții + Analiză economică chapters, conductor power losses

- **Protecții step now persists what it selects** (`protections.dc` = per string
  `{label,ns,np,isc,imp,lo,hi,fuse,inWin,required,iprodFV,ucDc}`): the course relation-(20)
  selection was computed inline inside the render loop and thrown away. Extracted into a pure
  `dcProtectionFor()` and written on every visit (deep-equality guarded), so the upcoming PT
  "Protecții" chapter and the parts list can quote the window bounds, the chosen gPV fuse and the
  verdict without re-deriving them. Same pattern as `acLinesFor()` and `sizeString()`.
  Verified: window [16.59, 25] A with the 25 A module max-series-fuse binding the upper term →
  gPV 20 A in-window; `required` false for a single string, true at 2 parallel; SPD Uc 1200 V ≥ 1100 V.
- **NEW PT chapter "PROTECȚII ȘI APARATAJ DE COMUTAȚIE"** (course pt. 16) - inserted as cap. 7, so the
  following chapters renumber. Per string: Isc, 1,25·Imp, the relation-(20) window bounds, the chosen
  gPV fuse, whether it is mandatory (only with ≥2 parallel strings) and the in-window verdict; then the
  fuse/disconnector Un ≥ Vmax,inv and DC SPD Uc notes. Per inverter: I inv,ca, breaker In and the
  In ≥ I inv,ca check, plus the RCD type, AC SPD and breaking-capacity notes. All values are READ from
  `protections.dc` + `connections.ac` - the document re-derives nothing.
- **Conductor power losses (course pt. 15, rel. (21)-(23)) are now computed and documented.** They did
  not exist anywhere before: `Connections.jsx` had the conductor resistance R and the voltage drop, but
  never ΔP. Now computed per segment (DC per string, AC per inverter), summed, expressed as a % of the
  nominal DC/AC power, persisted as `connections.losses`, and rendered as a table + totals in ANEXA 1.
  > ⚠ Caught during verification: the three-phase loss initially reused the voltage-drop coefficient
  > (√3, line-to-line) instead of the loss coefficient (3 loaded conductors), under-reporting every
  > three-phase conductor loss by ~42%. Now `lossFactor = ph === 3 ? 3 : 2`, hand-checked
  > (3 × 0.0859 Ω × 14.43² = 53.70 W).
  > The **global electrical efficiency** the course asks for additionally needs the inverter conversion
  > efficiency, and `INVERTER_LIST` has **no `eta` field** - so only the conductor losses are stored and
  > a note states the combination explicitly. Adding `eta` (226 rows) is a datasheet scrape like `maxfuse`.
- **NEW PT chapter "ANALIZĂ ECONOMICĂ"** (course pt. 19) - cap. 11. The **designed** system and the
  **optim** reference system (pt. 18, azimuth 0 + optimal tilt) side by side: annual yield,
  self-consumed / injected energy, self-consumption rate, annual benefit B, investment, payback Tr,
  IRR and NPV, then a verdict comparing IRR against the discount rate. The economics step already had
  all the math in pure closures (`selfConsumed` 4-mode model, `benefit`, `payback`, `rir` bisection,
  `vna`) and already assembled the result object - it simply was not persisted, so `render()` now
  writes `economics.results` (deep-equality guarded) and the document reads it. **No math was
  duplicated or re-derived.**
  Verified end to end: B = 4800×1.30 + 7200×0.65 = 10 920 RON, Tr = 45 000/10 920 = 4.12 yr,
  IRR 23.93 % > 7 % → positive verdict; optim variant 3.86 yr / 25.61 %.
- **Still absent** vs the Neamț template: pts 20-22 (Gantt / organizare șantier, protecția muncii + PSI,
  protecția mediului) - pure normative text, no computation needed - and the `eta` inverter field
  required for the global electrical efficiency.

## [1.2.9] - Proiect Tehnic: breviar de calcul + chapter 6 sections + 2 new equipment rows

- **ANEXA 1 now contains a real "Breviar de calcul - dimensionarea șirurilor"**: PER STRING, each §11
  relation is printed as **formula → numeric substitution → result** (Tc,min, Tc,max, Voc,max, Vmp,min,
  Isc,max, Imp,max, Voc,șir), followed by the Ns,min/Ns,max window against the adopted Ns/Np and an
  explicit **verdict** checking Voc,șir ≤ Umax,cc and the MPPT current limits. A failing configuration
  renders in red. This is what a verifier needs to re-check the sizing by hand.
- **`sizeString()` extracted into `js/string-ui.js` as the single source of truth for the §11 math.**
  It was previously implemented TWICE - inside the DOM-bound `calcString()` and again inline in
  `app/src/pages/Theory.jsx` - so a formula change could silently drift between the app and the document.
  Now `calcString()`, `Theory.jsx` and `pt-doc.js` all call the one pure function (no DOM, no state:
  inputs in, all derived values + the eq.13/eq.14 verdicts out).
  **Verified behaviour-preserving**: the extracted function was diffed against the original inline
  formulas over 3,000 randomized input sets × 22 outputs - identical on every one. Strings page and
  Teorie page re-verified in the browser (both now report Voc,max = 51.13 V for the same project).
- **`fnum4()` added to pt-doc.js** for values where 2 dp collapses the information. The breviar's
  substitution lines print temperature coefficients at 4 dp: βVoc = -0.265 %/°C was rendering as
  "-0.27", so hand-checking the printed substitution gave 51.22 V while the printed result said
  51.13 V. The displayed arithmetic now reproduces the displayed result (dev-guide typography rule).

## [1.2.9] - Proiect Tehnic: chapter 6 sections + LONGi Hi-MO 5m LR5-66HPH-515M

- **New module: LONGi Hi-MO 5m LR5-66HPH-515M (515 W)** - 132 half-cut cells (6×22), 9-busbar,
  MlO gallium-doped PERC, monofacial, 2094×1134×35 mm, 26.0 kg. Values read from the OFFICIAL
  LONGi datasheet "LR5-66HPH 495~515M" (515M column), not estimated: Voc 46.00 V, Isc 14.13 A,
  Vmp 38.83 V, Imp 13.27 A, γPmax −0.34 %/°C, TC(Voc) −0.265 %/°C, TC(Isc) +0.05 %/°C, NMOT 45 °C,
  max series fuse 25 A, efficiency 21.7 %. Cross-checked: Vmp×Imp = 515.3 W ≈ Pmax, and the
  efficiency implied by the dimensions (21.69 %) matches the datasheet's 21.7 %.
  Catalog regenerated → **120 modules**.
  > ⚠ The request named "LR5-66HTH-515M", which **does not exist**: the HTH series (Hi-MO X6
  > Explorer, HPBC) datasheet is 520~540M and comparepv lists 415-440 / 520-585 W for it - no 515 W
  > variant. The real LONGi 66-cell 515 W module is the **HPH** (Hi-MO 5m, PERC) one added here.
  > It is absent from comparepv, so it carries no `cpv` flag.
- **New inverter: Huawei SUN2000-10K-MAP0 (10 kW)** - three-phase hybrid Smart Energy Controller,
  LUNA2000-S0/S1 compatible. Values from the OFFICIAL Huawei datasheet "SUN2000-5/6/8/10/12K-MAP0"
  (v02-202406, 10K column): max DC input 1100 V, MPPT range 160-1000 V, rated 600 V, 16 A per MPPT,
  22 A max short-circuit, 2 MPP trackers, 10,000 W AC, 98.6 % max efficiency, recommended max PV 18 kWp.
  > ⚠ That datasheet lists a SECOND "operating voltage range 600~980 V" under **Input (DC Battery)** -
  > it is the LUNA2000 battery window, NOT the PV MPPT range. Recording it as the MPPT range would have
  > silently broken every string-sizing calculation using this inverter.
- Catalog regenerated after both additions → **manifest v5: 120 modules, 226 inverters**. Only the changed
  registry got a new hashed file (modules kept `modules.a6c97c2b.json`), so devices re-download just the
  inverter list - the partial-sync design working as intended. Both reach existing installs via the
  catalog sync **without an app release**.

## [1.2.9] - Proiect Tehnic: chapter 6 gains the missing "Date tehnice de intrare" section

- **6.1 DATE TEHNICE DE INTRARE was missing from the document** - the heading text existed in both
  `pt-text-ro.js` and `pt-text-en.js` (`prezentare.sIntrare`) but `pt-doc.js` never rendered it, so the
  whole section silently never appeared. Benchmarked chapter 6 against a real-world PTh memoriu; this
  was the largest gap. Now rendered as the FIRST sub-section of chapter 6 (everything after it renumbers).
- Contents, all AUTO-FILLED (no new input): a parameter/value table with **Pi (module fotovoltaice)**
  [Σ module pmax], **Pi (invertoare)** [Σ inverter pac, W→kW], **Un** [from the racord voltage entered in
  kV], **f = 50 Hz** and **cos φ > 0,99** (fixed grid-compliance statements), followed by the occupied
  area + panel orientation sentence and the "branșamentul nu face obiectul documentației" scope disclaimer.
- **Occupied area comes from the shared `MountingSVG.build()`**, which now also returns the array
  FOOTPRINT (`wide`/`deep`/`area`) - rows × pitch × width INCLUDING the inter-row shading gaps (E-W and
  coplanar rows step by the footprint instead). It is the same extent the top view prints, so the chapter
  figure and the IE005 plate dimension can never disagree (verified: 11.34 × 13.56 m → 154 m²).
- Panel orientation is named as a cardinal direction by a new `orientName()` in pt-doc.js, honouring the
  PVGIS azimuth convention (0 = S, -90 = E, +90 = V). Multi-orientation systems (E-W tents) join their
  distinct names ("E/V") instead of claiming a single direction.
- **New sub-section "CARACTERISTICI TEHNICE INVERTOARE"** (after the string configuration): the MPP-tracker
  window a verifier checks the string sizing against - rated AC power, max DC input voltage, number of MPP
  trackers, MPPT voltage range, max input current and max short-circuit current per MPPT. Values come
  straight from `INVERTER_LIST` (datasheet scrape), so an absent field prints "-" (a database gap) instead
  of the red "[de completat]" user-input marker. **One value column PER INVERTER UNIT** (I1, I2, …), so a
  multi-inverter BOM lists each unit's own specs; a single inverter collapses to a plain "Valoare" column.
- **"Soluția propusă pentru racordare" is now DERIVED, not just free text.** It used to be a bare
  passthrough of the `grid.ptAlimentare` textarea. It now opens with the connection statement (voltage
  level, board, cable material and length), a **per-inverter table** (P c.a. / I c.a. / secțiune /
  disjunctor / ΔU), the common-RCD note, the active-power-limiting paragraph (only for the no-injection
  regime) and a cross-reference to **planșa IE002** — with the engineer's own free text appended for the
  site-specific routing the tool cannot know.
- **The Conexiuni step now PERSISTS what it computes** (`connections.ac` = `[{pac,iac,section,mcb,drop}]`,
  one entry per inverter): its pure AC sizing was lifted out of the HTML builder into `acLinesFor()` and is
  saved in its own effect - deliberately WITHOUT the input-persist effect's first-render skip, so the
  numbers exist even when the engineer only opens the step without editing. This is the same pattern the
  mounting step already used, and it means the PT never re-derives the sizing (no formula drift).
- **The parts list gained the missing amp ratings** as a direct consequence: switchboard rows now read
  "Disjunctor c.a. (MCB) 25 A" with per-rating quantities instead of a bare count.
- Still missing vs the reference memoriu (deliberately deferred, mostly site-survey text the tool cannot
  compute): sub-sections for available surfaces / relief / access + neighbouring relations, climate zone +
  mean temperature, irradiation quoted as H (kWh/m², the engine does not persist it yet), utilities +
  pollution sources, and "situația existentă". The DC string fuse ratings are still not persisted either,
  so the parts list's gPV fuse row remains a count without a rating.

## [1.2.8] - Proiect Tehnic: planșele IE002 + IE005 are now DRAWN (schematic + mounting views)

- **The single-line schematic IS planșa IE002 now.** It used to be emitted as an extra unnamed "lead"
  plate BEFORE the borderou list, while `Schemă monofilară racord (IE002)` sat next to it as an empty
  "se anexează" placeholder - two plates for one drawing. The schematic is now emitted at the IE002
  position inside the borderou loop, so the plates follow the borderou order (IE001 … IE005) and the
  duplicate placeholder is gone (document 22 → 21 pages).
- **The schematic's title block is stamped with the plate id**: new `SchemaSVG.build({plateNo})` renders
  `<codDoc> · Planșa IE002` in the title cell instead of `pag. 1/1`. Standalone (the schema editor and
  its SVG export) is unchanged and still reads `pag. 1/1` - correct there, since the drawing IS its own
  one-page document; inside a 21-page PT it is a numbered plate.

- **`Plan amplasament panouri fotovoltaice` (IE005) is no longer an empty "se anexează" placeholder** —
  it now carries the two to-scale mounting drawings: **Secțiune laterală** (side section, with the
  winter-solstice shading geometry β/α/X/Y/pitch) and **Vedere de sus** (the rows × per-row module grid),
  above the plate's cartouche.
- **New shared engine `js/mounting-svg.js` (`window.MountingSVG`)** — the four to-scale view builders
  (`sideSingle`/`sideAccordion`/`sideFlush`/`planSVG`) extracted verbatim from the mounting step so the
  EDITOR and the PT render ONE drawing (the same single-source-of-truth pattern as `schema-svg.js`).
  `MountingSVG.build()` needs no DOM: it rebuilds both views from `Project.section('mounting')` (which the
  mounting step already persists: tilt/mode/orient/rise/gap/pitch/sunAlt/rows/perRow) plus the string's
  module dimensions. `app/src/pages/Mounting.jsx` now delegates to it (126 lines of duplicated drawing
  code removed; its dead `line`/`arc` helpers dropped).
- Plate labels `planse.viewSide`/`viewPlan`/`noPlan` (RO/EN); the drawing is labelled in the DOCUMENT's
  language via a new `uiTxt()` lookup in pt-doc.js (the `mnt.*` keys live in the UI dictionaries, not
  PT_TEXT). Print-safe ink overrides for the `.svg-*` theme classes in `Pt.css` (they resolve to theme
  vars, which would be invisible on the white A4 sheet).
- Both drawn plates fall back to the "se anexează" placeholder + a pre-flight entry when their source step
  has no data yet; IE005's top view degrades to a note when the mounting area dimensions are missing.
  **IE001** (site plan - needs a map/cadastral export, not a computed drawing), **IE003** (TE-CEF) and
  **IE004** (TE-CC) remain placeholders.

## [1.2.7] - Proiect Tehnic: new "Lista de cantități" chapter (bill of quantities)

- The PT document now generates a **Lista de cantități** chapter (parts list / BoQ) — cap. 9, right after
  the *Faze determinante* chapter. Quantities are **auto-derived from the project**: panels (Σ string
  counts), inverter(s), mounting structure, DC solar cable per polarity (Σ one-way runs from
  `connections.cables` × 1.10 slack), AC cable (`connections.lenAC` × 1.10), MC4 connector pairs
  (2×strings + spares), earthing kit, and the switchboard gear (string gPV fuses for parallel strings,
  DC/AC SPD type 2, DC disconnect, per-inverter MCB, RCD). Grouped into 4 sections (echipamente / instalații
  electrice / echipare tablouri / lucrări civile); the civil-works section is left for manual entry.
- Bilingual (RO/EN) via new `boq.*` keys in `js/pt-text-ro.js` / `js/pt-text-en.js`; rendered by a new
  `chap('boq')` block in `js/pt-doc.js` (reads `Project.get()` for strings/components/connections).
- **Manual rows editor** in the PT form column (`BoqEditor` in `app/src/pages/Pt.jsx`): add / edit / delete
  your own line items (description, unit, qty, section), persisted at `Project.section('boq').rows`
  (`[{cap,um,cant,sec}]`, new state section) and merged into the matching document section — this is how
  the *Lucrări civile* section fills. Debounced live rebuild; `pt.boq*` UI labels in `js/i18n_ro.js` /
  `js/i18n_en.js`.
- First of the three remaining PT feeder chapters (parts list → permits → install plan). Verified via
  Playwright against a 2-string seeded project (36 panels, 48 m/pole DC, 14 m AC, 2 fuses; 22 pages) and
  by adding manual civil rows through the editor (persist + document merge confirmed).

## [1.2.6] - Fix: Proiect Tehnic (PT) page would not scroll

- The PT document page could not be scrolled on screen (desktop) - the whole document was stuck at the
  top. Cause: a stray `*/` inside the `app/src/pages/Pt.css` header comment (in `.pt-*/#pt-*`) closed the
  comment early, so the very next rule (`.pt-scroll { flex:1; overflow-y:auto }`) got an invalid selector and
  was dropped - the scroll container lost its scrolling. Reworded the comment. (Exactly the `*/`-in-comment
  trap the dev guide warns about.) Verified: the container now bounds to the viewport and scrolls.

## [1.2.5] - Add JinkoSolar Tiger Neo JKM590N-72HL4-BDV (590 W)

- New module: **JinkoSolar Tiger Neo JKM590N-72HL4-BDV (590 W)** — N-type TOPCon bifacial dual-glass,
  144 half-cells (72×2), 22.84% eff, 2278×1134×30 mm, 31.0 kg. Datasheet-accurate: Voc 52.9 V, Isc 14.07 A,
  Vmp 44.17 V, Imp 13.36 A, γPmax −0.29 %/°C, NOCT 45 °C (comparepv.com / JKM570-590N-72HL4-BDV datasheet).
- Added to the seed (`MODULE_LIST`) and regenerated the served catalog → **manifest v3, 119 modules**
  (`node scripts/build-db-json.cjs`; new `modules.d57e08fe.json`, old hash pruned; `catalog.js` re-stamped).
  Existing installs pick it up via the catalog sync; this release also refreshes the bundled seed.

## [1.2.4] - Equipment catalog: served JSON + device cache + sync (add a panel with no app release)

- **The module/inverter/battery DB is no longer hardcoded-only.** It was giant const arrays in
  `js/string-ui.js` (95% of that 290 KB file) + `js/battery-list.js`, so adding one panel meant a web
  redeploy AND an APK rebuild. Now the same arrays are ALSO served as a CDN catalog and updated at runtime.
- **CDN model (content-hashed immutable files + one tiny manifest):** `scripts/build-db-json.cjs` exports the
  seed arrays → `data/db/<registry>.<hash>.json` (`Cache-Control: immutable`) + `data/db/manifest.json`
  (`max-age=60, must-revalidate`). A changed registry gets a new hash → new filename; unchanged ones keep
  theirs. deploy.sh uploads them, **invalidates ONLY the manifest**, and **prunes** old unreferenced hashed
  files. Idempotent (unchanged data ⇒ identical hash).
- **Runtime (`js/catalog.js`, precedence seed < cache < remote):** loads after string-ui.js; SYNCHRONOUSLY
  overlays a newer `localStorage` cache at boot (offline-instant), then background-fetches the manifest,
  hash-diffs it, and fetches+applies **only the changed registries** — mutating `MODULE_LIST` / `INVERTER_LIST`
  / `BATTERY_LIST` (+ `*_BRANDS`) **in place** so the DB pages' captured references update. Any failure keeps
  the current data (never bricks). Web = same-origin `fetch`; mobile WebView = `CapacitorHttp` (native, no CORS).
- **Compat contract (no `minAppVersion`):** additive-only, meaning-immutable fields — old app ignores unknown
  keys, new app defaults missing ones. Manifest version bumps only on content change.
- **React:** `app/src/store/useCatalog.js` (`useSyncExternalStore` over `Catalog.onChange`); the DB list
  (`DbShared.useDbList`) + Components/Strings pickers subscribe so a sync hot-updates the visible lists. A
  **"Update equipment catalog"** item (with the live version) added to the account menu.
- **Verified** in a real browser (classic-script harness, no build): synchronous cache overlay, async partial
  sync (only the changed registry fetched — confirmed via network), and no-op when the manifest matches the seed.
- **First panel through the pipeline:** Jinko Tiger Neo 640W (JKM640N-66HL4M-BDV).
- Compat/architecture noted in `memory/project_equipment_catalog_sync`. Follow-up (out of scope): snapshot a
  project's equipment specs at selection so a later catalog edit can't shift an old project's numbers.

## [1.2.3] - Mobile (Capacitor) hardening: offline grids, responsive fixes, in-memory obfuscation key

Shipped from driving the Android build in an emulator (this box has JDK/Android SDK/Studio — the APK
compiles here; MOBILE.md's "blocked" table was macOS-specific). All fixes verified in the emulator and,
for layout, at 375px in the SPA.

- **Offline grids, obfuscated in the bundle.** `app/scripts/cap-prep.mjs` now runs the SAME block-shuffle +
  per-block XOR (`scripts/shuffle-grids.cjs`) over the 6 value grids into the APK bundle, so the offline app
  never ships pristine grids (it used to copy `data/` plain). `horizon-index.png` stays plain. Cost ~+30%
  size (~4.6 MB bundled).
- **Obfuscation key is now an in-memory blob.** `js/grid-deshuffle.js` reworked: the key is an explicit,
  masked+base64 BLOB (256-byte permutation map + 257-byte per-block XOR table) that `GridObfus.init()`
  expands into a module-scope `{perm, xk}` cache ONCE at app open (module load) — the passphrase no longer
  ships. Minted from the v1 key, so `perm`/`xk` are byte-identical → **already-deployed obfuscated grids
  still decode, and S3 grid bytes are unchanged** (only `grid-deshuffle.js` re-uploads). Reconciled with the
  legacy PHP "shuffleizer" key model; the lossy palettize-then-XOR path was deliberately NOT ported (it
  would corrupt the byte-exact measurement grids). Verified: byte-exact round-trip + correct decode of the
  bundled grids in the WebView (== Chromium `atob` path, so the web browser path is proven too).
- **Safe-area / edge-to-edge fix.** Added `viewport-fit=cover` (`app/index.html`) + a top safe-area inset on
  `.site-shell` (`css/style.css`) — the top menu was rendering under the Android status bar and was
  untappable. Also un-breaks the bottom nav over the gesture bar.
- **Viz-map pages reachable in-app.** `cap-prep` now bundles the 6 standalone `*Viz.html` grid-map pages
  (they 404'd in the WebView), and the ⓘ links in Yield/Location + the menu use a platform-aware
  `SmartLink` (new-tab on web, in-place nav in the WebView).
- **Responsive layout fixes** (also benefit mobile web ≤700-820px): DB master-detail pages
  (inverters/modules/batteries) stack instead of crushing the detail pane (`app/src/db/DbPage.css`); wide
  data tables scroll horizontally instead of clipping (`css/style.css`); the PT A4 sheet pans instead of
  clipping (`app/src/pages/Pt.css`); and the nav drawer (z-index 900) no longer paints under the viz-map
  Leaflet layers.

## [1.2.2] - Data-grid obfuscation (scraping deterrent)

- **The value grids are now scrambled on S3.** They were public on CloudFront (`curl data/kt-global.png`
  handed anyone the CLARA/SARAH-derived Kt data cleanly — the gate is JS-only). Each of the 6 value grids
  (kt-global, temp1, tl1, wind1, elevation, extremewind1) is **block-shuffled + per-block-constant XORed**
  at DEPLOY time; the browser loaders reverse it on load. A raw download is now scrambled garbage.
  **This is OBFUSCATION, not encryption** — the key + permutation ship in the JS, so anyone with devtools
  can reverse it; it only deters casual scraping.
- **How:** `js/grid-deshuffle.js` is ONE module (`GridObfus.encode/decode`) shared by the Node build-time
  encryptor and the browser (works as both a CJS `require` and a classic global, so the permutation can't
  drift). Scheme (per "shuffle + constant XOR"): cut the raster into a 16×16 grid of blocks, permute them
  by a key-derived permutation (Fisher-Yates over a deterministic PRNG), XOR each pixel by its block's key
  byte. Both steps are pure permutations/involutions on the raster → **decode∘encode is byte-exact** (the
  pixel value IS the physical measurement; corrupting it would silently degrade the engine).
- **Rollout-safe via a marker.** The obfuscated PNG carries a tEXt `obf` chunk; a loader de-shuffles ONLY
  when it sees the marker, so plain (unmarked) grids pass through untouched — **local dev keeps serving the
  pristine grids**, and the loader change is a no-op until the grids are flipped. `deploy.sh` obfuscates
  into a gitignored `.deploy-grids/` staging dir (deterministic → smart_cp's MD5-vs-ETag still works);
  `data/` stays pristine. `scripts/shuffle-grids.cjs --verify` proves byte-exact round-trip + reports size.
- **Cost:** +25-39% file size (block-shuffle + XOR hurt PNG compression; kt-global 2.1→2.8 MB) — the mild
  end, since constant-XOR was chosen over a full keystream. Not applied to the horizon tiles (82 MB, lazy,
  public-DEM-derived) or horizon-index (trivial bitmask).
- **Verified:** testViz engine-vs-PVGIS numbers are IDENTICAL before/after the swap (Bucuresti 1255/1624,
  Brasov 1198/1531, Cluj 1195/1534, Timisoara 1186/1534), no console errors — the byte-exact guarantee holds
  through the full browser path. Wired into the shell + all 6 grid loaders (kt/temp/tl/wind/elevation/
  extremewind) + the 7 `*Viz` QA pages.

## [1.2.1] - P5 cleanup: dead legacy chrome deleted, docs refreshed

- **Deleted (repo + S3):** `js/gate.js`, `js/app.js`, `js/yield-ui.js`, `js/report-pdf.js` - nothing loads
  them anymore (React owns gate/chrome; yield-ui's helpers are inlined; report-pdf was retired long ago).
  **Kept:** `js/site-nav.js` (the 6 QA-viz pages still use its chrome) and `js/map.js` (lazy-loaded by the
  Location route).
- **Docs refreshed:** README + CONTEXT now describe the real architecture (React SPA over the classic-script
  engine layer; the stale "no build / file://" claims removed). Git history squashed to a single root commit -
  this CHANGELOG is the project history.
- **Capacitor mobile spike (feasibility proven, tooling added — no web-runtime change, so no redeploy).**
  The SPA runs unmodified in a Capacitor 7 WebView (pinned to 7 for Node-20 compat; 8 needs Node ≥ 22).
  `app/capacitor.config.json` (bundled `webDir: dist`, `androidScheme: https`) + `app/scripts/cap-prep.mjs`
  (reads `src/ported.js` — same PORTED source deploy.sh uses — and mirrors `dist/index.html` into every
  route `.html` so deep cold-starts route, then stages `/js /css /vendor /data` minus the 82 MB horizon
  tiles + root statics into the bundle) + npm `cap:prep`/`cap:sync`/`cap:android`. `npx cap add android`
  scaffolds cleanly and copies the bundle into the APK assets; `app/android|ios/` are gitignored
  (regenerable). Validated by static-serving `dist/` (== a no-fallback WebView): `/theory.html` +
  `/yield.html` cold-start, all engine scripts/grids/React bundle resolve, routes render, gate revalidates
  against the live Lambda from localhost. **Blocked only by absent native toolchains here** (JDK 17 +
  Android SDK for Android; Xcode/macOS 13+ for iOS) — `./gradlew` stops at "no Java Runtime". Full
  write-up + build steps + the one open backend item (add `https://localhost`/`capacitor://localhost` to
  the shared gate Lambda CORS for bundled first-login) in **MOBILE.md**.
- Remaining from the migration plan: CSP (still blocked by the standalone pay/viz pages' inline handlers).

## [1.2.0] - SPA migration COMPLETE: all 20 workflow + reference routes are React 🎉

- **PORTED (P4 heavy finale): location (+ the '/' ROOT CUTOVER), mounting, yield, schema, defectoscopy, pt**
  (legacy HTML deleted). Every workflow step, reference DB and the theory annex is now served by the React
  shell; only pay/pay-test/subscribe/unsubscribe + the QA *Viz pages remain intentionally standalone.
- **'/' cutover:** the S3 default root object now serves the shell; Location lazy-loads Leaflet + js/map.js
  (cached-promise loadScript), reuses map.js/canvas.js/elevation/horizon stacks untouched, and reversibly
  installs the onLocationChange/onThemeChange hooks. ?e=&k= magic links and /?share= landings ride the
  shell's GateProvider + untouched share.js as designed.
- **Yield** (the riskiest transplant): the full multi-string runner + PVGIS per-string import + model card,
  with yield-ui.js DELIBERATELY not loaded (its global runYield() reads removed legacy ids and applyI18n
  would call it — its 5 helpers are inlined). Hardened: strings missing `albedo` (old exports) default to
  0.2 instead of NaN-ing the whole engine.
- **PT**: pt-doc.js builds its A4 pages into a React-untouched host (22 pages verified); the un-scopeable
  @page print rule is runtime-injected on mount and removed on unmount. Second paywalled route.
- **Schema/Mounting/Defectoscopy**: legacy-driver transplants over the untouched SchemaSVG/Planes/I-V engines.
- **New PageBoundary** error boundary per route: a calc crash degrades to an inline message + reload button
  instead of blanking the app (legacy-parity: page chrome survived script errors).
- Shell now carries the complete engine set (all grids incl. kt/tl/elevation/horizon, ineichen, schematic +
  PT engines). Playwright: the one data-i18n-dependent selector updated (#sp-draw); 7/7 mocked green.
- **Next (P5):** delete gate.js/site-nav.js/app.js/yield-ui.js/report-pdf.js from repo+S3, docs rewrite,
  CSP, Capacitor packaging spike.

## [1.1.2] - SPA migration P3: seven medium workflow steps ported (14 of 20 routes)

- **PORTED: components, strings, connections, protections, economics, wind, report** (legacy HTML deleted;
  same URLs served by the SPA shell). The SPA now serves the MAJORITY of the site - only location(/),
  mounting, yield, schema, defectoscopy and pt remain legacy (P4 heavy phase).
- **Components**: full React port of the S/I/B cascade editors (brand→model), live sizing check
  (P_inv/P_FV + MPPT capacity + target), exact legacy persist payload incl. the battery-bank mirrors.
- **Strings + Economics**: the LEGACY-DRIVER pattern matured - strings reuses the untouched §11 calculator
  (populate/loadTemplate/calcString/renderStringResults own the DOM below the React skeleton; auto-estimate
  verbatim incl. the -21/+24 design margins); economics transplants its DOM-driven pipeline (readNum-by-id,
  FX-in-place currency switch, C_FV recompute, 4 autoconsum modes incl. the battery sim, NPV chart) into a
  mount effect with clean unmount (chart destroy, dead flag).
- **Connections/Protections/Wind/Report** ported by parallel subagents on the established recipe: verbatim
  HTML-string builders via dangerouslySetInnerHTML for pixel parity, per-card Explain blocks inline, React
  accordions, wind zone SVG, report's custom share modal + Invite (Share.save → link) with Share.msgKey
  error surfacing (SiteNav.paywall 401 path folded into the modal status - accepted deviation).
- **Report is the first PAYWALLED route** - Shell hides content + blocking modal for unpaid sessions with
  the 20 s silent-reval poll; the trial→paid upgrade unlock was verified live against the Lambda.
- Shell gains the engine chain (irradiance-hofierka → formulas → yield-engine), temp + wind grids
  (self-fetching) and electricity-prices. 7/7 mocked Playwright green against the built shell.

## [1.1.1] - SPA migration P2: five more pages ported

- **PORTED: inverters, modules, recalc, consumption, obstacles** (legacy HTML deleted; same URLs served by
  the SPA shell). The reference-DB machinery is hoisted into `app/src/db/DbShared.jsx` + `DbPage.css`
  (list/sort/search/brand/hash-deep-links shared by Batteries/Inverters/Modules); Modules keeps the FF +
  cell-type learning-mode explainers, `?s=<stringId>` string context and the comparepv link.
- **First gated + Chart.js + canvas routes.** Recalc/Consumption/Obstacles are `gated:true` (React GateOverlay
  verified against the real Lambda + all 7 mocked Playwright tests pass against the built shell). New shared
  components: `ChartCanvas` (Chart.js create/destroy lifecycle), `ExplainHost`/`LearnToggle` (learning-mode over
  legacy Explain.block), `SmartLink` (Link for ported / <a> for legacy). Obstacles reuses the legacy engines
  (obstacles.js/canvas.js/convention.js/solar-geometry.js now in the shell): state hydrated per mount, the
  `drawCanvas` persist wrapper applied REVERSIBLY (unwinds on unmount), and the `#hz-list` delegation the
  legacy file only wired on DOMContentLoaded is re-wired by the component.
- **Live cross-step reactivity demonstrated:** edit a month on Consumption → jump to Recalc via the stepper
  (instant SPA nav) → coverage/balance update with zero reload.
- 7 of 20 routes now ported. Fix: dev-HMR createRoot guard in main.jsx.

## [1.1.0] - SPA migration begins (React + Vite) 🚀

- **New `app/` — React 18 + Vite SPA shell (Phase 0+1 of the SPA conversion).** The site is migrating
  incrementally from multi-page vanilla JS to a SPA that KEEPS the original `.html` URLs: each ported route's
  S3 object becomes a copy of the built shell (`app/dist/index.html`, hashed `/assets/*`), unported pages stay
  untouched - zero CloudFront changes. The shell loads the legacy engines/state/i18n/theme as unchanged classic
  scripts and replaces only the chrome layer: React components port `site-nav.js` (topbar/stepper/stepnav/
  account menu/paywall/cloud-projects modal/RO banner/print head) and `gate.js` (GateProvider/GateOverlay,
  identical `#gate-overlay` markup + Lambda contract; anti-tamper now structural - gated content simply isn't
  rendered until authed). Bootstrap JS dropped (only site-nav used it); modals are React.
- **`js/project-state.js` — reactive (additive patch).** `Project.onChange(cb)` / `Project.version()` /
  `Project.identity()`; `save()` notifies subscribers, whole-project replacements (import/reset/RO) bump
  identity. Legacy pages unaffected (all 7 mocked Playwright tests pass); React pages get live cross-step
  reactivity via `useSyncExternalStore`.
- **First two pages PORTED: `theory.html` + `batteries.html`** (legacy HTML deleted; served by the SPA at the
  same URLs). Batteries keeps search/brand filter/€-kWh + kWh sorts/hash deep links (`#<id>`)/"use in project";
  Theory keeps the three live-state formula sections. Pixel parity via the same markup/classes + css/style.css.
- **`deploy.sh`** gains step 0 (vite build, fail-fast guards: ported-list consistency vs `app/src/ported.js`,
  no gate/site-nav double-load in the shell), the PORTED shell-copy loop, and `/assets` immutable sync.
- **Dev:** two servers - legacy `:8091` (unchanged, observability) + Vite `:5173` (`npm --prefix app run dev`),
  whose proxy serves ported routes from the shell and everything else from :8091, one navigable origin.

## [1.0.1]

- **Economics — C_FV (BoM mode) now tracks component changes (`economics.html`).** Fix: in "Din componentele
  alese" mode, the total system cost only auto-derived when it was unset, so changing the battery/module/
  inverter on the Components step left a stale C_FV (while the breakdown hint already showed the new figure).
  It now re-derives from the current bill of materials every time the page loads - placed after the currency
  select is set so the FX factor is correct (a latent bug the old once-only path hid: it was multiplying by
  the RON rate). In-session manual C_FV edits still stick (recompute only fires on load + cost-mode/€-Wp
  change). No manual Save needed - the component change persists on navigate.

## [1.0.0] - First stable release 🎉

The 0.9 development line is closed. **1.0.0** is the first stable release of the Earth Energy Engine -
the full guided PV-design workflow (Location → Obstacles → Consumption → Components → Mounting → Yield →
Recalc → Strings → Connections → Protections → Economics → Schema → Wind → Report → Proiect Tehnic →
Defectoscopy), the equipment databases (117 modules, 225 inverters, 19 batteries - now with the GoodWe ESA
line), the satellite-calibrated yield engine, and the Teorie (Anexa 1) reference annex. Bundles everything
accumulated across 0.9.44-0.9.59 (battery banks + quantities, panel/inverter/battery pricing, the economics
BoM cost estimator, wider string-sizing temperature margins, the theory annex, the battery DC cable category).

Going forward, patch-bump on the **1.0.x** line (1.0.1, 1.0.2, …) for the same reasons the 0.9 line did.

## [0.9.59]

- **Firm prices for the GoodWe ESA equipment (`string-ui.js` + `battery-list.js`).** Replaced the placeholder
  estimates on the three ESA rows with real photovoltaik-shop.de listings (DE, 0% solar VAT): GW15K-ETA-G20
  inverter **€1761** (€117/kW, was est. €1550), BAT 5.1 **€1317** (€263/kWh, was €1650), BAT 8.3 **€1634**
  (€204/kWh, was €2650 - the estimate was ~60% high). priceSrc now cites the store.

## [0.9.58]

- **Battery DB — added GoodWe ESA battery modules BAT 5.1 + BAT 8.3 (`battery-list.js`).** The HV modules
  (Lynx D G2 tech) that pair with the new ESA/ETA-G20 hybrids: `goodwe-gw5-1-bat-d-g20` (5.12 kWh rated / 5.0
  usable, 5 kW, 7.5 kW peak) and `goodwe-gw8-3-bat-d-g20` (8.32 / 8.0, 8 kW, 12 kW peak). All specs
  pdfplumber-verified from the GoodWe ESA 5-30kW datasheet: 100% DoD, 3ph-system 700-950 V (nom 750 V), stack
  up to 12 (max 6 per single-column), >=8000 cycles. Complements the GW15K-ETA-G20 inverter added in 0.9.57.

## [0.9.57]

- **Inverter DB — added GoodWe GW15K-ETA-G20 (ESA series), fully datasheet-verified (`string-ui.js`).** New
  three-phase HV hybrid `goodwe-gw15k-eta-g20` (the ESA/ETA-G20 gen, distinct from the existing ET/ET-G2/SDT
  15kW rows). Every field read from the GoodWe ESA 5-30kW datasheet PDF via **pdfplumber** (not poppler): 4 MPPT,
  Vmax 1000 V, MPP range 120-950 V, nominal input 750 V, PV start-up 150 V, **21 A max / 26 A Isc per MPPT**,
  15 kW / 15 kVA 3ph, up to 200% DC oversizing, HV battery 700-950 V (nom 750 V, 20.1/22.1 A charge/discharge).
  Price est. EU retail ~€1550 (€103/kW).

## [0.9.55]

- **Economics — BoM uplift relabeled to consumables/margin (`economics.html` i18n + config).** The +25%
  applied over the equipment bill of materials now reads "consumabile/marjă (fără montaj/manoperă)" /
  "consumables/margin (excl. mounting/labour)" - it no longer claims to cover labour. Value unchanged (still
  `ECON_BOM_UPLIFT = 25`); the general `eco.cfvNote` still reminds that a full C_FV adds manoperă + avize.

## [0.9.54]

- **Schema — battery DC cable category + latent mislabel fix (`schema-svg.js`).** Added a **"Cablu c.c.
  acumulatori"** row to the Extras cable-label rules, with an **architecture-aware default** (HV battery →
  `H1Z2Z2-K` 1.5 kV PV cable; LV 48 V → `H07RN-F`, resolved from the selected battery's `architecture` flag
  in `BATTERY_LIST`). Also **fixes a latent mislabel**: the inverter→battery DC link (source = inverter, kind
  `inv`) previously fell through to the AC rule and was drawn as `NYY-J`; `cableForEdge` now receives the edge
  destination + port so `isBattEdge` catches it (`kind==='battery'` or the `bat` port). `cableOf` supports a
  functional (dynamic) default. New i18n `lbl.dcbatt`. (The AC default is `NYY-J` - the RO-standard cable;
  the old `CYY-F` note in the dev guide was stale.)

## [0.9.53]

- **Teorie (Anexa 1) — added section 3 "Curenți de lucru ai modulului" (`theory.html`).** New working-currents
  section with the two temperature+irradiance current formulas (course rel. 11-12):
  `I_SC,max = I_SC,STC·[1 + (λ_I/100)·(T_c,max-25)]·(G_max/1000)` and the same for `I_mp,max`. Both compute from
  live state (I_SC,STC / I_mp,STC / λ_I now persisted in `stringSizing`, blank template + `calcString`), at the
  hot cell (T_c,max) and peak irradiance (G_max) - matching `calcString`. New i18n `th.title3` / `th.intro3` /
  `th.iscmaxCap` / `th.impmaxCap` / `th.legIscstc` / `th.legImpstc` / `th.legLi` / `th.legGmax` / `th.legIscmax`
  / `th.legImpmax`.

## [0.9.52]

- **Teorie (Anexa 1) — split into two sections + added V_mp,min (`theory.html`).** The annex is now
  **1. "Temperatura celulei fotovoltaice"** (T_c,min / T_c,max + its own legend) and a new
  **2. "Tensiuni de lucru ale modulului"** section with its own description and legend, holding the voltage
  formulas: V_OC,max (moved here) and the new `V_mp,min = V_mp,STC·[1 + (λ_V/100)·(T_c,max-25)]` (min MPP
  voltage at the hot cell). Both compute from live state (V_mp,STC now persisted alongside nmot/voc/lv), with
  V_mp using the same λ_V as V_OC (as `calcString` does). Source banner moved to the page top. New i18n
  `th.title2` / `th.intro2` / `th.vmpminCap` / `th.legVmpstc` / `th.legVmpmin` / `th.legTmax`.
- **State — `stringSizing` now carries module coeffs.** `nmot`/`voc`/`vmp`/`lv` are persisted (blank template +
  `calcString`) so the theory annex needs no module DB. Fully backward-compatible: `importState()`→`migrate()`
  deep-fills onto a blank, so older exports (without these fields) import fine and just fall back to defaults.

## [0.9.51]

- **Teorie (Anexa 1) — worked examples now use LIVE project values (`theory.html` + `string-ui.js`).** The
  three formulas' substitutions are computed from `Project.section('stringSizing')` (the Strings step) instead
  of hardcoded numbers: `T_a,min`/`T_a,max`/`G_min`/`G_max`/NMOT/`V_OC,STC`/`λ_V` come from state, recomputed
  exactly like `calcString()` including the **NMOT ±3% tolerance** (cold cell = NMOT·0.97, hot = NMOT·1.03 -
  which is why the course shows 43.6 / 46.4 for NMOT 45). A source banner flags whether the values are from
  your project or the fallback defaults (no project yet). `string-ui.js` now persists `nmot`/`voc`/`lv` into
  `stringSizing` so the annex needs no module-DB dependency. New i18n `th.srcProject` / `th.srcExample`.

## [0.9.50]

- **Teorie (Anexa 1) — added the cold V_OC formula (`theory.html`).** Third typeset equation continuing the
  chain: `V_OC,max = V_OC(T_min) = V_OC,STC·[1 + (λ_V/100)·(T_min-25)]`, with a worked example at
  `T_min = T_c,min = -17.5 °C` and representative datasheet values (V_OC,STC 37.5 V, λ_V -0.30 %/°C) → 42.28 V.
  Site notation (V<sub>OC,STC</sub>, λ<sub>V</sub>, T<sub>min</sub>); legend extended. New i18n `th.vocmaxCap`
  / `th.legTmin` / `th.legVocstc` / `th.legLv` / `th.legVocmax`.

## [0.9.49]

- **Strings — wider site-temperature design margins (`strings.html`).** The "Auto from location" estimate for
  `T_a,min`/`T_a,max` now biases the coldest/warmest monthly grid mean by **-21 / +24 °C** (was -15 / +13), so
  the design extremes reach further into record cold/heat (e.g. Brasov auto → -25 / +45 °C). Only the offsets
  changed; G_min/G_max and the static defaults (-20 / 45 °C) are untouched.
- **New reference page — Teorie (Anexa 1) (`theory.html`).** A simple theory annex under Reference that
  presents the two PV cell-temperature formulas typeset LaTeX-style (CSS stacked fractions + subscripts,
  self-contained, no math library): `T_c,min = T_a,min + (NMOT-20)·G_min/800` and
  `T_c,max = T_a,max + (NMOT-20)·G_max/800`, each with a worked example and a symbol legend. Bilingual
  (RO primary), theme-aware, wraps cleanly at the `=` on narrow screens. `site-map.js` `theory` row flipped
  `ready:true`; added to `deploy.sh` (upload + invalidation). New i18n `th.*`.

## [0.9.48]

- **Economics — C_FV recomputes reliably from €/Wp (`economics.html`).** In the "Referință industrie" cost
  mode, editing **Cost unitar de referință (€/Wp)** now always recalculates **Cost total sistem C_FV**. The
  system size (kWp) is resolved **live** via a new `resolveKwp()` with a fallback chain PVGIS sizing → nameplate
  `components.pfvW` → **Σ(module pmax × count) over strings**; previously it was captured once at init and, if the
  project had no stored `pfvW`/sizing (e.g. economics opened before Components was run), was null so the field
  never updated. Same resolver now drives the C_FV prefill and the "(€/Wp × kWp)" hint.

## [0.9.47]

- **Components — per-bank battery quantity/count (`components.html`).** Each battery bank (B1/B2) gained a
  **number-of-units** input (`data-f="count"`, default 1) so a bank of N identical modules is one row × its
  count instead of N rows. The bank spec line is count-aware (`N × usable = total kWh · HV/LV · N·kW`),
  `components.batteryKwhTotal` now sums `Σ(kwhUsable × count)`, and the state model is
  `components.batteries = [{id, batteryId, count}]` (legacy `batteryId` migrates to `count:1`; freshly-added
  banks default `count:1`). **Economics BoM** (`bomEur`) multiplies each bank's `priceEur × count`, so the
  "Din componentele alese" C_FV estimate reflects real storage quantity. New i18n `cmp.battcount`.

## [0.9.46]

- **Economics — C_FV cost-estimate dropdown (BoM from selected components) (`economics.html`).** New
  "Estimare cost" selector in the Costuri group with two modes: **Referință industrie (€/Wp)** - the existing
  `ECON_EUR_PER_WP × kWp` benchmark (shows the €/Wp input) - and **Din componentele alese (+25%)** - computes
  C_FV from the real bill of materials: `Σ panel price over strings + Σ inverter price + Σ battery-bank price`,
  × (1 + `ECON_BOM_UPLIFT`=25%) for mounting/BoS/labour(manoperă)/margin. In BoM mode the €/Wp row hides, C_FV
  is auto-filled (still overridable), and a hint shows the per-category breakdown in the selected currency
  (FX-converted). Reads the priced `MODULE_LIST`/`INVERTER_LIST`/`BATTERY_LIST` (economics now loads
  string-ui.js) + the `strings`/`components.inverters`/`components.batteries` state. Persists `economics.costMode`.
  New config `ECON_BOM_UPLIFT`; new i18n `eco.costMode/costRef/costBom/bomHint/bomNone`.

## [0.9.45]

- **Module DB — panel prices + €/Wp value sort (`string-ui.js` + `modules.html`).** Priced all 117 modules:
  `priceEur` = round(pmax × brand €/Wp) + `priceSrc` + `eurPerWp`. Panels price by €/Wp tier, so a per-brand
  rate is applied to every model - anchored to real listings (Jinko ~0.10 €/Wp from RO 205 lei/440W, Aiko ABC
  ~0.17 from UK £68/450W, SolarWatt glass-glass ~0.28); the rest are tier estimates (`est.` in priceSrc):
  mainstream tier-1 (JA/Trina/Longi/Canadian/Risen/DAH/Astronergy/Futurasun/EGE) ~0.095-0.11, premium N-type
  (Huasun HJT 0.14, Q-Cells 0.15). modules.html gained a 3rd sort button **€/Wp** (value, asc = cheapest first,
  e.g. Risen €0.095/Wp → SolarWatt €0.28/Wp), €/Wp shown in each list sub-line + a "Preț & valoare" detail
  group. All 3 equipment DBs (modules + inverters + batteries) now carry prices - unblocks a BoM-based
  system-cost (C_FV) prefill in economics (equipment only, ex-labour). Volatile; verify at purchase.

## [0.9.44]

- **Components — battery banks (B1/B2 list, `components.html`).** Added an "Acumulatori (opțional)" card that
  mirrors the inverter I1/I2 list: a B1/B2 bank list with brand→model cascade (reads `BATTERY_LIST`/
  `BATTERY_BRANDS`), per-bank spec line (usable kWh · HV/LV · kW), remove buttons, "+ Add battery bank", and
  links to the battery DB (page + per-battery `batteries.html#id`). **Optional** - the list may be empty (a
  "no storage" hint shows) unlike inverters which need >=1. **State sync:** `components.batteries = [{id,
  batteryId}]` is the new source of truth; `components.batteryId` now MIRRORS the first bank (so economics'
  Expert autoconsum sim keeps reading one battery unchanged) and `components.batteryKwhTotal` = Σ usable kWh
  across banks (new). Migrates a legacy single `batteryId` into a one-bank list. `saveStep`/`renderList`
  wired. New i18n `cmp.battery/addbatt/battspecs/battnone`.

## [0.9.43]

- **Inverter DB — ALL 224 inverters now priced (`string-ui.js`).** Priced the remaining 179 across the 12
  other brands (Sungrow, Fronius, SolarEdge, SolaX, Kostal, Growatt, GoodWe, FoxESS, SMA, Hoymiles, Victron,
  Enphase). `priceEur`/`priceSrc`/`eurPerKw` on every row; the €/kW value sort on inverters.html now ranks the
  whole catalogue (best value = big grid-tie 3-phase strings ~€52/kW; micros/premium hybrids highest per kW).
  **Coverage honesty: 42 firm / 182 estimates.** Firm = a real reputable listing (Geizhals DE/EU + named EU
  shops - anchored ~2 per brand across the kW range: e.g. Sungrow SH10RT €859, Fronius Symo GEN24 10 €1749,
  GoodWe GW10K-ET €848 / GW20K-ET €2137, FoxESS T10-G3 €549 / H3-10 €1800, SMA STP10-SE €1855, SolaX X3-Hybrid
  €1399-1456, Kostal Plenticore+10 €1050, Growatt MOD-15K €1394, Hoymiles HMS-2000 €205 / HMS-800 €94). The
  rest are per-kW/per-series estimates grounded in those anchors, marked `est. EU retail` in priceSrc (shown
  as such on the page) - individual per-model firm scraping of 224 models wasn't feasible. Volatile - verify
  at purchase; many DE firm lows are 0% solar VAT.

## [0.9.42]

- **Inverter DB — Solis prices (all 22) + EcoFlow assessed (not added).** Priced the 22 Solis models
  (`priceEur`/`priceSrc`/`eurPerKw`). Firm anchors from reputable EU shops (S5-GR3P8K €430 ONSA Plus,
  RHI-3P10K €1150 westech-pv, S6-GR1P series €299-449 Geizhals); the rest are per-kW **estimates** (marked
  `est. EU retail` in priceSrc) because Solis grid-tie models are poorly indexed per-model (searches return
  series pages). Value ranking is sensible: grid-tie 3-phase = best value (S5-GR3P 10K ~€52/kW), small
  hybrids priciest (RHI 3K ~€233/kW). Now **45/224 inverters priced** (Deye 11 + Huawei 12 + Solis 22).
  **EcoFlow: assessed, not added** - their inverters are a different class (PowerStream/STREAM balcony
  microinverters + PowerOcean all-in-one ESS), don't fit the 3-25 kW string/hybrid `INVERTER_LIST` schema.

## [0.9.41]

- **Inverter DB — Huawei prices (`string-ui.js`).** Priced the 12 Huawei SUN2000 inverters (same
  `priceEur`/`priceSrc`/`eurPerKw` scheme, cheapest reputable from Geizhals DE/EU): L1 single-phase 3K €435 /
  4K €589 / 5K €649 / 6K €745; M1 three-phase 5K €549 / 6K €600(~) / 8K €845 / 10K €900; M2 three-phase 12K
  €790 / 15K €1030 / 17K €971 / 20K €1879. The big M2 units are the value winners (17K €57/kW, 12K €66/kW)
  while the single-phase L1 are priciest per kW (~€145/kW). Feeds the existing €/kW value sort on
  inverters.html - now 23/224 inverters priced (Deye 11 + Huawei 12). Many prices are DE at 0% solar VAT;
  volatile, verify at purchase.

## [0.9.40]

- **Inverter DB — Deye prices + €/kW value sort (`string-ui.js` + `inverters.html`).** Priced the 11 Deye
  inverters (cheapest reputable across RO/EU, same scheme as the batteries): added `priceEur` / `priceSrc` /
  `eurPerKw` (= round(priceEur / kW pac)). Firm from Geizhals/solarscouts: SG04LP3 6K €1340, 8K €1430, 10K
  €1499, 12K €1462; SG01HP3 8K €1218, 10K €1299; single-phase SG04LP1/SG05LP1 estimated (RO listings are
  B2B-gated). `inverters.html` gained the same sort mechanism as the panels/battery DBs: **€/kW** (value,
  asc = best value first, e.g. SUN-12K-SG01HP3 €117/kW) and **kW** (rated power, desc) toggle buttons, €/kW
  shown in each list sub-line + a "Preț & valoare" detail group. Unpriced rows (the other 213 inverters)
  sink to the bottom of the value sort. New i18n `inv.pricegrp/price/value`. Prices volatile - verify at
  purchase; many DE lows are 0% solar VAT. (Scoped to Deye per the user; other brands unpriced for now.)

## [0.9.39]

- **Battery DB — value sort by €/kWh (mirrors the panels FF/Pmax sort).** Baked a new `eurPerKwh` field
  (= round(priceEur / kwhUsable)) into every row and added a sort-row to `batteries.html` with two toggle
  buttons like modules.html: **€/kWh** (value, defaults ascending = best value first, e.g. Pylontech US5000
  €154/kWh → Huawei-5 €490/kWh) and **kWh** (usable capacity, desc). Same `sortKey`/`sortDir` toggle + arrow
  pattern. Each list row now shows its €/kWh in the sub-line, and the detail adds a "Valoare €X /kWh" card.
  Chose €/kWh over the literal price/Ah request because Ah is null/incomparable for the 7 HV batteries;
  €/kWh is the standard battery value metric and works for all 17. New i18n `bat.value`. `eurPerKwh` is
  derived/baked - recompute if priceEur or kwhUsable changes (noted in the field reference).

## [0.9.38]

- **Battery DB — firm per-retailer prices (cheapest reputable across RO/HU/PL/DE/FR/ES) + `priceSrc`.**
  Replaced the per-kWh price estimates with real listings, taking the cheapest from a REPUTABLE source
  (established solar distributor or price-comparison merchant - Geizhals/idealo, photovoltaik-shop,
  solarscouts, besa.energy, solartech.eu, ecosolaris.ro, gtaenergy.ro - not marketplaces). New `priceSrc`
  field records the store+country; shown under the price on the battery DB page. Notable moves vs the
  estimates: Pylontech US5000 1100->700, US3000C 750->540, BYD HVS 3800, Sungrow 2790, Dyness 1000->1360,
  SolaX 2200, FoxESS 2770, Deye SE-G5.1 980, Ampleness 700->765 (RO 3800 lei /4.97). Still `est.` (no firm
  reputable listing found): GoodWe Lynx F G2 (~2900), WeCo 5K3-XP (~1300), Deye BOS-G30 (~6100, C&I).
  ⚠ Basis varies: many lowest prices are DE shops at 0% solar VAT, so they read below a VAT-inclusive RO
  price - flagged in the field note + shown via priceSrc. Prices volatile - verify at purchase.

## [0.9.37]

- **Battery DB — `priceEur` backfilled on ALL rows + shown in the visualisation.** Every one of the 17
  battery rows now carries an indicative EUR price (was only the 5 new LV rows). Sourced from EU
  price-comparison where available (BYD HVS 10.2 ~4200, Sungrow SBR096 ~3000, Pylontech US3000C ~750);
  the rest are per-kWh market estimates (Huawei 5/10/15 ~2000/3500/5000, GoodWe ~2900, SolarEdge ~4200,
  SolaX ~2200, FoxESS ~2800, Deye SE-G5.1 ~1150, Deye BOS-G30 ~6100). Also harmonised Pylontech US5000
  1500 -> 1100 for per-kWh consistency with the US3000C. The battery DB page (`batteries.html`) shows
  the price as a "Preț orientativ ~€X" card in the Life & warranty group (only when priceEur is set, so
  it now appears on all rows). Prices are indicative 2026 EU/RO street incl VAT - verify at purchase.

## [0.9.36]

- **Battery DB — 5 open-ecosystem LV batteries + indicative EUR prices (`battery-list.js`).** Added the
  approved third-party 48 V LV racks from Deye's official Approved Battery List (DY-LV48-0109): **Dyness
  A48100**, **V-TAC VT-48100E**, **Pylontech US5000**, **WeCo 5K3-XP**, plus **Ampleness S5285** (flagged
  OPTIONAL - vendor-claimed, NOT on the approved list). New brands `dyness/vtac/weco/ampleness`. Each is
  open-ecosystem (`compatBrands: ['deye','solis','growatt','victron-energy']`), not Deye-locked. XR-07 was
  rejected (it's a DIY battery enclosure, no fixed datasheet). HV third-party list deferred (user unsure).
- **New `priceEur` field** = indicative retail price in EUR (incl. VAT), shown on the battery DB detail page
  ("Preț orientativ ~€X", `bat.price`). Non-EUR sources converted with our `FX_PER_EUR` table (config.js):
  e.g. V-TAC 3470 lei ex-VAT ×1.19 ÷4.97 ≈ 830 EUR; Ampleness 660 USD ÷1.08 ≈ 610 EUR ex-works. Prices:
  Dyness ~1000, V-TAC ~830, Pylontech US5000 ~1500, WeCo ~1150, Ampleness ~700 EUR. Volatile - verify at
  purchase. Only the 5 new rows are priced so far (existing 12 rows: priceEur backfill pending).

## [0.9.35]

- **Battery DB — Deye batteries added (`battery-list.js`).** New `deye` brand + 2 datasheet-verified rows
  covering both Deye inverter families we list: **SE-G5.1 Pro-B** (48 V LV rack, 5.12 kWh / 4.6 usable @ 90%
  DoD, 100 A max = 5.12 kW / 150 A peak, >=6000 cycles - pairs with SUN-SG04LP1/SG04LP3 LV hybrids) and
  **BOS-G30 HV** (5.12 kWh/51.2 V modules, 3-12 in series = 15.36-61.44 kWh; listed = 6 modules / 30.72 kWh
  / 27.64 usable / 307.2 V, 100 A nominal, HV box 120-750 V - pairs with SUN-SG01HP3 HV hybrids). Both
  `compatBrands: ['deye']`, appear in the battery DB page + the economics Expert autoconsum dropdown. Specs
  read from the Deye SE-G5.1 Pro-B (V2.1) and BOS-G (V1.31) datasheets. Very popular in RO.

## [0.9.34]

- **Economics — Expert autoconsum mode with battery (`economics.html`).** New 4th self-consumption
  mode "Cu baterie (expert)" that wires the battery DB into the benefit calc: `Eauto = E_direct + E_battery`.
  A typical-day-per-month proxy for an hourly sim - each month's daily PV covers the daytime load directly
  (`E_direct`), the surplus charges the chosen battery (capped by `kwhUsable` + `pChargeKw`·solar-window),
  which is drawn down at night (capped by `pDischargeKw`·night-window and `effRt`) to cover the evening load
  (`E_battery`). Uses the datasheet-verified `battery-list.js` specs. A battery dropdown (prefilled from the
  one picked on batteries.html -> `components.batteryId`, or `economics.battId`) appears in this mode, plus
  the daytime-share input. Live note + "mod explicativ" block show the direct/battery split; falls back to
  day-only self-consumption (with a warning) when no battery is selected or monthly data is missing. New
  config knobs `ECON_BAT_SOLAR_H`/`ECON_BAT_NIGHT_H`; persists `economics.battId`; new i18n `eco.scBaterie/
  scBatt/scBattNone/scNoBatt/scHelpBaterie`. Example: a 10.24 kWh BYD on a 6 MWh/yr system lifts modelled
  self-consumption from ~61% (day-only) to ~90%. Exported energy is the actual un-storable PV surplus
  (`Σ surplus - stored`), NOT `Wp - Eauto` - so the battery's round-trip loss is not mis-credited as export
  earning e2 (`benefit()` now takes `einj` explicitly; the "mod explicativ" B block shows `E_inj` in battery
  mode). Keeps the analysis conservative (the loss earns nothing), per the under-promise principle.
- **Inverter DB fix (`string-ui.js`) — Deye SG04LP1 MPPT count.** Corrected `nmppt` 1 -> 2 on the three
  single-phase `SUN-3.6K/5K/6K-SG04LP1-EU` (the datasheet lists "2/1+1"; only the 3K variants are 1/1 - the
  scrape had mislabelled them, contradicting their own "2 MPPT" note). Fixes the MPPT-capacity check falsely
  rejecting a valid 2-string design on these popular RO models.

## [0.9.33]

- **schema-svg.js — battery symbol now uses the same external SQUARE box as the inverter and meter**
  (side = SYMH, square corners rx=0, edge ports), the two cell plates drawn inside. One consistent
  square-device family (inverter · meter · battery). Affects both the schema.html editor and the
  pt.html single-line plate (shared builder).

## [0.9.32]

- **Battery database — schema + datasheet-verified ecosystem-HV dataset + browser page.** New storage
  DB the autoconsum simulation will use. Dedicated file `js/battery-list.js` (`BATTERY_BRANDS` +
  `BATTERY_LIST`, moved out of string-ui.js to avoid the concurrent inverter-work collision; loaded
  before it on the 13 registry pages). Each row carries the simulation-decisive parameters - usable
  energy, max charge/discharge **power (kW)**, round-trip **efficiency**, **SoC min** / DoD - plus
  chemistry, HV/LV architecture, DC/AC coupling, modular stack range, warranty, and a **`compatBrands`**
  link to our inverter brands (ecosystem-locked HV = one brand; BYD/Pylontech = multi). 10 rows: Huawei
  LUNA2000-S0 (5/10/15), BYD Battery-Box Premium HVS, Sungrow SBR, GoodWe Lynx Home F G2, SolarEdge Home
  Battery 400V, SolaX Triple Power T-BAT H, FoxESS ECS HV, + the legacy Pylontech US3000C (LV) migrated.
  ids follow the SLUG RULESET.
- **Specs VERIFIED against the manufacturer datasheets** (read June 2026, source URL per row) - corrected
  several first-pass values: BYD HVS 10.2 is 409.6 V / 25 A (~10.2 kW), not 204 V / 5.1 kW; GoodWe Lynx is
  35 A / 6.72 kW @ 192 V at 100% DoD (not 5 kW / 95%); SolaX T-BAT H 5.8 is 5.5 kWh usable (95% DoD) / 2.9 kW;
  FoxESS is 5.76 kW / 7.49 kW surge; Sungrow 30 A / 5.76 kW @ 192 V. Round-trip-efficiency is datasheet-stated
  for BYD (>=96%) and SolarEdge (94.5%); the others list none, so a typical-class ~0.95/0.96 is used (noted).
- **New reference page `batteries.html` (`data-page="bat-db"`, "Bază acumulatori") + nav entry.** Mirrors the
  inverter/module DB browser: searchable list, brand filter, grouped detail (capacity / power & efficiency /
  limits / life / compatible inverters), HV/LV pill, compat-brand tags, "Folosește în proiect" → sets
  `components.batteryId`. Flipped its `SITE_MAP` row to `ready:true`; added to deploy.sh + the invalidation
  list. New i18n `bat.*` (RO/EN). Still not wired into the economics autoconsum sim - DB + picker first.

## [0.9.30]

- **Single-line schematic embedded in the Proiect Tehnic (pt.html) as one landscape plate.** The
  schematic model + SVG builder was extracted from `schema.html` into a SHARED `js/schema-svg.js`
  (`window.SchemaSVG`) so the editor and the PT document render from ONE source of truth (no
  divergence on the IEC symbols). `schema.html` now delegates to it via thin aliases; `build(opts)`
  takes `nodeIds` (the editor's `n#` scaffolding, off for the document) and `learn` (cable-type wire
  labels). `pt.html` loads `iec-symbols.js` + `schema-svg.js` and `pt-doc.js` emits the schematic as
  the **lead drawing of the Planșe section**: the document/sheets stay PORTRAIT A4, the plate is laid
  **landscape** (the drawing - which carries its own cartouche/title block - is rotated 90° to fill the
  portrait sheet, `.pt-plate-rot`). One schematic only; falls back to a "[de completat]" note when the
  strings/inverter aren't filled yet.

## [0.9.29]

- **schema.html — default AC cable type `CYY-F` → `NYY-J`** (the `ac` LABEL_RULES default; still
  overridable per-project in the Extras cable rules).

## [0.9.28]

- **schema.html — MAIN symbol: neutral dot moved to the top** of its conductor stroke (same end as the PE
  cap bar), so the two marks line up.

## [0.9.27]

- **schema.html — cable-type-only wire labels + a real MAIN (mains) symbol.** Wire labels under "mod
  explicativ" now show **just the cable type** (e.g. `H1Z2Z2-K`, `CYY-F`) - the `W#` designators are dropped.
  The grid terminal is no longer a triangle: it's the IEC 60617 **mains symbol** - the conductor crossed by
  equally-spaced oblique strokes (one per conductor): the phase conductors, then the neutral (stroke + dot),
  then the protective conductor PE (stroke + cap bar = the "T"). **1- or 3-phase chosen from project state**
  (`connections.phases`): 1-phase = 1 phase stroke + N + PE, 3-phase = 3 + N + PE.

## [0.9.26]

- **schema.html — W# wire designators only under "mod explicativ".** The W1/W2/… cable-schedule labels used
  to render on every wire by default (cluttering the single-line); now the whole wire label (W# + cable type)
  shows only when "mod explicativ" is on - clean single-line otherwise. Also fixed the learn toggle: it now
  triggers a **full re-render** (was only re-rendering the rule report), so toggling it actually shows/hides
  the wire schedule + the live explain blocks. W# numbering stays stable when hidden.

## [0.9.25]

- **schema.html — meter double-arrow + English designators.** The meter's top sub-box now holds one
  bidirectional **double-headed arrow (↔)** instead of two separate arrows (more visible). Default
  designators changed to English: meter `Contor` → **`METER`**, grid `REȚEA` → **`MAIN`** (device labels are
  hardcoded in the rules - no i18n - and remain editable in the placement list).

## [0.9.24]

- **schema.html — energy-meter symbol redesigned.** The meter is now a **square** box with a top sub-box
  (25% of the height) holding both **flow arrows** (→ import / ← export, bidirectional) and **"Wh"** filling
  the lower 75%; ports at the square's own edges (like the inverter). Its designator below changed `kWh` →
  **`Contor`** (so the "Wh" inside isn't redundant).

## [0.9.23]

- **schema.html — MCB contact cleaned up + fonts +1 again.** The MCB fixed contact is now a clean **X** (the
  vertical line that ran through it - making it look like a star/✳ - is gone; the lead stops at the X, like the
  RCCB). All schematic SVG fonts bumped +1 once more.

## [0.9.22]

- **schema.html — RCCB symbol + bigger schematic fonts.** The RCD is now drawn as a proper IEC **RCCB**
  line symbol (`iec-symbols.js` `rccb`, no letters): the toroid CIRCLE (current sensor), a feedback loop to a
  trip-relay SQUARE that pulls the LEVER, and the **X output contact** - oriented so the X/output faces the MCB
  and the toroid/input faces the main line (its `in` port = the X end). Routed through `portsOf` (`d.kind==='rcd'→'rccb'`).
  Also **every schematic font is +1** (all device labels/subs, node ids, W# wire labels, and the whole cartouche -
  rulers, title block) for legibility.

## [0.9.21]

- **schema.html — editable device labels + more symbol fixes.** Every device's label (S1, F1, SPD1, INV,
  MCB, …) is now an **editable input in the "Amplasare elemente" placement list** - typing renames it live in
  the drawing and the edge dropdowns (persisted in `schema.labels = {node: customLabel}`; `labelOf(d)` falls
  back to the rule's default; typing keeps input focus because only the SVG re-renders). The **inverter** is now
  a true **SQUARE** (side = SYMH, ports at its own narrower edges), not a wide rectangle. The **MCB** thermal
  element is redrawn as a **conductor DETOUR** (the line jogs into the rectangle and back, open on the conductor
  side) so it's part of the wire and keeps its shape under any rotation. The **SPD** label dropped clear of both
  the line above and the arrester box.

## [0.9.20]

- **schema.html symbol tweaks.** The **SPD** arrester box now hangs a few px LOWER below its line (more
  breathing room, since the skip-row layout freed the space below) - earth port moved to match. The **MCB**
  thermal element is no longer a closed square: its **bottom edge is open** (top + right edges only, with the
  conductor as the left side), per the IEC release form.

## [0.9.19]

- **schema.html — inverter + MCB symbol polish.** Inverter glyph is now a **white, square-cornered** box
  (dropped the green tint and the rounded corners) with the **diagonal running corner-to-corner**; DC (⎓)
  upper-left, AC (∼) lower-right, leads on left/right/bottom. The **MCB** (`iec-symbols.js`) is redrawn to
  the detailed IEC form from the reference: a "✳" trip-element star at the fixed contact, the open switch
  blade, then the thermal-magnetic release (a small rectangle over a curved hook) on the conductor.

## [0.9.18]

- **schema.html — fixed a false-junction in the wire router.** Two parallel string→inverter feeds (e.g.
  S2→INV1 and S3→INV2) were routed with the same mid-x and met at a shared point on the row between them,
  so the strings *looked* electrically joined. `route()` now staggers each column-spanning vertical leg by
  its source row (`chan` arg), so parallel feeds run on their own lanes; pure verticals (earth/battery) and
  straight horizontals are untouched.

- **schema.html — redesigned the MCB and inverter symbols.** The **MCB** is now a proper IEC 60617 line
  symbol (`iec-symbols.js` `mcb`: a switch contact with the breaker **"×"** cross at the fixed contact and
  the operating hook on the moving blade) — boxless and rotation-derived like the fuse/disconnector, routed
  through `portsOf` (`d.kind==='mcb'→'mcb'`) instead of the old plain box. The **inverter** glyph now reads
  left→right: **DC (⎓) on the LEFT, AC (∼) on the RIGHT**, with terminal leads on the left (DC in), right
  (AC out) and bottom (battery c.c.). (Bumped APP_VERSION so the cached `iec-symbols.js` refreshes.)

## [0.9.17]

- **schema.html — skip-row default layout so each SPD's PE earth has room.** The DC branches
  (string → fuse → SPD → disconnect) now default to every other cartouche row (0, 2, 4 = A, C, E) via a
  new `rowStep(n)` (stride 2 when `n·2 < ROWS`, else packed stride 1), so each SPD's per-unit PE earth
  drops onto the empty row DIRECTLY BELOW it (1, 3, 5) instead of stacking in the lower grid. Inverters /
  MCBs / the shared AC chain (RCD → [SPD~] → meter → grid) are top-aligned with the same stride (INV1 +
  chain on row 0, INV2 on row 2, …); the battery sits just under INV1; PE earths inherit their SPD's column.
  4+ strings fall back to the old packed layout. Matches the engineer's hand-drawn reference.

- **Removed the single-line schematic from protections.html.** The auto-generated "Schemă monofilară"
  card (inline SVG + `.excalidraw` export, and its `buildModel`/`svgGlyph`/`toSVG`/`toExcalidraw`/
  `renderSchematic` code, CSS and export handlers) is gone - the monofilară now lives solely on the
  dedicated **schema.html** (step 12). protections.html keeps its DC + per-inverter AC protection cards.

- **Consumption (`consumption.html`) — detailed mode now yields a monthly shape for economics.**
  Previously the appliance ("detailed") mode produced a flat `annual/12` profile and persisted
  `consumption.monthly = null`, so the economics self-consumption models (`lunar` / `zinoapte`)
  silently degraded to the annual balance there. Now the annual appliance total is spread over a
  default winter-heavy residential profile (`CONSUMPTION_SEASONAL_PROFILE` in config.js) and the
  resulting 12-month array is persisted in **both** modes. Effect: detailed-mode projects get a real
  monthly self-consumption calc (summer-surplus / winter-deficit mismatch) with no extra input, and
  the consumption chart / peak-month reflect the seasonality. A "mod explicativ" block flags the curve
  as a default assumption (switch to Simple mode to enter your own 12 values).
- **Fix:** `consumption.html` was not loading `js/config.js` at all - added it (matching every other
  step page) so the shared constants are available there.

## [0.9.16]

- **Per-inverter AC design: protections.html + connections.html size each inverter's AC line
  separately.** Both pages now resolve the inverter list via the shared
  `resolveInverterUnits(components)` helper (new in `string-ui.js`, alongside
  `assignStringsToInverters` - the canonical multi-inverter resolvers, same greedy string→MPPT
  distribution schema.html draws). **protections.html** renders one `I_inv,ca` + MCB per inverter
  (each unit's own AC circuit, sized from its pac; e.g. I1 3 kW → MCB 16 A, I2 10 kW → MCB 50 A),
  with shared RCD / AC-SPD / breaking-capacity; the DC-gear `Un` now takes the MAX `vinvmax` across
  units. **connections.html** sizes one AC cable + ΔU% + MCB per inverter (each its own run to the
  board). The DC (per-string) protection/cabling and the protections single-line schematic still read
  the representative (first) inverter. strings.html already picks any inverter for its §11 window.

## [0.9.15]

- **Multiple inverters: components.html edits an I1/I2/… inverter LIST (like the strings list).**
  `components.inverters = [{id, inverterId}]` is the new source of truth (add/remove rows, brand→model
  cascade, per-row specs); `components.inverterId` + `pacInv` now MIRROR the FIRST (representative) inverter
  so every per-inverter consumer (protections/connections/strings/yield/report/pt) keeps working unchanged,
  and `pacInvTotal` carries Σ pac. The sizing check sums P_inv over all units (ratio vs P_FV); the
  MPPT-capacity check compares Σ strings vs Σ nmppt. **schema.html now draws the user's actual inverters**
  (one INV node per list entry, each with its own kW; strings chunk across them by capacity; falls back to
  the legacy single inverter when the list is empty) instead of auto-multiplying one - R-009 still flags a
  shortfall. Migrates a legacy single `inverterId` into a one-entry list. (Beta: old persisted states with no
  `inverters[]` array fall back via the mirror.) New i18n: `cmp.addinv/invspecs/invshort/microtag/inputs.fix2`.

- **MPPT-input capacity check (uses the new `nmppt`): components.html warns + schema.html renders
  multiple inverters.** components.html: when `Σ strings > inverter.nmppt` a warning box appears -
  "This inverter has {m} MPPT inputs but you defined {n} strings" + suggests a model with more
  trackers or `ceil(n/m)` inverters (green "fit" box when OK; hidden for micro-inverters), plus a
  `mod explicativ` line `n_șiruri ≤ n_MPPT`. schema.html: the `ac_chain` rule now instantiates
  `ceil(nStrings/nmppt)` inverter UNITS, chunks the strings across them, and gives each its own MCB
  converging on a shared RCD -> [SPD~] -> meter -> grid (collapses to a single INV/MCB when one unit
  suffices); a new audit rule **R-009 (MPP-tracker input capacity)** reports ✔/✖ with the shortfall
  reason. inverters.html gained a "PV inputs" group (MPP trackers, DC string inputs, AC power) +
  `N× MPPT` in the list sub-line. New i18n: `cmp.inputs.*`, `cxp.inputs`, `rule.mpptcap.*`, `inv.inputs/nmppt/ndc/acpower`.

- **Economics (`economics.html`) — mode explanation moved into "mod explicativ".** The active
  self-consumption mode's name, formula and plain-language description now render inside the existing
  "Show working" Explain box, right after the `Eauto = ...` block (so they only appear when learning
  mode is on), instead of the always-visible reference card from 0.9.14 (removed). Also **dropped the
  "Bilanț anual (optimist)" mode** — 100% in "Rată autoconsum" reproduces it, so the redundant option
  is gone (legacy `scMode='anual'` projects fall back to Rată). No formula change.

## [0.9.14]

- **Economics (`economics.html`) — self-consumption modes explained inline.** (Superseded by 0.9.15:
  the always-visible reference card was replaced by an in-"mod explicativ" explanation.)

## [0.9.13]

- **Economics (`economics.html`) — self-consumption model.** The annual benefit B no longer assumes
  all consumption is self-consumed (`Eauto = min(Wp, Wc)`, which over-states the benefit). A new
  **Autoconsum "Mod de calcul"** selector offers four levels of realism, and B is now
  `Eauto·e1 + (Wp − Eauto)·e2` with Eauto from the chosen model:
  - **Rată autoconsum** (default, `ECON_SELFCONS_RATE = 40%`): `Eauto = min(Rac·Wp, Wc)` — the
    professor's recommended first-order estimate; conservative, no data dependency.
  - **Bilanț lunar**: `Eauto = Σ min(Wp,m, Wc,m)` from the real monthly PVGIS production
    (`sizing.monthlyProd` / `optimalMonthlyProd`) + monthly consumption (`consumption.monthly`),
    each scaled to the (possibly overridden) annual totals. Degrades to annual with a note when
    monthly data is missing (e.g. detailed-consumption mode nulls `consumption.monthly`).
  - **Profil zi/noapte** (`ECON_DAY_FRACTION = 35%`): `Eauto = Σ min(Wp,m, Wc,m·f_zi)` — only the
    daytime load can be self-consumed without storage.
  - **Bilanț anual (optimist)**: the old `min(Wp, Wc)` upper bound, kept for comparison.
  - Adds an "Autoconsum" row (real vs optim) to the indicators table, a live self-consumed/exported
    note, model-aware "Show working" blocks, and persists `scMode / rac / dayFrac`. Verified against
    the course example (annual mode → B = 18,859 lei).

## [0.9.12]

- **Inverter MPPT-input scrape: new `nmppt` (number of MPP trackers) + optional `ndc` (total DC
  string inputs) keys on INVERTER_LIST.** A reusable, auditable 3-stage pipeline mirroring the
  module-maxfuse one: `scripts/collect-inverter-sources.js` (parse INVERTER_LIST → download the 77
  unique datasheet URLs to `scripts/_invds/`) → `scripts/extract-inverter-mppt.py` (pdfplumber text
  + table fallback; multilingual "Number of MPP trackers" labels EN/DE/PL/IT/FR/ES/NL incl. SMA's
  "independent MPP inputs" and inline `N*MPPT` / `strings per MPPT a/b/c/d` forms; **agreement-gated -
  a family is auto-resolved only when it yields ONE unambiguous MPPT count, never a guess**) →
  `scripts/apply-inverter-mppt.js` (idempotent, surgical inject after each entry's `pac:` line).
  **ALL 224 inverters now carry `nmppt`** (dist: 1→25, 2→162, 3→31, 4→6; 71 also got `ndc`):
  143 auto-resolved with an audit line per value, and the residual **81 hand-resolved from the
  datasheets** into `scripts/inverter-mppt-manual.json` (per-id provenance in `.src`) -
  per-model-column reads (GoodWe/SMA/Fronius aligned by header), architectural facts (SolarEdge &
  Enphase = 1 MPPT, Victron = single SmartSolar controller), micro-inverter T-suffix (HMS-x-`4T` = 4),
  and Kostal recovered via WebFetch when its server blocked curl. Sets up the components.html "not
  enough inputs" check and schema.html multi-inverter logic. `scripts/` is gitignored (dev-only) so
  only the `nmppt`/`ndc` values in the tracked js/string-ui.js ship.

- **New page `schema.html` (Schemă electrică) - single-line editor on a cartouche zone grid (PoC).**
  A dedicated step (phase D) that draws the PV single-line from the project (strings → string fuse → DC SPD
  → DC disconnect → inverter → MCB → RCD → [AC SPD] → meter → grid + PE) onto a **cartouche**: outer frame,
  0-9 column ruler, A-H row letters, faint cell grid, and a title block bound to `Project.meta` (proiect,
  beneficiar, proiectant/atestat ANRE, faza, cod doc). The model is a **directed graph**: every device is a
  numbered **node** (strings = n1..n, fuses = n+1..2n, SPDs = 2n+1..3n, then the chain) and connections are
  `source-node → destination-node` edges (node1→node4, node2→node5, node3→node6 = string→fuse); node ids show
  on each symbol + in the placement table. The **edge list is editable** - a Conexiuni panel with per-edge
  source/destination node dropdowns + add/remove/reset (custom `schema.edges` override the auto defaults);
  editing an edge re-wires AND re-derives symbol rotation, since rotation follows connectivity. Each device gets a **cartouche-cell address** the
  engineer sets via **Col/Rând dropdowns** (the "zone grid" approach - human does coarse placement, the tool
  snaps symbols to cells and routes orthogonally between them, sidestepping the hard auto-routing problem).
  Placement persists in `Project.section('schema').layout = { node: {col,row} }`; Export SVG + Reset.
  **Layout:** three panes on the top row (placement · connections · **Proiectant**), the schematic full-width
  below. The **Extras** pane keeps the **Nume proiectant** field bound to `meta.proiectant.nume` (shows in the
  cartouche title block, reused by pt.html) and adds **cable label rules**: every wire gets a designator (W#)
  plus a cable type by category (DC string / DC main / AC) - DC solar defaults to **H1Z2Z2-K** (EN 50618),
  AC to a generic copper LV cable; each is editable (`schema.cables` override) and the W# + cable is drawn on
  the wire (cable shown under mod explicativ). So each String→Fuse link carries its label + cable, like the
  W-series on a real single-line. **The graph is built by an AUDITABLE RULE BOOK** - an ordered
  `RULES` list (`pv_strings`, `pv_string_overcurrent`, `pv_string_spd`, `dc_disconnect`, `ac_chain`,
  `earthing`), each rule carrying `ref` + `standard[]` (IEC 62548, IEC 60364-7-712, I7, …) + `clause` +
  `justification`, a **`condition(G)`** that decides IF it applies (with a dynamic reason) and an **`apply(G)`**
  that mutates the graph. The "Reguli de conectare (raport)" panel renders this as a **technical report**:
  per rule a ref + title + **✔ Aplicată / ✖ Neaplicată** verdict, and under **mod explicativ** the references,
  the reason, and the nodes it created - so an ANRE verifier sees not just F1-F3 but WHY they exist and under
  which normative. Conditional rules compose via **per-string branch tails**: when a rule is skipped the next
  rule attaches to whatever IS there (no fuse -> SPD straight off the string), so the chain never breaks.
  `makeGraph` context = `add`/`link`/`byKind`/`addBranch`/`append`. **R-002 uses the real IEC 62548 criterion**
  - gPV fuse required when reverse current `(Sa-1)·Isc` exceeds the module max series fuse (`MODULE_LIST[].maxfuse`
  via `string-ui.js`; falls back to the protections override or 15 A) - and a **force-fuses toggle (default ON)**
  includes them anyway when not strictly required (verdict: ✔ Aplicată / ✔ Aplicată (forțat) / ✖ Neaplicată).
  **SPD symbol** = a SHUNT (line in->out, bidirectional arrester ▼▲ + embedded-PE earth always screen-DOWN).
  **R-004 is now PER STRING**: one **switch-disconnector** (new IEC symbol: circle fixed-contact = input,
  open blade, hinge = output) after each string's SPD, all converging on the inverter (Q1/Q2/Q3 -> INV) -
  because at high DC voltage a disconnector needs several poles in series for arc extinction, making one shared
  unit for many strings impractical (justification + IEC 60364-7-712 / 62548 in the report). Fuse-disconnector
  lost its hinge dot. **Multi-port nodes**: ports generalised from `{in,out}` to a NAMED-PORT map and edges can
  name a port (`fromPort`/`toPort`, default `out→in`) - the **inverter is now a 3-port node** (DC in left,
  AC out right, **battery bottom**), and a conditional **storage rule (R-006)** adds a battery node (two-cell
  symbol) linked to the inverter's `bat` port when the project carries a `components.batteryId`. The **inverter
  glyph** was redrawn (box split by a diagonal: DC ⎓ top-left, AC ∼ bottom-right). The **SPD now has a real PE
  port** (the embedded ground was removed): a per-SPD-earthing rule (R-007) adds **one earth node per SPD**
  (`PE1..PEn`) wired from the SPD's `earth` port - on top of the main PE bar. These are **REAL grid-placed nodes**
  that appear in the "Amplasare elemente" placement card (the source of truth - every blueprint item is listed
  there and is movable via the Col/Rând dropdowns; default col 2 below their SPD) and carry their own node ids
  (n18..); only the PE conductors stay out of the W-series cable labels. **SPD label+sub render to the LOWER-RIGHT**
  of the symbol (the arrester + PE wire occupy the space below). IEC symbols so far: fuse-disconnector, SPD
  (shunt), switch-disconnector, battery, inverter, earth. This is Phase 1 of the schematic roadmap; pretty wire
  routing and the rest of the symbol library are next. New `nav.schema` + `sx.*` i18n, `schema` state section, SITE_MAP entry
  (renumbers wind/report/pt → 13/14/15), deploy.sh upload + invalidation.

- **IEC 60617 symbol library (`js/iec-symbols.js`) with a directed PORT model - first symbol: fuse-disconnector.**
  Every symbol is a **two-port directed device**: defined ONCE canonical-vertical with an `in` (ENTRY) and `out`
  (EXIT) terminal - for the fuse-disconnector, entry = the fixed-contact bar, exit = the blade hinge. Rotation is
  **derived from connectivity, not chosen**: `IEC.render(name, cx, cy, {rot, h, stroke})` returns
  `{svg, in, out}` with the ports in WORLD coords after rotation, and schema.html rotates each device so its
  ENTRY faces the wire arriving from the upstream device's EXIT (device N.out → device N+1.in), then routes wires
  **port-to-port**. So the string (device 1) exit lands on the fuse (device 2) entry, with the fuse turned
  horizontal (entry-left) automatically. `IEC.ROT` maps an entry-facing side → rotation. The plain gPV fuse box
  in schema.html is replaced by `fuseDisconnector` (gPV sub + F# label kept, upright). Added to deploy.sh.

- **Save-on-navigate: Next (and Prev) commit the current step; a pagehide net backs it up.**
  Navigation was a plain `<a href>` with no save hook and no `beforeunload` net, so persistence relied
  entirely on per-input live handlers - and an audit found a real gap (**wind.html's `w-bw` ballast-width
  input was never persisted**; change it, leave, it reset to 35). Now `_flushStep()` calls a page-provided
  **`window.saveStep()`** from the **Next/Prev** click before navigating, plus a one-time
  **`pagehide`/`visibilitychange`** net. No separate Save button (folded into Next; per-page Calculate/Generate
  buttons remain for that action). Every step page sets `window.saveStep` to its persist/calc fn (15 pages
  wired). **wind.html now persists `w-bw`** to a new `Project.wind.bw` (prefilled on load, live-saved on input).
  Verified: 13/13 Playwright tests green, wind `w-bw` round-trips.

- **Fixed: header version showed `v?` on every step page except index.** `site-nav.js` read the
  version from `APP_VERSION` (config.js), but most step pages don't load config.js - so the topbar
  fell back to `· v?`. site-nav.js now derives the version from its **own `?v=` cache-buster** (which
  the version bump keeps in lockstep with APP_VERSION) when the global isn't present, so `· v0.9.12`
  shows on all pages. APP_VERSION stays the single source.

- **Security: CloudFront response headers + offline-fallback hardening (secops audit 2026-06).**
  Added a viewer-response **CloudFront Function `solar-pv-security-headers`** (`scripts/apply-security-headers.sh`,
  idempotent) emitting `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` (which also blunts
  the magic-link `?e=&k=` Referer leak) and `X-Frame-Options: DENY` - via a Function because the distribution
  is on CloudFront's Free pricing plan, which rejects custom response-headers policies. HSTS and CSP were
  deliberately deferred (HSTS is sticky; CSP needs the inline-handler refactor first). The gate.js **PBKDF2
  offline fallback was removed entirely** (`GATE_HASH`, the `pbkdf2Hash` helper and the shared `solar-pv-salt`
  are gone) - access is now validated ONLY by the Lambda, eliminating the crackable-hash surface. A fresh login
  on a network/CORS error fails closed; stored sessions still pass through the silent revalidation. Local dev
  consequently needs the Lambda's CORS allowlist to include the dev origin (e.g. `http://localhost:8091`) or a
  local CORS proxy. Known debt (deferred): password-as-credential → session-token exchange, and moving the
  report/pt gate server-side (both need the shared Lambda).

- **Economics step: auto-prefilled prices, project cost and committed defaults (economics.html).**
  The page now wires `js/electricity-prices.js` (previously unused): a **country dropdown** (ISO2 + EUR
  price, sorted) prefills **e<sub>1</sub>** from the retail price table, auto-detected from the project
  location - the Location step now reverse-geocodes the clicked point to `location.countryCode` (map.js) -
  with manual override for frontier zones. **e<sub>2</sub> = 0.5 x e<sub>1</sub>** (factor `ECON_E2_FACTOR`),
  editable. **C<sub>FV</sub>** is estimated from an editable **€/Wp benchmark x system kWp** (`ECON_EUR_PER_WP`
  default 1.1), shown with a `(€/Wp × kWp)` breakdown. A **static FX table** (`FX_PER_EUR`, config.js)
  converts the EUR price table into the selected currency, and switching currency FX-converts every money
  field so the analysis stays consistent. **Analysis horizon defaults to n = 20 years** and **rate to 7 %**
  (`ECON_DEFAULT_N`/`ECON_DEFAULT_RATE`). All resolved defaults are **committed to state on render** (the same
  "normalize to plain" pattern as the cable fix) so n / rate / e<sub>1</sub> / e<sub>2</sub> / C<sub>FV</sub>
  stop exporting as `null` when left untouched. New economics constants live in config.js; new state fields
  `economics.country` / `economics.eurPerWp` / `location.countryCode`; `electricity-prices.js` added to
  `deploy.sh`.

- **Fixed: per-string DC cable lengths were never persisted when left at the default (Conexiuni step).**
  `connections.html` rendered each string's cable-length field with the default `20 m` pre-filled and ran
  the whole ΔU% / section / fuse calculation on it, but `connections.cables` was only written on a manual
  `input` edit - so a step left at the default exported `cables: []` and every downstream consumer (report,
  PT, the ΔU verification) saw nothing. Now `renderStrings()` commits the displayed default into state on
  render (and `saveState()` once if anything was seeded), so the value that is shown and computed is also
  saved. Also **normalised `cables` to a plain `{ stringId: lengthM }` object** at load - legacy/empty state
  was `[]` (array) while populated state was `{}` (object); the loader now coerces `[]`/holes to a clean
  object so lookups and the exported JSON are stable. (Repro: "Trei direcții" export had `cables: []` though
  the step looked complete on screen; "So-Ce?" - where the lengths were typed - correctly had `{"1":40,"2":40}`.)

## [0.9.11]

- **Terrain horizon shown on the sun-path / horizon charts (steps 1 & 2) + folded into the project state.**
  Picking a location on the map (step 1, index.html) now lazy-fetches the terrain horizon for that site (the
  horizon tiles) via `fetchTerrainHorizon()` [map.js], stores it in `Project.location.terrainHorizon`
  (deg[36] Nav), and redraws - a GREEN silhouette (#27ae60) behind the existing RED obstacle horizon on both
  `canvas.js` charts (drawSunPath + drawHorizonChart). obstacles.html (step 2) restores it straight from the
  project state (no map/grid loaded there). The terrain horizon is already in the yield shading
  (`mergeTerrainHorizon`), so it now matches what the charts show. (`data/kt-europe-01.png` deleted - the
  SARAH3 tile is gone, regenerable via the eumdac pipeline.)

- **Dropped the 1 MB SARAH3 Europe Kt tile (`kt-europe-01.png`) for load time.** Now that the global CLARA
  base is PVGIS-de-biased, the tile only bought ~0.3 pp mean irradiance over Europe (testViz with-tile 2.3%
  vs base-only 2.6%; energy 2.3% vs 3.0%), mostly the native-0.05° Kt resolution in Carpathian/Alpine valleys
  - which the lazy terrain-horizon tiles now partly cover. `KT_TILES` emptied in config.js (file kept in
  `data/`, un-referenced); removed from `deploy.sh` upload + invalidation. testViz no longer waits for a tile,
  labels itself "de-biased CLARA + terrain horizon", and shows a **⛰ terrain-horizon indicator** per point
  (max blocking elevation, e.g. Chamonix ⛰32°, Skjåk ⛰23°, Predeal ⛰15°) so the horizon effect is observable.

- **CSS consolidated to a single stylesheet + Chart.js vendored.** `css/site-nav.css` and `css/viz.css`
  were merged into `css/style.css` (preserving the cascade order) - every page now links one stylesheet
  instead of two or three; `deploy.sh` upload + invalidation updated. Chart.js moved off the CDN to
  `vendor/chart.umd.js` (4.4.1, the 7 pages that charted now load it locally; Chart.js 4 is pure-canvas so
  no image/font assets needed). **economics.html theme fix:** its input/select fields used `var(--bg2)`
  (the panel-gray) instead of the canonical `var(--input-bg)`, so they rendered gray/off-theme vs every
  other page - now aligned. (Per-page inline `<style>` blocks remain page-scoped; the shared design tokens
  + the canonical `.field`/`.card`/`.note`/`.ok-box` classes live in the one `css/style.css`.)

- **Global Kt de-biased with a bed-leveling mesh (single seamless file, no new tiles).** CLARA's residual
  bias vs PVGIS was probed on a 5° global LAND grid (engine horizontal GHI vs PVGIS MRcalc H(h),
  `scripts/kt-mesh-probe.cjs`), smoothed into one continuous global correction (Gaussian-IDW on the sphere,
  σ=6°, `kt-mesh-build.js`), and BAKED INTO `data/kt-global.png`. No tiles/index/seams - a smooth mesh fixes
  the REGIONAL bias and averages out per-pixel noise. Held-out (testViz): irradiance mean |Δ| **3.8% → 2.6%**,
  reds **16 → 10**, within-±1% 8→18/69; the tropical CLARA cluster (Sahel/equator −6 to −9%) is gone. The
  SARAH3 Europe tile is KEPT - it's now justified purely by RESOLUTION (the 0.25° de-biased base can't resolve
  a Carpathian valley; retiring it pushed Predeal red), not as a bias patch. Skjåk-type isolated snow-noise
  cells and the ERA5-reference points are NOT mesh-fixable (a smooth field can't fix one rogue pixel / match a
  different model). Pre-bias backup at `/tmp/kt-global-prebias.png`; method in `memory/project_kt_mesh.md`.

- **Energy power-chain calibrated to PVGIS (was ~+5% optimistic).** `testViz.html` (new QA page, below)
  split the model error in two: irradiance already matched PVGIS (±~2-3%), but ENERGY ran ~+5% over.
  Root cause (confirmed against the vendored PVGIS source `assets/pvgis/`): we are a MONTHLY climatology
  feeding the cell-temp calc the Kt-SMEARED irradiance + the 24h-MEAN air temp, while PVGIS is an HOURLY
  sim that sees the hot, sunny production hours. Fix, in `js/yield-engine.js` (both NOCT & Faiman):
  (1) `TEMP_KT_BLEND=1.0` - cell temp now evaluated at the CLEAR-SKY POA (production hours are sunny), not
  the Kt-smeared geff; (2) `DIURNAL_WARM_K` - air warmth `K*(G_cs/1000)` added to the monthly-mean T2m so
  it lands on production hours, calibrated PER cell-temp model (NOCT runs hotter -> needs less): `{noct:10,
  faiman:16}`. Faiman cell-temp constants set to PVGIS's own `u0=26.9 / u1=6.2` (were 25/6.84). Result vs
  PVGIS PVcalc over 43 global points: Faiman (= PVGIS's model) mean signed **-0.06%**; NOCT (the default)
  **-0.16%** / |Δ| 1.8%, 28/43 within ±2% (was +5% optimistic). `strings.html` is untouched (own NMOT path).
- **Yield power-model choice simplified to PVGIS Huld only** (dropped the "γ datasheet per module" linear
  option). The temperature-model toggle stays **NOCT (default) / Faiman**.
- **`js/formulas.js` — single source of truth for engine formulas (pilot).** Each `FORMULAS.<id>`
  co-locates the pure compute `fn` (hot path) with its per-language display template + prose, so the math,
  the rendered formula and the explanation divs/viz/tests can't drift. UI calls `Formula.explain(id, params,
  lang)` on demand. Migrated so far: the cell-temperature formulas (`tcell_noct` / `tcell_faiman`,
  `_calcTcell`) and the full Hofierka clear-sky model (`clearsky_dni/dhi/ghi` + sub-functions
  `clearsky_tn/fd/rayleigh/airmass`, `clearSkyHofierka` + helpers) - the decomposition mirrors PVGIS's own
  modules 1:1 (verified against `assets/pvgis/`). The yield.html model note renders the clear-sky and temp
  formulas inline from the registry; coefficients render at full precision. The Faiman `26.9 / 6.2` constants are now
  `FAIMAN_U0 / FAIMAN_U1` in `config.js`
  (single source — flows into both the math and the displayed formula). `testViz.html` month rows are now
  color-coded (seasonal `MCOLS` palette).
- **Transposition models migrated into `js/formulas.js`; canonical name is now "Muneer (1990)".** The three
  inclined-diffuse models (`transpose_muneer` [default], `transpose_haydavies`, `transpose_perez` + the Perez
  coefficient tables) now live in the FORMULAS registry with bilingual formula+prose; `yield-engine.js` keeps
  thin global aliases (`transposeHofierka` etc.) so every caller works unchanged. The model the engine has
  always used IS Muneer (1990) - a verbatim port of PVGIS's `assets/pvgis/diffuse/inclined.py`; the old
  "Hofierka/Suri 2002" label on the *transposition* was a misnomer (the clear-sky model keeps that name). The
  yield.html transposition radio now reads **"Muneer (1990)"** (value `muneer`; `'hofierka'` stays a back-compat
  alias). Hay-Davies + Perez are retained as switchable history.
- **Terrain-horizon tiles (SRTM-class) - fixes the mountain-valley over-reads.** testViz decomposition
  showed the deep-valley reds (Chamonix +11.7%, Novache +14.4%) are PURE terrain: PVGIS shades the winter
  sun with its SRTM horizon, we had none (the 0.1° `elevation.png` is far too coarse - it smears valley
  walls, recovering <3% of the needed ~12%). New pipeline `scripts/build-horizon-tile.js` fetches ~90m AWS
  Terrarium DEM (no auth), computes the per-cell terrain horizon (A azimuth layers, curvature+refraction),
  and writes a compact multi-layer PNG (`data/horizon-<name>.png`) loaded by `js/horizon-png.js` and
  resolved by `js/horizon-grid.js`. **LAZY-LOADED on a fixed 1°×1° convention grid**
  (`data/horizon/<lat>_<lon>.png`, SW-corner signed ints; geometry DERIVED from the id, no manifest):
  `ensureHorizonTile(lat,lon)` fetches only the covering tile on a location change / yield run, and a tiny
  global bitmask `data/horizon-index.png` (~1KB, `scripts/build-horizon-index.js`) tells the client which
  tiles exist so flat land NEVER 404s. So the globe needs ~5-6k mountain tiles (~300MB on S3) but each USER
  lazy-fetches ~1 (~50KB). Live in yield.html (mountains shade even with the obstacle toggle off) and testViz
  (Chamonix +11.7%->-6.8%, Novache +14.4%->+6.0%). The high-latitude over-reads (Skjåk +25%) are NOT terrain -
  they're CLARA grid-cell noise over snow (data-quality limit, unfixable by a smooth correction); the tropical
  -7% under-reads are CLARA under-reading the Sahel (safe direction). Batch driver
  `scripts/build-horizon-region.js <bbox>|europe` builds a whole region: relief-screens flat cells against the
  0.1° elevation.png (no fetch), resumable, zopfli-recompresses each tile (`zopfli-png.js`) and rebuilds the
  index after every tile (final `--zopfli` pass); cron-friendly (parametrized by lat/lon). Cold tile ~9s
  (parallel DEM fetch). Europe sweep (~600 mountain cells) in progress.
- **Kt diffuse split migrated into `js/formulas.js` too** (`FORMULAS.kt_diffuse_split`). The SARAH3-calibrated
  cubic Kd(Kt) was hardcoded inside `yield-engine.js` (`liuJordanKd`), out of the registry - so the formula
  viewer/explanation path couldn't see it and a diagnostic script silently used a stale legacy copy. It is now
  in the registry (with named coefficients + bilingual prose); `liuJordanKd` is a thin alias. Math is byte-
  identical (testViz unchanged). Remaining hardcoded formulas to migrate: Huld η, IAM, the Linke `TL_TABLE`.
- **Investigated the high-latitude tilted over-read - it is NOT the beam/diffuse split.**
  `scripts/investigate-highlat-diffuse.js` scrapes PVGIS's horizontal diffuse fraction at 8 points and shows
  the SARAH3-calibrated diffuse cubic already in the engine closes the gap on the SARAH3 domain (annual Kd gap
  within ±2.8pp at Skjåk/Reykjavík/Bucharest/Madrid, down from -6 to -9pp with legacy Erbs). With Muneer
  confirmed PVGIS-exact too, the residual high-lat over-read is the Kt-grid value (CLARA) + terrain horizon,
  not the diffuse model. (ERA5-domain points - Siberia/Yukon/Alaska, outside SARAH's disc - use a different
  PVGIS radiation model and carry ~no winter energy, so they are weighted down.)
- **`testViz.html` - engine-vs-PVGIS observability page.** Runs the engine client-side over a 43-point
  global set (`scripts/build-testpoints.js` precomputes the PVGIS PVcalc reference into `data/testpoints.json`,
  at each point's PVGIS-optimal tilt + hemisphere azimuth), tabulating per-point per-month ΔE (energy) and
  ΔH (irradiance), click-to-expand months, sortable.
- **SARAH Kt tile now sampled NEAREST-CELL (was bilinear) — fixes a valley over-read.** `resolveKt` read the
  0.05° tile by bilinear interpolation, which re-blended an isolated cold mountain-valley cell with its
  brighter slope neighbours, undoing the native-resolution isolation (Braşov horizontal +3.1% vs PVGIS, of
  which +2% was this; ruled out declination/longitude/TL/clear-sky first). `js/kt-grid.js _ktNearest` snaps to
  the nearest tile cell; the 0.25° CLARA base keeps bilinear. Braşov horizontal +3.1%→+1.1%, South tilt-30
  +3.5%→+1.5%, West +2.6%→+0.7%; testViz unchanged (flat points sit near cell centres).
- **Kt Europe tile feathered + grids re-origined to `-90/-180`.** The SARAH-3 tile now blends into the
  CLARA base over its outer 12 cells (boundary step 4-6% -> 0.5-2.5%). CLARA base resampled from its native
  -89.875 cell centres onto a clean `-90/-180` grid (matches every other grid); `KT_LAT_MIN/LON_MIN` updated.

## [0.9.10]

- **Adopted one unified app version (`APP_VERSION` in `js/config.js`).** The whole app shares ONE version,
  shown in the header (`· v0.9.10`, replacing the "flux proiectare FV" subtitle) and used as the single
  cache-buster for every asset: data PNGs via `?v=' + APP_VERSION`, JS/CSS via the literal `?v=0.9.10` in
  every page (`vendor/*` exempt). Policy: bump the patch on every change (0.9.11, 0.9.12, … while 0.9 is
  the dev branch) → close 0.9 when stable → 1.0.0 RC. Replaced the old scattered per-file `?v=N` numbers.
  See the dev guide "Versioning". (Older releases below predate the scheme.)
- **Beam/diffuse split recalibrated to PVGIS-SARAH3 -> tilted-plane accuracy fixed.** The Hofierka path
  split monthly GHI into beam/diffuse with the Erbs/Liu-Jordan (1982) monthly correlation, which
  underestimated the diffuse fraction by 3-7 pp vs PVGIS's satellite retrieval. Invisible on a horizontal
  plane (beam+diffuse both land flat) but it inflated TILTED yield +2-5% (the beam over-gains via
  cosAOI/sinEl, worst at low sun = winter/high latitude). Replaced `liuJordanKd()` with a cubic fit to
  PVGIS's own monthly diffuse fraction over 30 European points (`scripts/calibrate-diffuse-pvgis.js`,
  RMSE 6.5pp -> 2.3pp). Tilt-30 vs PVGIS dropped from +2-5% to within ±3% across Europe.
- **Kt accuracy overhaul: ONE native 0.05° SARAH-3 Europe tile over the CLARA base.** Consolidated to a
  single tile (design rule: CLARA base + exactly one tile, no nesting), `data/kt-europe-01.png` (1.06 MB,
  483×983). Native 0.05° from CM SAF SARAH-3 (PVGIS's own resolution, NO block-averaging - so it resolves
  the mountain valleys the old 0.1° block-average smeared: Brașov tilt-30 +3.3% → **-0.4%**), 2005-2023
  (period-matched to PVGIS-SARAH3). Box lat 34-58 / lon -11..38 - clipped to Denmark (N), the UK/Ireland
  shore (W) and ~Crimea (E), where SARAH's geostationary view is reliable; the oblique disc edges (far N,
  Atlantic, Caspian) are left to the CLARA polar base (better off-disc). Replaces the coarse 0.25° CLARA
  AVHRR base over the continent, which read -3..-4% low at Roma/Wien/Budapest/Berlin. Built by
  `scripts/sarah3-to-sis-native.py 34 58 -11 38 2005 2023 sis-eu-005` → `build-kt-europe-sarah.js` (reads
  STEP + in/out names from args); 2021-2023 SISmm granules downloaded via `eumdac`. `kt-grid.js
  _ktTileFor()` returns the finest matching tile (order-independent). Bumped `config.js?v=14`,
  `kt-grid.js?v=24`, `yield-engine.js?v=28`. Validated vs PVGIS-SARAH3 (117 blind European points):
  horizontal mean |Δ| 1.1%, tilt-30 2.4%; flat + moderate-mountain Europe (incl. all of Romania) within
  ±1-3%. KNOWN LIMITATION: the deepest Alpine/Pyrenean valleys (Chamonix +9%, Davos, Andorra) read high -
  that is missing TERRAIN HORIZON (PVGIS bakes in SRTM shading; we don't - confirmed: PVGIS hz-off jumps
  +7.5% at Chamonix), NOT a Kt error, and it hits both satellites equally (CLARA is +12.7% there, worse
  than SARAH). The engine already has horizon support (`useHorizon` + 36-value array); populating it from
  a DEM is the future fix.
- **Saves are now fully forward/backward compatible — the version gate is gone (fixes "versiune
  incompatibilă").** `project-state.js` removed the hard `_v !== PROJECT_VERSION` reject entirely.
  `migrate()` now **deep-fills** any project blob onto `blank()`: older saves get missing keys filled
  (incl. nested, so no page crashes on an absent sub-field), newer saves keep unknown future keys
  untouched (round-trip preserves them). The only reshaping is the one historical structural break
  (v1 `strings`/`planes` were objects, now arrays). `_v` is written as an informational tag only and
  never gates. Applied to `load()`, `importState()` and `enterReadOnly()` (JSON file import +
  cloud-save load); rejects only JSON that isn't one of our blobs. Bumped `project-state.js?v=19`
  across all 23 pages.
- **Kt clearness grid rebuilt from EUMETSAT satellite CDRs (SARAH-3 + CLARA-A3).** Replaced the
  PVGIS-API per-cell scrape (which suffered winter snow-albedo "dead pixels") with the CM SAF climate
  data records PVGIS itself derives from, pulled via `eumdac`. Two tiers, both 18-yr 2003-2020 monthly
  climatology, both normalised `Kt_cs = SIS / Hofierka(TL)`: a **CLARA-A3** 0.25° global base
  (`data/kt-global.png`, AVHRR) + a **SARAH-3** 0.1° Romania tile (`data/kt-ro-01.png`, geostationary,
  the tool's home region). A multi-year mean averages out the snow contamination at the source (the old
  build-time despike was rejected as guesswork). Polar/dark-month Kt is gated on clear-sky >= 25 W/m2,
  clamped <= 1.10, and faded poleward (no banding seam). Validates +/-1% (RO/SARAH) / ~2% (global/CLARA)
  vs PVGIS-SARAH3. New pipeline: `eumdac` -> `*-to-sis-grid.py` (h5py) -> `build-kt-{europe-sarah,global-clara}.js`.
- **Linke turbidity recalibrated from CLARA-A3 SISCLS.** The Hofierka-path TL table is now found by
  inverting the clear-sky model to match satellite-measured clear-sky, global 0-90 deg
  (`scripts/tl-clara-9x12.js`, embedded in `js/irradiance-hofierka.js`). Reduced to 9 rows x 10 deg bands
  after proving TL **cancels for horizontal GHI** (downsampling 90->1 rows holds validation flat ~0.5%);
  it still shapes the tilted-plane beam/diffuse split. See SCIENCE.md section 4B.2 / 5.1.
- **mounting.html: roof-plane UI tweaks.** Moved the "Plan acoperiș" dropdown to the end of the
  Layout card (below Mod amplasare). In each plane row of the planes editor, added a prominent
  "Alege șir →" / "Choose string →" link in the cell under Azimut γ (same row as Retragere margine) -
  clicking it scrolls to + focuses the Layout card's string selector to start the string->plane
  assignment. The link reflects state: with no string it's "Alege șir →" (orange CTA); once a string
  is assigned it becomes "Șir S1 ales" / "String S1 chosen" in green (plural "Șiruri S1, S2 alese").
  New i18n `pln.choosestr`/`strchosen`/`strschosen`; i18n -> `?v=102`.

- **Soft gate on Next.** Next stays clickable, but when the CURRENT step isn't finalized
  (`Project.isDone`) it gets a subtle amber dot (white-ringed, so it reads on the orange light-theme
  and blue dark-theme primary) + a "Pasul curent nu este finalizat" / "Current step not completed
  yet" tooltip - a nudge, not a block. Rebuilt by `SiteNav.refresh()`, so it clears live the moment a
  step computes. site-nav.js -> `?v=15`, site-nav.css -> `?v=13`; new i18n `nav.hintnotdone`.

- **Removed unbuilt steps 12-15 (roi, bom, permits, install) from the nav.** Their `ready:false`
  rows dead-ended Next at step 11 (economics); pulled them from `SITE_MAP` so Next now flows
  economics -> wind. Steps renumber: wind 12, report 13, pt 14, defectoscopy 15. i18n keys
  (nav.roi/bom/permits/install) kept for when they're built and re-added. site-map.js -> `?v=13`.

- **Per-step Print / PDF (mobile-friendly, WhatsApp-shareable).** Every workflow step now has a white
  "PDF" button (printer icon) in the stepnav, right before Next -> `window.print()`. A shared
  `@media print` block (`css/site-nav.css`) strips the app chrome, releases the scroll container so the
  whole step flows across A4, forces the light palette (clean white PDF even from dark theme),
  print-color-adjust:exact, and **does not touch `.xpl-host` - so "mod explicativ" prints exactly as
  left on screen** (ON -> the working/formulas print, OFF -> they don't). A print-only `.print-head`
  (project name · step number+name) makes each loose PDF self-labeling. On a phone this is Save/
  Share-as-PDF (iOS shares the PDF directly to WhatsApp; Android saves to Downloads then attaches as a
  document). Scoped to exclude `pt`/`report` (they keep their own document print CSS). site-nav.js
  -> `?v=14`, site-nav.css -> `?v=11` site-wide; new i18n `nav.printpdf`/`nav.printsub`.

- **Kt scraper ~3-4x faster + safer.** Switched from PVGIS `PVcalc` (runs a full PV simulation,
  ~2.4 s/req) to `MRcalc` (monthly horizontal radiation only, ~1 s/req) - averaging its per-year rows
  over the DB's default period reproduces PVcalc's monthly H to <0.04%, i.e. byte-identical Kt after
  rounding, so cells stay consistent with the PVcalc-scraped core. Added `--workers`/`--delay` flags
  (default 6/250 ms, was 3/800) - 25 land cells: 21.6 s -> 7.5 s (default) / 5.0 s (10w/100ms). Also:
  atomic save (temp + rename, no corrupt file on a mid-write kill), and `errKeys` retry is now
  box-scoped (a grow/reset can't drag in out-of-box cells). kt-grow-europe.sh passes workers/delay.
- **Kt scraper: NSRDB/Americas + incremental ring-grow for cron.** `scripts/kt-region-scrape.js`
  gains `--db`/`--ver` (use `--db PVGIS-NSRDB --ver v5_2` for the **Americas** - NSRDB is the GOES
  satellite product, dropped from PVGIS v5_3 which only has SARAH3/ERA5; SARAH3/Meteosat doesn't see
  the Americas) and a `--grow <deg> [--target …]` mode that expands the existing tile box by one ring
  per run (scraping only the new perimeter, clamped to the target, self-healing transient errors,
  stops at target). Lets a cron fill all of Europe (`--target 34 72 -25 45`) over many tiny polite
  steps instead of one ~267k-request hammer. `build-kt-country-tile.js` now **auto-syncs the
  KT_TILES geometry in `js/config.js`** so a grow needs no manual edit; `deploy.sh` invalidates the
  tile PNG. New cron wrapper `scripts/kt-grow-europe.sh` (scrape ring → build → optional deploy).
  Verified: NSRDB returns valid Colorado data, grow expands exactly the perimeter ring (12 cells on a
  2×2 test) and stops cleanly when box == target.

- **Step 11 - Analiză economică (`economics.html`).** New stepper page implementing the Neamț
  course economics (points 18-19, relations (21)-(28)): annual benefit B = self-consumed energy at
  e1 + exported surplus at e2 ((21)/(22)); simple payback Tr = (C_FV - A_program)/B ((23)/(24)); RIR
  = the discount rate for which VNA = 0, solved numerically by bisection ((25)-(28), more exact than
  the course's r-/r+ interpolation); NPV at the market rate; discounted cash-flow chart with a
  red->green break-even crossing; verdict RIR >= market rate. Side-by-side **real vs optim** columns
  (optim = the pt-18 reference, optional input for now) and own-investment vs financed. Prefills W_p
  from `sizing.annualProdKwh` and W_c from `consumption.annualKwh`; currency selector RON/EUR/USD;
  full RO/EN i18n + Explain ("Mod explicativ") working. New `Project` section `economics`; site-map
  step set ready:true. Bumped i18n -> `?v=100`, project-state -> `?v=17`, site-map -> `?v=12`.
- **Optim reference auto-computed (Neamț pt 18).** New `findOptimalTilt` in yield-engine.js (optimal
  tilt at a FIXED azimuth, default 0 = South - "același sistem, poziția optimă"). yield.html's runner
  sums it over all strings (same kWp/losses/module/horizon, just repositioned) into
  `sizing.optimalProdKwh` + `optimalMonthlyProd`; economics.html prefills the optim column from it.
  Derived production/consumption now track their source step (Yield/Consumption) rather than sticking
  as economics overrides. yield-engine -> `?v=27` (yield.html; connections/strings load it unversioned).
  The optim field is **computed-or-empty** (no stale manual fallback - a pre-feature export would
  otherwise show optim < real); a guard note prompts re-running Yield when the optim is missing or
  (defensively) below the real system.
  Pending: autoconsum% refinement and the PT financial-chapter integration (PT-SPEC §5.4 / Phase PT-4).

- **Mobile: minus-sign entry for negative number fields.** iOS numeric keypads (type=number /
  inputmode) have no minus key, making any negative-capable field untypeable on a phone (T °C in
  defectoscopy, azimuth, lat/lon, temperature coefficients, plane deltas, ...). Added a lazy,
  delegated floating `±` button in `theme.js` (loads on all 22 app pages) that appears - on
  touch/coarse-pointer devices only - when such a field is focused (heuristic: `min` absent or `<0`)
  and flips the sign of the typed value. No per-input markup. Bumped theme.js -> `?v=3` site-wide.

- **Kt hi-res tile → Carpathian arc + whole Romania (`kt-carpathians-01.png`).** Extended the 0.1°
  SARAH-3 coverage from the Romania box to the full Carpathian arc (box lat 43-50 / lon 18-30, **8354
  cells**, 30 KB) - RO + the cross-border ranges in UA/SK/PL/HU/RS (Tatras, Eastern Carpathians,
  Serbian Carpathians). New generic `scripts/kt-region-scrape.js` (bbox + `--seed` to reuse an
  overlapping prior scrape - here it reused Romania's 5901 cells, so only ~2460 new were fetched).
  Replaced the `kt-ro-01.png` tile (subsumed; `kt-ro-01.json` kept as source). `KT_TILES['carpathians']`,
  deploy.sh updated.
- **ktViz.html: hi-res tile overlay.** Renders every `CONFIG.KT_TILES` tile as a toggleable layer on
  top of the 1° base (base cleared underneath so the fine cells fully replace the coarse ones at the
  same opacity), with a dashed region boundary and a tooltip that reads the 0.1° node + a region badge
  when the cursor is inside a tile. Generic over KT_TILES (auto-shows whatever tiles exist).

- **Kt grid → 1° base + per-country 0.1° hi-res tiles (hybrid).** The 1° grid can't resolve sub-10 km
  cloud microclimate (Brașov's mountain valley read the regional average, +11.8% vs PVGIS truth). A
  test settled the architecture: **PVGIS-ERA5 at Brașov = +11.5%, identical to the 1° smear** - so a
  *coarse global* product (ERA5 ~31 km, CLARA-A3 ~25 km) doesn't help; only a 0.1° SARAH-3 patch does.
  A *global* 0.1° file would be ~4.5 MB of mostly-redundant upsample. Instead: keep the **190 KB 1°
  `kt1.png` as the base** + ship small **per-country 0.1° tiles `kt-<iso>-01.png`** (Romania =
  **`kt-ro-01.png`, 22 KB**, PVGIS-SARAH3, 5901 cells). `resolveKt()` prefers a tile when the point is
  in its bbox (`CONFIG.KT_TILES`), else bilinear-upsamples the base - **identical output to the global
  0.1° file at ~1/200th the data**. config.js back to 1° base + a `KT_TILES` registry; kt-grid.js
  gains a generic `_ktSample` + tile-loading resolver. New `scripts/build-kt-country-tile.js <iso>`
  (replaces `build-kt01-global.js`, removed); pipeline `kt-<iso>-scrape.js` → `kt-<iso>-01.json` →
  build → add KT_TILES row + PNG to deploy.sh. Removed the 4.5 MB `kt01.png`.
  Verified in-browser (yield.html): RO tile loads, **Brașov Jul 0.716 (SARAH-3 fix), Paris Jul 0.746
  (1° base)**. Bumped config.js→`?v=9`, kt-grid.js→`?v=23`.
  (Earlier investigation, kept for the record: a precompiled horizon grid + on-demand horizon from the
  0.1° DEM both proven unworkable - horizon needs ~90 m data, see scripts/terrain-horizon-proto.js;
  and SARAH-3 is NOT on Copernicus CDS - CM SAF WUI only.)

- **Kt grid: SARAH-3 regeneration over Europe.** `kt1.png` Kt_cs was PVGIS-SARAH2-derived; re-scraped
  PVGIS-SARAH3 (current default, API v5_3) for the Europe box (lat 35-60, lon -11..31) and patched the
  **749 SARAH-land cells** with fresh `Kt_cs = GHI_SARAH3 / Hofierka-clearsky` (same normalizer as the
  generator). Change is small + seasonal (window mean: Feb +0.015, winter slightly up, summer flat;
  Brașov 46,26 Jan 0.50→0.55) - verified against the reverse-engineering round-trip. Sea/out-of-coverage
  cells skip (PVGIS 400); the rest of the globe stays SARAH2/NSRDB/ERA5. Pipeline: `reverse-pvgis-kt.js`
  (validation: our grid round-trips to PVGIS-SARAH2 within quantization 0.003), `regen-sarah3-window.js` +
  `sarah3-regime-test.js` (showed the SARAH2→3 delta is regime-dependent, NOT a derivable global rule -
  Romania +11% winter vs Germany -2%), `sarah3-europe-scrape.js` (3-worker, resumable) →
  `sarah3-europe-apply.js` (patch + verify). Re-zopfli'd (207→190 KB, byte-identical decode).
  **Backups:** `kt1.png.bak` = original SARAH2; `kt1.png.pre-sarah3` = pre-regen. Needs `./deploy.sh`
  (uploads kt1.png + CloudFront invalidation) to go live.
  - Also in this grid: an earlier edge-preserving **Kt despeckle** (spike pixels → clean-neighbour median,
    `despeckle-kt-apply.js`, ~2100 cells, 89% of spikes removed) remains applied outside the Europe box.

- **Module ids renamed to comparepv.com panel slugs (cross-site compatible).** `MODULE_LIST[].id` is now
  the comparepv slug for the 70/117 modules comparepv lists, so `comparepv.com/panel/<id>` resolves and
  the DB cross-references with comparepv; the other 47 get a ruleset-clean slug. 55 ids changed (e.g.
  `trina-solar-tsm-435neg9r.28` → `trina-solar-tsm-435-neg9r-28`, `longi-solar-lr5-...` → `longi-lr5-...`,
  `risen-energy-...` → `risen-...`). Extracted a reusable **SLUG RULESET** (lowercase, ASCII, hyphen-only,
  **no dots/underscores**, `<brand>-<model>`) - documented in the dev guide/README for applying to inverter
  slugs next; `build-module-list.py`'s `to_kebab` updated to it (was keeping dots). Pipeline:
  `map-comparepv-slugs.js` (enumerate brand panel lists, match on normalised model) →
  `apply-slug-rename.js` (rename + rekey all id-keyed artifacts + the 3 build-script anchor ids; aborts on
  any duplicate target id). Map in `scripts/comparepv-slugs.json`, old→new in `scripts/slug-rename-map.json`.
  ⚠ Saved projects referencing an old `moduleId` won't resolve - accepted trade-off for compatibility.
  string-ui.js stays `?v=40` (un-deployed). modules.html unchanged (ids are data-driven).
  - modules.html now shows a "comparepv.com ↗" link next to the datasheet for the 70 comparepv-listed
    modules (flagged `cpv: 1` via `apply-cpv-flag.js`; link = `comparepv.com/panel/<id>`).
  - INVERTER_LIST: all 224 ids already conform to the slug ruleset (no rename needed), and comparepv is
    panels-only (no inverter DB), so no comparepv cross-link for inverters - verified, documented.

- **New step 10 - Protecții (`protections.html`): switchgear/protection selection + single-line diagram.**
  Splits a dedicated protection step out of the (formerly placeholder) economics slot; economics→install
  shift to steps 11-15, wind/report/pt/defectoscopy to 16-19. The page implements the Neamț course
  protection point: per-string DC **gPV fuse/MCB** sized by **formula (20)** `max(Isc;1.25·Imp) ≤ Inf ≤
  min(2·Isc; Iprod,FV; Iprod,inv)` with Un ≥ Vmax,inv (fuse flagged *not required* for single strings),
  **type-2 DC SPD** (Uc ≥ Vmax,inv, In ≥ 10 kA), **DC load-break disconnect** (In ≥ 1.25·Σnp·Isc), the
  >10 m inverter↔DC-board SPD rule; **AC MCB** (In ≥ Iinv,ca) + breaking-capacity check vs the
  connection-point Icc, **RCD** type A/B, **type-2 AC SPD** (Uc ≥ 1.1·Vph, only if inverter↔BMP > 10 m),
  and comms-line SPD note. Reads `components.inverterId`→INVERTER_LIST + per-string isc/imp; design inputs
  (network type, Icc, distances) persist in `Project.section('protections')`. Includes an auto-generated
  **monofilară** schematic (strings→fuse/SPD→disconnect→inverter→MCB/RCD/SPD→meter→grid) rendered from one
  node/wire model to **inline SVG** (theme-aware) and **Excalidraw `.excalidraw` JSON**, both downloadable;
  full `Explain` learning mode + RO/EN compliance accordion. Registered in site-map, deploy.sh and the
  invalidation list; i18n bumped ?v=97→98, site-map ?v=10→11, project-state ?v=15→16 across all pages.
  - Formula (20) upper bound now shows ALL `min()` terms. The DC fuse window's `min(2·Isc; Iprod,FV;
    Iprod,inv)` previously displayed only `2·Isc` (the two datasheet caps aren't in the module/inverter
    DB), so the explain line looked half-finished. Added two optional design inputs - Iprod,FV (module
    max series fuse) and Iprod,inv (inverter max fuse): when filled they enter the `min()` and bind the
    window (verdict/explain show which term binds, e.g. `= 25 A (Iprod,FV)`); when blank the explain
    renders them as muted `(datasheet)` and 2·Isc governs. Persisted in `Project.section('protections')`.
  - `maxfuse` field added to MODULE_LIST (Iprod,FV, the datasheet max series fuse), so protections.html
    auto-fills the FV cap per module (manual input overrides). comparepv.com does NOT carry the fuse
    rating (verified - only max *system* voltage), so it's parsed from the datasheet PDFs: new scripts
    `collect-module-sources.js` (Playwright; our datasheet URL + comparepv re-hosted PDF fallback),
    `extract-module-maxfuse.py` (pypdf + pdfplumber, agreement-gated on the glued `NNA` notation so a
    wrong safety value is never written), `apply-maxfuse.js` (idempotent injection into string-ui.js).
    45/117 modules resolved confidently (33×25 A, 10×30 A, 2×35 A, zero conflicts). comparepv slugs
    don't match our ids 1:1, so `match-comparepv-pdfs.js` enumerates each brand's panel list and
    matches on the normalised model code - it found comparepv hosts a PDF for 45/82 unresolved modules
    (re-extract picked up 10 more). The remaining 72 are in `scripts/module-maxfuse-worklist.json`
    (with the comparepv PDF link where one exists) for manual entry, falling back to the runtime input.
    `build-module-list.py` merges the `module-maxfuse.json` sidecar so rebuilds keep the field.
    string-ui.js `?v=39→40` across all 12 pages that load it.
  - `datasheet` links cleaned up: 34 MODULE_LIST entries had HTML landing pages (not PDFs); swapped
    them to comparepv.com's re-hosted PDF via `apply-datasheet-pdf.js`. Now 110/117 datasheet links
    are direct PDFs (7 remain HTML - comparepv has no panel for those).
  - modules.html (module DB) now shows the new `maxfuse` field as "Max series fuse (Iprod,FV)" in the
    Electrical (STC) group (after Imp); renders the value in A when present, muted "-" when absent.
  - DC fuse now also recommends the **fuse-link body / holder format**. New `GPV_BODY` array (IEC 60269-6
    consolidated, vendor-neutral: 10x38/14x51 @1000V, 10x85/14x85/22x58 @1500V, NH1-NH3 combiner) +
    `pickBody(Vmax,inv, fuseA)` = smallest body clearing both the voltage class and the fuse current.
    Per string shows e.g. "10x38 · 1000 V gPV" (≤1000 V systems) or "10x85 · 1500 V gPV" (>1000 V).
    i18n `px.fuse_body`. (Note: 14x51 gPV is capped at 1000V per compliant vendors - Mersen/Bussmann/
    DF/ETI; "1500V" 14x51 holders on the market are not IEC 60269-6 backed, so 1500V uses 10x85/14x85.)
    A **"DC fuse body/holder" override selector** in the design card (Auto + every GPV_BODY format)
    lets the designer force a format; an under-rated pick (body vmax < Vmax,inv or imax < fuse) is
    flagged "under-rated - check V/I". Persisted as `protections.bodyOverride`.
  - AC-protection accordion enriched (notes only, no schematic/logic change) after a topology review:
    the MCB↔RCD order is set by the wiring code (UTE C15-712-1/NF C15-100/BS 7671), not the inverter
    manual; in series they're order-independent for overcurrent and an RCBO collapses the question; RCD
    type A + 30 mA for persons (type B only without internal DC RCM, IEC 62109); transformerless leakage
    → a shared RCD needs headroom (Huawei ≥500 mA × inverters); one dedicated AC disconnect per inverter
    (Huawei/Growatt); grid (not the current-limited inverter) is the prospective-Icc fault source.

- **Wind load: exposure-zone diagram now renders for roof-plane layouts.** With roof planes, mounting saves
  `rows = perRow = 0` (planes replace the rectangle), so `drawZoneSVG` got all-zero geometry and blanked the
  "Exposure zones - indicative" SVG. wind.html now synthesises a representative ~square grid from the total
  module count (module side ≈ sqrt(avg module area), pitch/footprint follow) when no rectangle grid exists,
  so the F/G/H zone map + per-zone ballast table render, and the zone split becomes geometry-aware instead of
  a flat fallback. Indicative only (the page already disclaims it's not a per-module structural calc).

- **Nav: dropped the symbol parentheticals from two grid-map labels** - "Clearness (Kt)" -> "Clearness",
  "Extreme wind (vb,0)" -> "Extreme wind" (RO: "Indice senin", "Vânt extrem"). i18n bumped to ?v=97 across
  all pages.

- **All viz tooltips: clean numbers (2 dp, no trailing zeros, no float garbage).** Grid-node coords were
  printed from raw `LAT_MIN + i*STEP`, which at 0.1deg accumulates float error (e.g. `47.30000000000001 N`),
  and values showed trailing zeros (`vb,0 = 21.00`). Each tooltip now formats every number through
  `fnum = x => (+x).toFixed(2).replace(/\.?0+$/,'')` (the project rule: 2 dp, strip trailing zeros) -
  coords, the headline value, monthly values, annual mean, and the cursor read-out. Applied to all six
  viz pages.

- **Extreme-wind: Turkey added, Canada de-sparsified, Bulgaria land completed.**
  - **Turkey** was absent (its `TR.kml` was fetched but never wired). Wired into `kml-zones.js` +
    `countries.js` EXTRA as a single TS 498 zone = 28 m/s (the 8 m layer; TS 498's q=v^2/1600 puts v=28
    at q~0.49 kPa -> EN vb,0~28, so treated as vb,0, LOW conf), and painted via the standalone country
    painter (8,235 cells).
  - **Canada** had only ~2,951 painted cells INSIDE its boundary (NBC 2020 is point/location-based, not a
    contour map) - effectively invisible. New `scripts/fill-country-interior.js` does a mask-bounded
    multi-source BFS: it floods the empty cells INSIDE a country's Natural-Earth polygon from the nearest
    painted cell, so land completes without bleeding into the sea. Filled 150,698 Canada cells (now ~90%;
    far-north disconnected Arctic islands with no nearby seed stay empty). Heavily interpolated from sparse
    points - a screening estimate, blocky by nature.
  - **Bulgaria** "empty pixels": the same interior fill closed the 33 SW mountain-border land cells the
    BG.kml zonation didn't cover; the Black Sea coast correctly stays empty (outside the boundary). Also
    re-ran the converged hole-fill (Turkey filled its SE neighbour, freeing 89 more grid-wide).
  - Grid 1,059,328 -> 1,218,383 cells; re-zopfli'd 103 KB.

- **Temperature grid: repaired 174 silently-failed cells + made future failures visible.** Scattered
  cells (Spain, Germany, Romania, Iraq, ...) read 0 C in ALL 12 months - physically impossible, so they
  were failed NASA POWER scrapes. Root cause: generate-temperature-grid.js initialised its working array
  to 0 and, on give-up, left it at 0 (it even logged "storing 0"), so a failure looked exactly like a
  valid 0 C. Fix: new `scripts/rescrape-temperature-bad-cells.js` re-fetches ONLY the all-12-equal-sentinel
  cells from NASA POWER (174 found, all repaired with real data, e.g. Iraq 34N/43E now Jan 8 / Aug 35 C),
  then regenerate temp1.png + zopfli. The generator now inits the working array to a 32000 sentinel (never
  silently 0) and clamps to +127 C on the Int8 write, so any still-failed cell shows as an impossibly-hot
  bright-red error instead of a plausible 0 C. The Int8 grid can't hold 32000 itself, hence +127 C as the
  in-grid marker. kt/wind/tl grids checked - 0 gap cells, no action needed.

- **All viz pages: debounced hover readout.** The `#map-wrap` mousemove handler rebuilt the tooltip
  (lat/lon projection + 12-month array + innerHTML) on EVERY move event - heavy CPU while sweeping the
  cursor. Now it stashes the cursor coords, hides the stale tip during movement, and only computes + shows
  the readout ~90 ms after the mouse STOPS (clearTimeout/setTimeout debounce; mouseleave clears the timer).
  Applied to elevationViz, ktViz, tempViz, tlViz, windViz, extremeWindViz. The tooltip body is unchanged -
  it runs against a stashed `{clientX, clientY}` so the math is identical, just deferred.

- **kt/temp/tl/wind viz: offscreen `buildGridCanvas()` rendering (was per-cell fillRect).** All four 1deg
  monthly grids now use the same fast path as elevation/extremewind: the selected month is pre-rendered to
  an offscreen NLONS x NLATS canvas once (via a 256-entry colour LUT keyed by the raw PNG byte, so a month
  rebuild is a pure array-copy ~2 ms, not 65k ramp+regex calls ~870 ms), and draw() blits one strip per
  latitude row at its Mercator y, replicated for the +/-360deg world-wrap copies. Draw ~3 ms, month switch
  ~5-10 ms. tlViz keeps its polar-night hatch by overlaying the (opaque) pattern on the polar rows after the
  base blit. Identical output; pan/zoom/month-drag now smooth.

- **Extreme-wind: Greenland added at 36 m/s** (matched to Iceland - no national wind standard). Added to
  countries.js EXTRA so a full regen reproduces it, and painted onto the shipped PNG now via a new reusable
  standalone `scripts/paint-extremewind-country.js "<NE ADMIN>" <vb0>` (loads the Natural-Earth admin0
  polygon, centre-samples cells, only fills currently-empty cells so neighbours like Iceland are untouched,
  Sub-encode + .bak). 67,735 cells; map cells 991,593 -> 1,059,328. Avoids the swap-thrashing full regen.

- **Elevation viz: de-dupe header + correct size.** Dropped the resolution from the title (it duplicated the
  stats and went stale on the 0.5deg switch); the grid stat now uses the compact ktViz style
  "Grid: 1801x3601 @ 0.1deg" (was "Size: 0.1degx0.1deg - active (config.js)"). Resolution dropdown corrected
  840 KB -> 745 KB (post-zopfli).

- **Elevation viz: full 0.1deg by default + fast rendering.** elevationViz.html now defaults to the
  0.1deg ETOPO2022 grid (was the 0.5deg Gaussian-blur backup) and renders it with the same
  offscreen-canvas path as the extreme-wind viz: a 256-entry colour LUT keyed by PNG pixel value, the
  whole 3601x1801 grid pre-rendered to an offscreen canvas ONCE on load, and per-frame blitting of one
  strip per latitude row at its Mercator y. ~9 ms draw at world zoom; mountains and coastlines now
  resolve (the 0.5deg blur hid them). The runtime elevation lookup (map click -> site elevation) was
  already 0.1deg via CONFIG.elevationUrl + getElevationGrid; no change needed there.

- **All grid PNGs re-compressed with zopfli.** New standalone `scripts/zopfli-png.js` (NOT part of any
  generate-*.js) recompresses an already-generated grid PNG's IDAT with zopfli WITHOUT re-filtering - it
  inflates the existing all-Sub scanlines and deflates those exact bytes again, because the browser loaders
  hardcode Sub reconstruction and ignore the filter byte (zopflipng would re-pick filters and break the
  decode). Each output is verified byte-identical (round-trip inflate + Sub-decode pixel compare); originals
  kept at `<png>.bak`. Uses @gfx/zopfli (WASM devDep, no native build). Applied to all 10 data grids:
  elevation -5.09%, elevation05 -4.46%, kt1 -8.25%, temp1 -10.94%, temp5 -10.04%, tl1 -8.38%, tl5 -6.65%,
  wind1 -5.90%, wind5 -2.98%, extremewind1 -12.15%. Total ~119 KB saved (1.79 MB -> 1.67 MB across grids).

- **Extreme-wind: fill interior holes (Bulgaria + global).** Some land cells stayed empty even though
  they were ringed by painted neighbours - rasterisation artifacts where the cell centre + corners all
  landed in a sliver between two adjacent zone polygons (Bulgaria had 11). Added "Pass C" to the grid
  generator and a matching standalone `scripts/fill-extremewind-holes.js`: any empty cell with >=3
  painted orthogonal neighbours is filled with the MODE of those neighbours (tie -> higher), iterated to
  convergence on fresh snapshots so chained holes close while genuine 2-cell channels (straits) - which
  never reach 3 painted neighbours - stay open. Filled 1,886 holes globally (14 passes); Bulgaria now 0.
  Cells 989,707 -> 991,593. The standalone script avoids re-running the full global paint (which holds
  every parsed KML polygon in memory and swap-thrashes); original kept at data/extremewind1.png.bak.

- **Extreme-wind viz: fast rendering (was very slow at 0.1deg).** The overlay redrew every visible cell
  per pan/zoom frame (~6.5M iterations + a colour interp + 2 Leaflet projections + a fillRect EACH at
  world zoom). Rewrote it: a 256-entry colour LUT (no per-cell interp), the whole grid pre-rendered to an
  offscreen canvas ONCE on load (single putImageData), and each frame blits one strip per latitude row at
  its Mercator y (handles lat distortion). Draw time 3.6 ms regional / 10.2 ms world (was multi-hundred-ms
  to seconds); pan/zoom now smooth. Identical output, no decode/data change.

- **Extreme-wind: fix - first-batch European KMLs were only PART 1 (Norway/Finland/Belgium etc.
  truncated).** The original European fetcher grabbed a single KML file, but Dlubal splits big maps
  into `-partN`. So Norway (18 parts) had only its SE-corner part-1 (330 cells, looked blank), Finland
  (5 parts) and Belgium were partial too. Re-fetched all 25 first-batch countries with the multi-part
  fetcher: Norway now 93.6k polygons / full country incl. Svalbard (22-31 m/s), Finland 21.8k (full).
  (The big single-layer ones - Germany, Poland, UK - were already complete.)

- **Extreme-wind: Latin America + New Zealand + Central Asia + more ME/S-Asia (normalised).** Added
  ~15 more national codes via Dlubal KMLs, each normalised to vb,0 with sourced conventions: Argentina
  CIRSOC 102 + Bolivia NB 1225003 (ASCE 3-s gust /1.43), Chile NCh 432 (DIN, approx), Venezuela COVENIN
  + Costa Rica CVCR (fastest-mile / 1-min mean, km/h /3.6 /1.06), Honduras CHOC + Bahamas BC (ASCE mph),
  Peru NTE E.020 (instantaneous km/h) + Uruguay UNIT 50 (CP3 gust) [both low-conf], New Zealand NZS 1170.2
  (regions /1.43), Uzbekistan KMK 2.01.07 (SNiP w0 ladder, 5->50yr), Jordan JNBC-L, Iran IPS-E-CE-500
  (BS6399 hourly km/h x1.06), Nepal NBC 104 (IS 875 zones 47/55 gust), Philippines NSCP 2015 (Cat II /
  Fig 207A.5-1B, 700-yr 3-s gust km/h -> typhoon coast = global max ~58 m/s). Caught 3 Dlubal slug
  mislabels (nte-e-020=Peru, mopc-b-9=Dominican Rep, kmk=Uzbekistan). Low-confidence flags on the
  fastest-mile / undetermined-averaging codes (Chile/Venezuela/Peru/Uruguay/Jordan/Uzbekistan). Deferred:
  Colombia/Cuba/Dominican Rep (zone-value tables not sourced). Map now covers ~67 countries / ~25 standards.

- **Extreme-wind: gap regions - Africa, Middle East, SE Asia, Korea (normalised).** Added national
  codes via Dlubal KMLs, each normalised to vb,0 (10-min mean, 50-yr) with sourced conventions:
  Korea KBC 2016 (10-min, 100-yr ->50-yr x0.92), Ethiopia EBCS + South Africa SANS 10160-3 + Taiwan
  SBWRD (10-min/50-yr identity), Israel SI 414 + Iraq IQ.301 + Bangladesh BNBC 2020 (3-s gust /1.43),
  Pakistan BCP SP-2007 (mph 3-s gust x0.447/1.43), Saudi SBC 301:2018 (3-s gust, Cat I 300-yr /1.43
  x0.90), Egypt ECP-201 (fastest-mile x0.90, uncertain). Parser takes the LEADING number of a placemark
  name - handles band labels ("<= 44", "38*"), unit suffixes and comma-decimal RANGE labels
  ("0,18-0,38", e.g. Bulgaria's qb zones, which a brief pure-numeric variant had silently blanked)
  while still rejecting alphabetic outline names. Egypt/Iraq flagged low-confidence (averaging
  undetermined). Then wired the zone-label codes from sourced tables: Algeria DTR/RNV (Vref I-IV
  25/27/29/31, 10-min identity), Morocco CPCACSV/NV65 (zones 39/44/62 peak gust /1.43), Malaysia MS 1553
  (I/II 33.5/32.5 gust /1.43), Vietnam TCVN 2737 (Table 8 W0 by region-terrain -> pressure->v, gust->10min,
  20->50yr), Azerbaijan AzDTN (Table 11.1 w0 ladder = same as Russia). **15 gap-region standards added.**
  Still deferred: Philippines (3 occupancy layers), Turkey (height layers), Nepal (slug = nbc-104, not the
  Canada nbc-2020). Map now spans every inhabited continent.

- **Extreme-wind: big-economy rollout - Canada, China, Brazil, Russia (normalised).** Added four more
  national codes via the Dlubal Geo-Zone KMLs, each normalised to vb,0 (10-min mean, 50-yr, m/s):
  Canada NBC 2020 (hourly reference pressure q -> v, x1.06 hourly->10-min; 20-47 m/s), China GB 50009
  (basic pressure w0, already 10-min/50-yr; 22-46, typhoon SE coast), Brazil ABNT NBR 6123 (V0 3-s gust
  /1.43; 21-38), Russia SP 20.13330 (wind regions Ia-VII, w0 0.17-0.85 kPa -> v=40*sqrt(w0); 16-37).
  Title now "global, normalised". **Then untangled the harder three:** Japan AIJ-RLB (isolated the
  "basic" layer l279 from the concatenated basic/500-yr/1-yr/seasonal layers; U0 36-50, 100-yr ->50-yr
  x0.92 -> 33-46), Mexico CFE Viento 2020 (isolated the 50-yr layer l953 from the 10/50/200-yr set;
  VR km/h, /3.6 /1.43 -> ~14-42), Australia AS/NZS 1170.2:2021 (regions A0-D -> V_R(50) 39/43.8/52/60
  m/s 3-s gust, /1.43 -> 27/31/36/42; cyclonic north hotter than the temperate south). Parser hardened:
  qb/vb0 names must be PURE-numeric so outline placemarks like "jap_wind_basic_200310fgcl" aren't mis-read
  as a 200310 zone. ~44 countries / 10 standards now.
- **Extreme-wind: USA (ASCE 7-22) + cross-standard normalisation to a common metric vb,0.** All
  standards are now normalised to the EN definition - 10-min mean, 10 m, open terrain, 50-yr, m/s - with
  documented academic factors (SCIENCE.md 12.6, refs Durst 1960 + ASCE 7 Commentary): 3-s gust -> 10-min
  = /1.43; mph -> m/s = x0.44704; ASCE Risk-Cat-I 300-yr -> 50-yr = x0.90. A `conv` multiplier was added
  to kml-zones.js. **USA wired** (ASCE 7-22, 10,823 zone polygons; normalised 24-51 m/s - hurricane
  coasts the global max, mountain 'special wind regions' left blank). **India re-normalised** from raw
  IS 875 gust (33-55) to 10-min mean (23-38). The spatial index absorbed the US's 10k polygons / 114k
  cells for ~10 s extra CPU. Map now spans Europe + India + USA (218k cells). Tooltip documents the
  conversions + the hurricane-coast caveat (single MRI factor over-states tropical-cyclone coasts).
- **Extreme-wind: spatial index in the grid generator.** Per-country uniform 0.5deg bucket grid; a cell
  lookup only tests the polygons in its bucket instead of all N, so the painting cost (~6 s) scales with
  bucket size not polygon count - keeping generation cheap as dense standards (ASCE 7 etc.) are added.
  Output is bit-identical to before (verified). Remaining gen cost is loading/parsing the geometry files.
- **Extreme-wind: Europe mop-up + first intercontinental country (India), ramp extended to 55 m/s.**
  Wired the last European contour countries from their Dlubal zonation KML: CZ (CSN areas I-V =
  22.5/25/27.5/30/36), BA (BAS zones I-V, band lower bounds 18/20/25/30/35), SI (SIST 1-3 = 20/25/30).
  AT (per-Gemeinde directory, no discrete zones) and MD (6-zone NA values paywalled) stay flat. The KML
  parser now also resolves zone-LABEL placemarks (roman numerals / zone numbers) via a label->vb,0 map.
  **India added (IS 875-3:2015)** - first non-EU country, painted from its 6-zone basic-wind-speed map
  (33/39/44/47/50/55 m/s); non-EU countries enter via an `EXTRA` list in countries.js. The viz colour
  ramp + gradient-bar legend now run 20->55 (blue -> ... -> red -> magenta -> purple). CAUTION surfaced
  in the tooltip: EN vb,0 is a 10-min mean but IS 875 Vb is a 3-s gust, so India's high values are not
  directly comparable to the EN countries. ~34 countries now sub-zoned.

- **Extreme-wind: grid resolution 0.5deg -> 0.1deg (1801x3601, full globe).** Matches the elevation
  grid; zone borders and coastal strips now resolve sharply (e.g. Brasov correctly reads 31 / qb 0.6
  where the coarse 0.5deg cell had snapped it to 25.3). Added a bbox pre-filter to the point-in-polygon
  so the centre-sampling rasteriser stays fast (~12 s for the full globe; ~86k cells painted). PNG ~18 KB
  (sparse data compresses). `EXTREMEWIND_*` in config.js bumped (NLATS 1801 / NLONS 3601 / STEP 0.1).
- **Extreme-wind: contour-zonation via Dlubal KML + centre-sampling rasteriser.** The contour-map
  countries (whose National Annex zonation is drawn isolines, not admin regions) can now be painted
  from the Dlubal Geo-Zone tool, which publishes each country's zonation as a KML of value-named
  polygons. `fetch-dlubal-kml.js` (Playwright, dev-only) pulls a country's KML; `kml-zones.js` parses
  the placemark polygons + native value (qb -> vb,0 = sqrt(2*qb*1000/1.25), or vb,0 m/s as-is); the
  generator rasterises them (highest-priority path). **23 European countries wired** this way
  (Romania cross-checked vs the official CR 1-1-4 map + Dlubal point-query: Bucharest 28.3, Iasi 33.5,
  Brasov 31): GB, DE (Windzonen 1-4), HR (bura coast to 48), DK, BE, NO, FI, IE, RS (which couldn't be
  sourced before), SK, BG, AL, ME, MK, LT, LV, EE, IS, LU, HU, BY, PL + RO. `fetch-dlubal-batch.js`
  harvests each country's KML (page -> file.aspx?kml ref -> browser fetch) + reports value types; the
  parser handles `qb` (kPa), `vb0` (m/s) and zone-number maps (DE Windzonen, PL strefy). With the 8
  NA-table countries, ~31 European countries are now sub-zoned. Pending: AT (page slug), CZ/BA
  (zone-label placemarks), SI/MD (zone-number value map). KMLs dev-only/gitignored; values are public
  NA data (attributed to the NA + Dlubal Geo-Zone on the viz). **Compositing changed: each cell now
  takes the value at its CENTRE** (sharp zones AND sharp country borders), with the 4 corners only a
  coverage fallback for coastal/gap cells - replacing the old 5-sample average, which blended adjacent
  zones (fine for one-value-per-country, wrong once real zonation is painted). Smallest containing
  polygon wins so a local zone patch beats an enclosing base zone.

- **All viz pages: smooth interpolated colour ramps + gradient-bar legends.** Every `*Viz.html`
  (elevation, kt, tl, temp, wind, extreme-wind) now maps grid values through a continuous RGB
  interpolation across rainbow anchor stops instead of discrete buckets, and shows a matching
  value-proportional gradient bar legend (with tick labels) instead of stacked colour swatches.
  Shared helpers `vizRamp(stops)`, `vizGradientCss(stops)`, `vizLegendBar(stops, ticks)` added to
  `js/viz-basemap.js` (v2); each page just declares its `*_STOPS` anchors + tick labels. Special
  cases kept: elevation ocean (0 m) stays a categorical blue swatch; tl polar-night hatch row
  preserved. Also fixed: the shared account dropdown was painted under the map control panels -
  `#site-topbar { z-index: 1000 }` in `css/viz.css` (v3) lifts it above the `z-index: 800` overlays
  on all viz pages.
- **Extreme-wind: sub-national zonation for 8 countries (province + per-municipality) + continuous
  rainbow ramp.** The viz colour ramp is now a continuous fade (one shade per m/s, 20->36,
  interpolated) instead of 7 hard buckets, so individual zones read. Eight countries are now painted
  below the national level instead of one flat colour. Province / region / department (admin-1):
  France (96 departments -> NF EN 1991-1-4/NA regions 1-4 = 22/24/26/28), Italy (110 provinces ->
  NTC 2018 nine zones = 25/27/28/30), Spain (50 provinces -> CTE DB SE-AE zones A/B/C = 26/27/29),
  Netherlands (provinces -> NB areas II/III = 27/24.5), Ukraine (25 oblasts -> DBN V.1.2-2
  regionalization 24-32.7), Greece (ELOT NA: 4 island regions = 27, mainland = 33), Portugal
  (NP NA: Azores + Madeira = Zona B 30, mainland = Zona A 27). Per-MUNICIPALITY (admin-2): Sweden
  (all 290 kommuner -> Boverket EKS 9 Tabell C-10 reference wind = 21-26). New `admin2-zones.js`
  mechanism (GADM-2 geometry + a `{kommun: vb}` table, diacritic-tolerant name match); where several
  municipalities land in one 0.5 deg cell the corner-sampling accumulator averages them into that
  pixel, and sparse northern kommuner still tile with no holes. Geometry (NE 10m admin-1, GADM SWE-2)
  is dev-only / gitignored; the small sourced value tables are committed. New `scripts/extremewind/admin1-zones.js` (ISO 3166-2 ->
  vb,0 paint map, provenance in national-annexes.json) + Natural Earth 10m admin-1 (dev-only, ~40 MB,
  gitignored). The generator expands these into one sub-layer per province; sub-layers average at
  internal borders -> smooth gradient (3844 cells, 1005 averaged). Other countries stay one
  representative vb,0 (contour- or municipality-based NAs not yet wired); Romania still flat (its
  CR 1-1-4 contour map is the cross-reference target). Banner/title updated to say so.
- **Extreme-wind: ALL European countries' vb,0 SOURCED from the National Annexes (attributed).**
  Parallel web research (6 agents) compiled EN 1991-1-4 National-Annex (and national-code)
  fundamental basic wind velocity vb,0 for ~38 countries, each with the standard, the full
  per-zone breakdown, source URLs and a confidence flag, into the new authoritative provenance
  file `scripts/extremewind/national-annexes.json`. `countries.js` is now just a thin painting
  adapter that derives the representative vb,0 + NE polygon name from that file (single source of
  truth). The sourcing validated most prior values and corrected several: Poland 26→22 (zone I is
  most of the country), Hungary 24→23.6 (single national value), Moldova 25→21 (SNiP region I-II),
  Luxembourg 26→24 (single national). Honestly flagged: Switzerland publishes qp0 PEAK-gust
  pressure (SIA 261), not vb,0 — stored a converted ~26 estimate with a warning; Iceland 36 is the
  verified baseline (highland 50+ unverified); Belarus actually uses its own EN annex (TKP EN
  1991-1-4) not SNiP; Croatia coast bura reaches 48; Montenegro/Kosovo have no public per-zone
  data (representative from neighbours). Per-zone VALUES are captured for the future per-zone
  refinement (still needs geography: admin-1 polygons / vector contours), per the user's rule of
  not hand-tracing the official map images. Map regenerated (3853 cells, range 21–36, mean 25),
  console clean. Malta/Cyprus sourced but absent from Natural-Earth 110m so not painted; Russia
  still deferred (transcontinental).


- **Extreme-wind: no-overwrite AVERAGE superimposition + zone mechanism (Romania reverted to flat).**
  The compositor no longer assigns each cell to a single centroid-owner (where a coarse-polygon
  border cell could be "stolen" by a neighbour). Instead every country paints into a SHARED
  accumulator and the final cell = the MEAN of all countries that claim it; a country claims a
  cell if ANY of its 5 samples (centre + 4 corners) is inside its polygon. So interiors keep the
  country value, **borders are smooth averages** (RO/HU edge = (28.3+24)/2 = 26.25, verified),
  nothing overwrites, order-independent; coverage 3298→3853 cells, 510 averaged at borders.
  A generic `zones:[{vb0,polys}]` mechanism stays in the generator for per-zone refinement, but
  **Romania is reverted to a single representative value** — per the user, zones will come from
  AUTHORITATIVE vector data, NOT by tracing the official map image (that image is kept as
  ground-truth to cross-reference the finished grid against at the end). Russia stays deferred
  (transcontinental → would smear a European value across Siberia).

- **Extreme-wind map prototype (`extremeWindViz.html` + `data/extremewind1.png`).** First cut of a
  pan-European EN 1991-1-4 / CR 1-1-4:2012 **fundamental basic wind velocity vb,0** grid, on the same
  geometry family as the Kt/temp grids, now **361×721 @ 0.5°**. **Crude v1 by design:** one representative vb,0 per
  country (National Annex maps are zoned — this is an indicative screening map, not the legal map;
  banner says so). Pipeline matches the agreed layered design:
  `scripts/extremewind/countries.js` (**38 countries — all of NE-Europe**: EU/EFTA + Balkans
  + non-Eurocode BY/UA/MD via SNiP/DBN, Iceland 36 m/s; Russia deferred as transcontinental; vb,0 + native quantity + source, e.g. Romania
  qb 0.5 kPa → vb,0 28.28 m/s) → `scripts/generate-extremewind-grid.js` paints each country's owned
  cells via Natural-Earth polygon containment (dev-only `ne_110m_admin0.json`, public domain) and
  superimposes them conflict-free → `extremewind1.bin` (Uint8 px=round(vb·4), 254 KB) + `extremewind1.png` (1.7 KB). Loader `js/extremewind-png.js` (decode vb0=px/4) + `config.js` EXTREMEWIND_* block; viz
  page mirrors elevationViz (Leaflet + canvas, vb colour ramp, hover readout). Verified: Romania
  28.25, Iceland 36, Ukraine 24, Finland 21, range 21–36, 3298 cells. Registered in site-map (Maps section),
  deploy.sh, i18n (`nav.vizExtremeWind`). Not wired into wind.html (separate viz page, per decision).
  Next: per-zone (admin-1) refinement and more countries. site-map → `?v=10`, i18n → `?v=96`,
  config → `?v=7`.


- **Wind: validated qp(z) against the EuroCodeApplied EN1991-1-4 calculator + fixed the zmin floor.**
  Drove the live EuroCodeApplied flat-roof calculator with Playwright across 9 input scenarios
  and snapshotted its computed peak velocity pressure into a reference fixture
  (`scripts/wind-eurocode-fixture.json`, regen via `scripts/capture-wind-eurocode.js`;
  validated by `scripts/test-wind-eurocode.js`, ref screenshot `tests/screenshots/wind-eurocode-reference.png`).
  Result: our qp matched to <0.3% on all 7 roofs with h ≥ zmin (e.g. terrain II, vb 27, h 5 →
  879 N/m² exactly). The 2 sub-zmin roofs exposed a **non-conservative bug**: wind.html floored
  the reference height at `z0·2` instead of EN's `zmin` (Table 4.1: 1/1/2/5/10 m), under-predicting
  qp by 12-23% for low roofs in town/city terrain (e.g. a 4 m house in cat III). Fixed by adding
  `zmin` per terrain category and flooring `z = max(h, zmin)`; now 9/9 within 0.5%. The empirical
  ballast (kg/m²) output stays a deliberate indicative-screening model and is unchanged.
  Documented as **SCIENCE.md §12 (Wind Load on Roof-Mounted Arrays)** + **Appendix D**
  (Accuracy/References renumbered §12→13, §13→14; refs 25 EN 1991-1-4, 26 EuroCodeApplied).


- **PT print-to-PDF fixed.** The print stylesheet now collapses the Bootstrap grid wrapper
  (`.pt-scroll > .row > [class*="col-"]:not(.pt-form-col)`) so each A4 page box gets the full
  sheet width instead of being constrained by its column; the `:not(.pt-form-col)` exclusion
  is load-bearing — without it the wider-specificity reset out-ranked `display:none` and the
  input cards printed too. Also hides the paywall modal/backdrop in print, zeroes html/body
  margins, and adds `break-inside: avoid` so a page box never splits across sheets (boxes are
  297mm with `overflow:hidden` + `page-break-after:always` except the last → 1 box = 1 sheet,
  no trailing blanks). Verified via print-media emulation: cover + chapters + colour charts
  render full-width on white. pt.html inline CSS only (no version bump).

- **projectRef is now a bare CSPRNG v4 UUID** (`crypto.randomUUID`, with a `getRandomValues`
  fallback that needs no secure context so it still works on `file://`) instead of the
  guessable `Date.now()+Math.random()` scheme - 122 bits of unpredictable entropy in one
  atomic call. The legacy `rpt_` prefix is dropped for NEW refs (it was a report-share naming
  artifact); existing projects keep their stored refs - the save key is stable by design.
  share.js → `?v=9`.

- **Report actions slimmed; "Șterge / proiect nou" → avatar menu.** The "Proiect Tehnic
  (PDF)" button was removed from report.html (the PT is step 17 in the stepper) and the
  destructive clear/new-project action moved into the avatar menu as **🗑 Șterge / proiect
  nou** ("Clean / new project"), placed just above the last separator with the exit/logout
  group beneath; same confirmation, also exits read-only mode before resetting. Report keeps
  only Invite. site-nav → `?v=13`, i18n → `?v=95` (`nav.clean`).

- **PT header sub-line = `meta.projectName` from the Project state** (was the static
  "CENTRALĂ ELECTRICĂ FOTOVOLTAICĂ"): every page header now carries the project's own name,
  red [de completat] + pre-flight entry (`header → projectName`) when empty; a "Denumire
  proiect" input joins the Document card on pt.html (same field step 1 edits). pt-doc → `?v=5`.

- **report.html + pt.html are now PAID-ONLY pages** (`PAYWALLED_PAGES = ['report','pt']` in
  site-nav.js): trial/flagless sessions get the BLOCKING paywall variant (static backdrop,
  no ✕, keyboard off, "Înapoi" escape) with the step content hidden; if the gate's silent
  revalidation upgrades a legacy paid session within 20 s, the page unlocks in place. To
  paywall any other step, add its `body[data-page]` id to `PAYWALLED_PAGES` - one line.
  Menu label "Technical Design (PT)" → "Technical Design". site-nav → `?v=12`,
  i18n → `?v=94` (`nav.paywallBack`).

- **Session flags inverted to a POSITIVE `spv_t.paid` + login timeout fix.** Missing flags
  are treated as TRIAL (a flagless legacy session can't claim paid features); gate.js stores
  `paid: true` on server validation and upgrades legacy paid sessions via the silent
  revalidation; `Share.call()`/Cloud Saves now require `paid === true`. The interactive login
  fetch timeout was raised 8 s → 20 s - paid logins were losing the race against Lambda cold
  starts (3-8 s) and surfacing "Connection error". gate → `?v=10`, share → `?v=7`,
  site-nav → `?v=11`.

- **Trial sessions are now RECORDED (`spv_t.trial`) — paywall works without the server.**
  The Lambda doesn't 401 the share routes for a PBKDF2 PIN, so the trial state is marked
  client-side: gate.js stores `trial: true` whenever the master-PIN fallback authenticates
  (interactive login AND the silent revalidation path, which also MIGRATES pre-flag trial
  sessions on the next page load). `Share.call()` throws a synthetic 401 for trial creds
  before any network call → Invite and every cloud action land in the paywall modal instead
  of the old js alert; "Salvări în cloud" paywalls immediately without opening "Proiectele
  mele". gate.js → `?v=9`, share.js → `?v=6`, site-nav → `?v=10`.

- **"Încarcă proiect" → "Salvări în cloud" / "Cloud saves" (☁️) + paywall modal.**
  - The avatar-menu item is no longer hidden for PBKDF2 trial sessions - it is ALWAYS visible;
    without paid credentials it opens a Bootstrap modal: "Este nevoie de un cont plătit -
    autentifică-te sau cumpără acces întâi." with *Autentifică-te* (clears the session → gate)
    and *Cumpără acces* (pay.html) buttons. Trial creds the Lambda rejects (401) land in the
    same modal from the list/save/load/delete error paths, and report.html's Invite 401 alert
    was replaced with it too (`SiteNav.paywall()`; other alerts - invalid import/share link,
    payment errors - keep their own messages).
  - The paywall div is protected with the SAME MutationObserver algorithm gate.js uses for
    the login overlay: deleting it from the DOM nukes the page content ("Please reload the
    page."). site-nav → `?v=9`, i18n → `?v=93` (`nav.paywall*`, label texts, EN needpaid
    aligned).

- **PT Anexa 1: per-string fidelity + official-PVGIS statement.**
  - The DATE TEHNICE CEF list now enumerates ONE LINE PER DISTINCT MODULE with counts and the
    string chips that use it ("module fotovoltaice X, Pi = 455 Wp - 27 buc (S1, S2)") instead
    of only strings[0]'s module.
  - The Anexa 1 source statement is conditional on `strings[].usePvgis` (already persisted):
    all official → "provine din DATELE OFICIALE PVGIS (… baza SARAH3 2005-2023), importate per
    șir"; mixed → official strings named + the in-house-model sentence for the rest; the
    in-house-model text appears verbatim ONLY when no string uses an official import.
  - Daily curve caption "Curbă zilnică de producție (cer senin)" with ALL strings + Total
    rendered yield-style; monthly chart stays the multicoloured per-string stack; Tabel date
    lunare gains the yield-style "Relativ" bar column (print-safe colors,
    print-color-adjust: exact). pt-doc → `?v=4`.

- **PT: every injected value has an input box, in a card named after its SOURCE STEP.**
  New pt.html cards *Locație* (adresă, lat/lon, altitudine), *Componente* (invertor select,
  modul S1 select, plus disabled "(calculat)" boxes for număr module/kWp), *Conectare șiruri*
  (T_a,min/T_a,max) and *Producție* (disabled calculat: producție anuală/specifică/CO₂ evitat,
  refreshed from the engine's value map on each regeneration). All bound to the SAME state
  paths the source steps edit (incl. array path `strings.0.moduleId`), so edits flow both ways.
  **Primary numbered chapters (1-8) now always start on a fresh page** regardless of space
  above (document grew 18 → 21 pages). pt-doc → `?v=3` (returns `values`), i18n → `?v=92`.

- **PT: zero invented defaults.** Every Proiect Tehnic field comes from the Project state as
  entered; missing values stay EMPTY (red [de completat] + pre-flight) instead of being
  silently seeded - removed the PTh+DDE/ediția 1/revizia 0/categoria C/cerința Ie/0,4 kV/
  no-injection/auto "MT-&lt;projectRef&gt;" defaults from project-state blank(), the pt.html
  form and pt-doc collect(); the header strip shows "-" and an unset prosumer mode flags
  `gridmode` rather than assuming SEM. project-state → `?v=15`, pt-doc → `?v=2`.

- **Proiect Tehnic generator, Phase PT-1 (pt.html NEW, step 17) — replaces the old client PDF.**
  - **Document engine `js/pt-doc.js`:** chapter registry → blocks (html / splittable tables
    with repeated headers / Chart.js canvases) flowed into explicit A4 page boxes, each with
    its own header strip (Cod | MEMORIU TEHNIC | Ediția/Revizia | Pag. X/Y - PT-SPEC D7);
    continuous numbering, cuprins + borderou page counts derived from the real boxes in a
    second pass; a block never straddles a page.
  - **Chapters (PT-1):** copertă, borderou, lista de semnături (incl. verificator row, wet
    ink), atestate placeholder, cuprins, date generale, necesitatea (CO₂ la 0,265 kg/kWh cu
    sursă), abrevieri, normative (tabel ~28 acte, citate o dată), prezentarea proiectului +
    date tehnice CEF + tabel configurație șiruri (per-string Imp/Ump/Isc/Voc,rece), teste/PIF,
    faze determinante (RI/PV/PVR × E/B/P) - modeled on the reference Lia Manoliu PT.
  - **Bilingual:** prose templates in `js/pt-text-ro.js` / `js/pt-text-en.js` ({placeholder}
    substitution, EN falls back to RO, normative titles stay RO); document language switch on
    the page; EN cover carries the "RO is legally operative" note.
  - **Pre-flight:** unresolved fields render red [de completat] in the document AND are listed
    in the sidebar (chapter → field); step marks done only when complete.
  - **Admin form:** beneficiar / proiectant (atestate ANRE) / verificator / document
    (faza, cod, ediție/revizie, categoria, data) / racordare (regim prosumator no-injection|
    injection - drives the SEM paragraphs, tensiune, tablou, situația existentă, consum
    override, ATR) - persisted in `meta.*` + new `grid` section (project-state → `?v=14`).
  - **Anexa 1 - Breviar de calcul:** the retired client PDF's graphs carried over (metric
    tiles, stacked per-string monthly production, production vs consumption, daily clear-sky
    curve, monthly table, per-string breakdown with PVGIS-official tags). `report-pdf.js` +
    pdfmake REMOVED from report.html (file kept in repo); the report's PDF button now opens
    pt.html ("Proiect Tehnic (PDF) →"); print = browser print-to-PDF (print CSS hides chrome).
  - **Planșe (P-A):** placeholder pages IE001-IE005 with cartuș (title block) filled from
    meta; "SE ANEXEAZĂ" frame.
  - SITE_MAP + stepper: step 17 *Proiect Tehnic* (defectoscopy → 18); site-map → `?v=9`,
    i18n → `?v=91` (`nav.pt`, `pt.*`; `rep.pdfbtn` repointed), deploy.sh registers
    pt.html + pt-doc/pt-text-ro/pt-text-en and drops report-pdf.js. Full status in PT-SPEC.md.

- **PT-SPEC.md (NEW, design only): blueprint for the Proiect Tehnic (PTh+DDE) generator**,
  modeled on a real 80-page government PT (CEF 78,2 kWp "Lia Manoliu", analysed chapter by
  chapter). Two-document model (new bilingual RO/EN Memoriu Tehnic via pt.html print-to-PDF,
  self-paginated A4 boxes with per-page header strip + continuous Pag. X/Y, verificator block;
  the existing report becomes Anexa 1), chapter registry architecture (js/pt-doc.js +
  js/pt-text-ro.js/-en.js),
  meta/grid data-model additions, CEFND/ANRE chapter outline, BoQ auto-derivation rules, planșe
  phasing (placeholders → plan amplasament from planes SVG → single-line generator), and the
  mapping of unbuilt steps 10-14 onto PT chapters. Nothing implemented - structure written down
  for future agent sessions.

- **Roof-planes diagram: capacity verdict moved INTO the plane header** ("P1 β · γ · S1 …
  module legate · încap · OK" above each drawing). It used to render below the SVG, where
  it read as if it belonged to the NEXT plane's P-chip.

- **Module DB: + Aiko NEOSTAR 2P A475-MAH54Mw (475 W)** - 117th module. ABC back-contact
  N-type, 108 half-cells, white backsheet (Mw), 23.8%, γ −0.26 %/°C, 41.24/34.8 V,
  14.35/13.66 A, 21.5 kg, 1757×1134 mm; values from the official Neostar 2P datasheet
  (DS_EN_2405_V1.1, 450-475 W table) extracted from the PDF. nmot 45 °C estimated (the
  datasheet gives NOCT-condition output but no NMOT °C, same as the 2S family). Added to
  both `MODULE_LIST` (string-ui.js → `?v=39`) and the module_scrape `aiko.json` source so
  `build-module-list.py` regenerations keep it. Single-diode factory fit verified:
  P_max error 0.07%, FF 80.3%, healthy synthetic curve diagnosed OK.

- **PVGIS imports restructured PER STRING (architecture fix).** One PVGIS run = one
  orientation = one string, so the global import + "Manual din PVGIS" radio are gone;
  instead every string card on yield.html has its own **📥 import button**, summary line
  (DB + period, kWp, β/γ, horizon, annual, clear link) and a **"Folosește datele PVGIS
  (oficial)" checkbox**. Stored per string: `strings[].pvgisRef` + `usePvgis` (the legacy
  global `sizing.pvgisRef` is auto-migrated to the string whose β/γ match the import ±1°).
  - Official strings display/persist the imported E_m (chart stack labelled "(PVGIS)",
    orange PVGIS tag in the breakdown, headline badge "date PVGIS (oficial)" /
    "parțial date PVGIS" when mixed); engine strings stay engine - totals are the mixture
    and feed `sizing` → report.
  - Per-string ⚠ validation: imported kWp vs the string's modules, imported β/γ vs the
    string's orientation (±1°).
  - The "vs PVGIS" delta tabs aggregate ENGINE vs IMPORT over the strings that have one
    (kWp-weighted irradiance), with S-chips + a "comparison covers only strings with an
    import" note when partial; the orange chart overlay appears when a string with an
    import is NOT in official mode.
  - i18n → `?v=90` (`pvs.usepvgis`, `pv.pvgispartial`, `pv.pvgisang`, `tbl.cmpnote`;
    per-string wording).

- **Engine: PVGIS power model (Huld efficiency surface) + honest IAM semantics.**
  - **New power model `huld` (default):** η_rel(G',T') = [k₀+k₁lnG'+k₂ln²G'+T'(k₃+k₄lnG'+
    k₅ln²G')+k₆T'²]/k₀ — the surface PVGIS itself evaluates (King form, Huld 2010 fit),
    with both free-standing c-Si coefficient sets verbatim from the PVGIS Python source
    ("c-Si 2025" default + "c-Si original"); selectable vs the legacy per-module
    `γ datasheet` linear model (radio in the yield model card, persisted in
    `sizing.model.powModel/huldSet`). Captures low-irradiance droop + temperature
    cross-terms. SCIENCE.md §7.2 rewritten.
  - **IAM split out of reported irradiation (PVGIS semantics):** the Martin-Ruiz factors
    (already in the engine) used to be baked into the transposed irradiance, flattering the
    "vs PVGIS - Iradiere" comparison by ≈3%. transpose*() now RETURNS plain in-plane G_t
    (comparable to PVGIS H(i)) and fills an `out` param with G_eff (per-component IAM) that
    feeds the power chain — same energy, honest H. connections/strings G estimators keep
    their numeric call (and correctly get pre-reflection G). SCIENCE.md §6.4 added.
  - calcYieldDailyTilt now honours tcOpts (Faiman) + the power model (was hardcoded NOCT+γ);
    yield.html daily curve uses the same `_powerSample` chain. Faiman U_c/U_v labels show
    the PVGIS values (26.9 / 6.2).
  - **Measured:** Brașov scenario energy delta vs PVGIS +10.6% (γ) → +8.9% (Huld 2025);
    14-city outliers improve (Yakutia +13.7→+11.5%, Ontario +10.9→+8.9%). The full PVGIS
    −9% temp+low-irradiance loss does NOT materialise with climatological inputs (day+night
    mean T₂ₘ, mean-Kt days lack overcast hours) — documented in SCIENCE.md §12; the cities
    test gained a "Hof+Huld" column.
  - `yield-engine.js` → `?v=26` (HULD_COEFFS/etaHuld/_powerSample, transpose out-param),
    i18n → `?v=89` (`pv.pow_*`, `yxp.huld*`, `pvs.note_pow_huld`).

- **Yield: "Manual din PVGIS (import)" irradiance-model option + PVGIS comparison tabs.**
  - **Import the official PVGIS JSON** (the "json" export from re.jrc.ec.europa.eu) into the
    model card: parsed to `{ monthlyE[12], monthlyH[12], annualE, annualH, sdY, inputs }`,
    persisted in `sizing.pvgisRef` (round-trips through export/share). Summary line shows
    DB + period, kWp, β/γ, horizon flag, annual kWh, with a ⚠ when the imported kWp differs
    from the configured system; clear link removes it.
  - **New radio `pvgis`** = manual mode: the imported monthly E_m become the OFFICIAL numbers -
    headline metrics, persisted `sizing.annualProdKwh`/`monthlyProd` (→ report) - flagged
    "date PVGIS (oficial)". The engine still runs (pinned to the PVGIS-native Hofierka chain,
    `syncDeclinModel` treats `pvgis` as hofierka) and its stack is drawn next to a
    PVGIS-orange bar series in the monthly chart.
  - **"Tabel date lunare" is now tabbed** whenever an import exists (PVGIS's PV output /
    Radiation idea, better-termed): *Energie* (display data) · *vs PVGIS - Energie* ·
    *vs PVGIS - Iradiere* (kWp-weighted in-plane kWh/m²). Comparison tabs always pit the
    ENGINE values against the import with per-month + annual Δ% (green ≤5%, amber ≤12%,
    red beyond) - measuring our algorithm against SARAH3 even while official numbers are
    displayed. Verified vs the Brașov sample: annual ΔE +10.6%, ΔH +5.5%.
  - i18n `pv.pvgis*`/`tbl.tab_*`/`tbl.ours_*` → `?v=88`, `yield-ui.js` → `?v=23`.

- **Playwright suite un-staled (24/24 green):** `global.setup.ts` / `smoke.spec.ts` /
  `screenshots.spec.ts` still asserted the pre-stepper 4-tab UI ("Sun Path"/"Yield Calc"
  buttons) and clicked by EN text on the RO-first UI. Now: stepper-shell assertions
  (`#site-stepper`, `#C`, `#map`), id/onclick selectors, and the screenshot tests navigate
  to the step pages (`/yield.html`, `/strings.html`) directly.

- **Step 1 layout: "Detalii proiect" moved to the top of the main (right) pane**, full width,
  fields in a responsive grid (project name / first / last / address), with a new read-only
  **"Cheie salvare (projectRef)"** field showing the backend save key (`Share.ref()`,
  auto-generated on first view, click-to-select) so the cloud save/load/delete flows can be
  verified against it. `app.js` → `?v=19`, i18n → `?v=87` (`nav.projectref*`).

- **Roof planes v2 — planes drive the placement results; summed azimuths.**
  - **Placement results come from the planes** when any are defined: "Module care încap" =
    Σ of every plane's packed capacity (each plane with its own linked module + mount mode),
    with a per-plane breakdown (`P1 13 + P2 48`) and kWp from each plane's module. The legacy
    rectangle inputs ("Suprafață disponibilă") and the rectangle "Vedere de sus" are hidden
    while planes exist - the planes diagram replaces them.
  - **Azimuths ADD instead of locking:** the γ input stays editable for linked strings and
    edits the PANEL azimuth (`mount.rackAz`); effective γ = plane γ + panel γ, and the SUM is
    what gets stored in `s.azimuth` (synced). Coplanar mode presets panel γ = 0 on change
    (plane governs); E-W presets ∓90 alternating. A live note shows the addition
    (`Efectiv: β 35° · γ 10° + 5° = 15°`).
  - Plane editor rows now show chips of the strings assigned to them (assignment is
    string → plane, via the "Plan acoperiș" dropdown in the Layout card).
  - String dropdown options drop the "String N -" prefix (module name + count only); the
    selected string is shown as the shared colored S-chip (STR_COLORS) above the dropdown,
    next to "Orientare șir", and in the per-string β/γ summary - same chips as
    components/yield/connections.
  - **Edge setback per plane** ("Retragere margine", 0.1 m steps): panels keep a clearance
    band from every roof edge. Implemented as a TRUE inward polygon offset (`Planes.inset`:
    each edge shifted along its inward normal, adjacent offset lines re-intersected) so the
    perpendicular clearance is exact on slanted hip edges too - a plain horizontal inset
    would under-clear them. Packing runs inside the inset polygon; the diagram draws it as
    a finer-dashed inner boundary. Persisted per plane (`planes[].setback`).
  - `planes.js` → `?v=3` (`effOrient` rackAz sum, `inset`), i18n → `?v=86` (`pln.eff`,
    `pln.setback`, locknote).

- **Roof planes (`js/planes.js` NEW + mounting.html) — define real roof faces, pack panels, link strings.**
  - **4-length trapezoid solver:** each plane = top (ridge T) / bottom (eave B) / left / right,
    in metres measured along the slope. Ridge ∥ eave convention makes 4 lengths uniquely define
    the shape: `x = (L²−R²+(B−T)²)/(2(B−T))`, `h = √(L²−x²)` — rectangle (T=B, needs L=R),
    trapezoid, triangle (T=0) and skewed trapezoids (negative x overhang) all fall out; impossible
    sides are rejected instantly ("laturile nu formează un plan valid"). Stored internally as a
    polygon vertex list, so a future free-polygon editor only touches the input UI.
  - **Plane editor** on mounting.html mirrors the components strings editor (add/remove rows,
    P1/P2… chips from a neutral `PLANE_COLORS` palette); planes persist in `Project.planes`.
  - **Plane owns β/γ once linked.** Strings gain `planeId` + `mount {mode, rackTilt, face}`;
    `Planes.effOrient()` derives the effective orientation — coplanar → plane β/γ; tilted rows →
    plane β + rack Δβ @ plane γ (same rotation axis ⇒ exact sum); E-W → Δβ @ −90/+90 with
    alternating E/W faces auto-assigned per plane. Effective values are **synced back into
    `s.tilt`/`s.azimuth`**, so yield/connections/report keep reading the same fields unchanged.
    `planeId = null` = legacy free string: behaves byte-for-byte as before, including the
    unlinked E-W −90/+90 preset.
  - **Flat-plane rule instead of 3D math:** tilted rows / E-W on a plane with β > 5° shows a
    warning (nobody racks E-W on a pitched roof); pitched planes are coplanar-only by default.
  - **Packing + capacity verdict:** convex scanline packing in true plane coordinates (slope
    lengths ⇒ no projection math); row depth/pitch per mount mode (coplanar L, racks
    foot+shading-gap Y from the winter-solstice design hour, E-W foot); per-plane dotted
    to-scale SVG with the packed panels inside and a verdict line — Σ linked-string modules
    vs how many fit (S-chips, OK / "depășit cu N").
  - **Yield page lock:** plane-linked strings show β/γ disabled with a "values come from the
    linked plane" note, and the optimal-angle search is skipped for them (the roof is fixed).
  - `project-state.js` → `?v=13` (`planes` section + string planeId/mount), i18n → `?v=84`
    (`pln.*` RO/EN), `js/planes.js?v=1` + `js/constants.js` loaded on mounting.html,
    `planes.js` added to `deploy.sh`.

- **Step 9 — Conexiuni electrice (`connections.html`, NEW): steps 9-17 merged into one page.**
  - The nine scaffolded steps (DC/AC overcurrent protection, DC/AC cabling, earthing, SPD,
    disconnect, metering, grid connection) collapse into a single "Conexiuni electrice" step —
    `SITE_MAP` goes 24 → 16 steps; wind = 15, report = 16 (numbers auto-derived, nothing else moves).
  - **Per-string DC cards** (one per `Project.strings` entry): individual cable-length input,
    string V_OC,cold = ns·V_OC·(1+λV/100·(T_min,cell−25)) vs the H1Z2Z2-K 1500 V DC rating
    (T_min,cell from §11's `stringSizing.tmin`), recommended cross-section =
    max(S from ΔU=2·L·I·ρ/S @ max-drop %, S from ampacity I_z ≥ 1.25·I_SC, 4 mm² floor),
    actual drop %, and the gPV fuse verdict — needed iff np>1, rating in [1.25, 2.4]·I_SC,
    I_max = (np−1)·I_SC (IEC 62548). Series count falls back `ns → count/np` so V_OC,cold is
    always the **string sum**, never one panel.
  - **AC card:** single/three-phase, Cu/Al, length, max-drop → I_AC, section (VD + ampacity),
    drop %, MCB recommendation (C-curve, +30 mA type-A RCD note).
  - **Static compliance accordion** (RO): earthing/equipotential, SPD type 2 DC+AC, DC/AC
    disconnect, bidirectional metering (Legea 206/2021), ATR grid-connection procedure.
  - State persisted in `Project.connections` (`cables{}` per string id, dropDC, phases, matAC,
    lenAC, dropAC). Results use the shared `.metric` cells, tinted only on warn/err.
  - **Fully bilingual (RO/EN):** all labels, verdicts and the five accordion bodies live in
    `cx.*` i18n keys (accordion via `data-i18n-html`; JS renderers use `tr()` + `{}`-substitution,
    re-rendered on language switch through the `renderList` hook).
  - `site-map.js` → `?v=7`, i18n → `?v=72` (`nav.connections`, `cx.*`), added to `deploy.sh`.

- **Defectoscopy: I-before-V ordering everywhere (literature "I-V curve" convention).**
  - All textual/coordinate-pair orderings now read I then V to match the universal "I-V
    curve" naming: SCIENCE.md §11 (pipeline diagram, `(I, V, G, T)` rows, point set
    `{(i_k, v_k)}`, MPP `(I_mp, V_mp)`, `max(I·V)`, all narrative), the points-table columns
    (`I | V | G | T`), and the in-code data literals. The Chart.js axes are left as the
    standard I-V plot (current on Y vs voltage on X - that *is* the literature convention),
    and named quantities (V_OC, V_mp, I_sc, the diode equation) keep standard notation.

- **Defectoscopy: per-point measurement conditions (G_k, T_k) - methodology correction.**
  - The IEC 60891 translation previously assumed ONE (G, Tc) for the whole curve - valid
    for an electronic tracer (ms sweep) but wrong for the actual scenario: points read one
    at a time with a variable load, with irradiance/temperature drifting between readings.
    **G and T are now columns of the points table** (I | V | G | T | ×); the global
    "Measurement conditions" card is gone; new rows inherit the previous row's G/T; blanks
    default to 1000/25; legacy {v,i} blobs migrate the old page-level g/tc into every row.
  - **Point-wise translation (exact):** Isc is first anchored at STC from the V≈0 row using
    ITS conditions - I_sc,STC = I_sc,m·1000/G₁ + α·(25−T₁) (eq. 11.10) - then each point
    shifts by I₂ = I₁ + I_sc,STC·(1−G_k/1000) + α·(25−T_k)·G_k/1000 and
    V₂ = V₁ + β·(25−T_k) − Rs·(I₂−I₁) (eq. 11.11/11.12). The algebra closes exactly
    (substituting the V≈0 row reproduces I_sc,STC; constant conditions reduce to classic
    procedure 1). SCIENCE.md §11.1/11.3/11.4/11.6/11.7 rewritten accordingly.
  - **Validated by a drifting-conditions round trip**: 10 factory-curve points each
    inverse-translated to different conditions (G 720→980, T 30→48°C) recover
    Isc = 15.88 A / Voc = 36.05 V exactly and Pmax within 1.4 % (pure knee-interpolation
    residual); verdict correctly "within tolerance" (§11.8). The G/T metric cell now shows
    the measured ranges. i18n `?v=83` (`dfxp.iscstc`, per-point texts; conditions-card keys
    removed).

- **Defectoscopy: menu renamed, components-style module picker, full point-list persistence.**
  - Stepper/menu label dropped the "(I-V)" suffix - now just **Defectoscopie / Defectoscopy**
    (`nav.defectoscopy`, title + crumb fallback updated, i18n `?v=82`).
  - **Module-under-test picker now matches components.html exactly**: a brand dropdown → an
    indented (`↳`) model dropdown filtered to that brand → a right-aligned "▦ Module specs →"
    link to `modules.html#<id>` (reuses `cmp.modspecs` + the `.cmp-sel`/`.cmp-child`/
    `.cmp-arrow`/`.mod-db-row` styles). The old string-number selector (S-chip + per-string
    dropdown) is gone - the tested module is chosen directly from the DB, independent of the
    project's strings. Selection persists and restores (brand+model+link rebuilt from
    `defectoscopy.moduleId`); the "Select…" placeholder re-renders on language switch.
  - The measured I-V rows now persist **verbatim** (raw strings, original entry order, exact
    row count, empties included) on every edit/add/remove + G/Tc/module change - previously
    `analyze()` only saved the filtered+sorted valid set on the Analyse click, so the table
    reset on refresh and lost partial data / row count. A `persist()` helper owns it; the
    list (and how many rows) now survives a page refresh exactly as left.
  - Removed the fixed-count "limitation": a project with no saved points starts with **one**
    empty row (was 8); a returning session restores its own count (any number). Deleting the
    last row keeps one empty row, so the table is **never blank**. Auto-run on load gates on
    ≥5 *valid* points (not raw row count) so a half-entered table doesn't flash the "need
    points" warning. The ≥5-valid floor for actually running the diagnosis (SCIENCE.md §11.7)
    is unchanged.
  - **Point columns swapped to I (A) | V (V)** (current-first), header + inputs; the
    `data-f` mapping is unchanged so persistence/analysis are unaffected (purely visual).

- **Step 17 - Defectoscopie I-V (`defectoscopy.html`, NEW) under a new phase E · Mentenanță.**
  - Field diagnosis of a PV module against its factory datasheet: enter measured (V, I)
    points (same row-table look & feel as the consumption appliance editor: V | I | × rows
    + "+ Adaugă punct"), the in-plane irradiance G and cell temperature Tc, pick the module
    (project-string selector with S-chip, or the full module DB standalone), and Analyse.
  - **Math:** the factory reference I-V curve is a single-diode model fitted to the
    datasheet points (explicit `a` estimate + Villalva-style Rs sweep with Rsh forced
    through (Vmp, Imp) - converges to the datasheet Pmax within ~0.1%). The measured
    points are translated to STC per **IEC 60891 procedure 1** (α/β from the module's
    λI/λV, Rs from the fit, κ=0) and overlaid in a Chart.js plot (factory green, corrected
    blue, raw measured dashed orange).
  - **Diagnosis:** metrics grid (Pmax@STC vs factory, deficit %, FF vs factory, Isc/Voc
    ratios, Rs from the slope near Voc, Rsh from the slope near Isc) + rule-based verdict:
    curve step → shading/cracked cells; Voc deficit → dead substring/bypass diode/PID;
    Isc deficit with normal shape → soiling/degradation; high Rs → connections; low Rsh →
    shunts/hot-spots; ≤5% deficit → within tolerance. "Mod explicativ" shows the IEC 60891
    substitutions, FF and deficit with live values.
  - Persisted as `Project.defectoscopy {moduleId, g, tc, points[]}` (auto-reruns on
    revisit); `site-map.js?v=8` (phase E + step 17), `project-state.js?v=12`, i18n `?v=81`
    (`nav.phaseE`, `nav.defectoscopy`, `dfx.*`/`dfxp.*`); added to deploy.sh.
  - **Fit hardening + validation:** the explicit `a` estimate violates the feasibility
    bound a < (Voc−Vmp)/ln(Isc/(Isc−Imp)) on 2 of 116 datasheets (LONGi LR5-54HTH-415M,
    Aiko Neostar 2S) and the Rs sweep failed; a 0.98× cap on that bound fixes it. Fit
    validated against the whole DB: 0 failures, |P_max error| median 0.014%, max 0.174%.
  - **Full methodology documented in SCIENCE.md §11** (chapters renumbered: Accuracy → 12,
    References → 13, refs 15-22 added): derivations (eq. 11.1-11.9 incl. the a closed form
    and feasibility cap), IEC 60891 term-by-term mapping with the κ=0 justification, metric
    estimators with the R_s,est diode-slope caveat, the diagnostic rule table with
    threshold rationale, a complete numerical-constants audit table, and the validation
    results (116-module fit + synthetic dual-fault test).

- **"My projects" modal - save/load/delete projects from the avatar menu.**
  - New "📂 Load project" item in the account menu (shown when signed in and share.js is
    present) opens a **Bootstrap 5 modal**: each saved project as a row - name, date · size,
    a load (📂) and a delete (🗑) icon button - plus a "Save current project" footer button.
    The current project is badged. Load and delete are confirm-gated (load replaces the
    local project and lands on step 1; delete also revokes the project's share link).
  - Names: `share-list` returns refs only, so the modal resolves display names by fetching
    each blob via `share-load` in parallel (states are cached, so Load is instant).
  - **`vendor/bootstrap.bundle.min.js` is now loaded on every page** (was index/pay-test
    only) - real BS5 modals everywhere; `share.js` added to the 8 site-nav pages that
    lacked it (viz pages, DBs, wind) so the menu item works site-wide.
  - `site-nav.js?v=8`, i18n `?v=80` (`nav.loadproject`, `prj.*`). Save button disabled in
    read-only shared views.

- **Project store: `meta.projectName` + `meta.projectRef` aligned with the save/load backend.**
  - The backend share store is now a full per-user project store: alongside the live
    `share-save`/`share-get`, GeoCraft adds owner-scoped **`share-load`** (load own project
    by ref, returns state + token), **`share-list`** (`{projects:[{projectRef, token,
    sizeBytes, updatedAt, createdAt}]}`) and **`share-delete`** (idempotent; also revokes
    the share link). `js/share.js` gained the matching methods - `Share.loadByRef(ref)`,
    `Share.list()`, `Share.remove(ref)`, plus `Share.ref()` exposing this project's key.
    (The Lambda must route the three new paths - other agent's lane; frontend degrades
    gracefully until then.)
  - **`meta.projectRef`** = the STABLE SAVE KEY the store keys on (`share-save
    {email,key,projectRef}` overwrites in place) - auto-generated once, not user-editable.
    It replaces the legacy `meta.shareRef` field name; `Share.ref()` migrates old blobs in
    place (same value → same backend row + token). `persistMeta` never writes it.
  - **`meta.projectName`** = the user-facing project title: new input on step 1's "Project
    details" card, report/PDF headline (fallback: client name), PDF filename slug and
    document title. This is what a future "My projects" list will display (share-list
    returns refs only; the name lives in the state blob).
  - `project-state.js?v=11`, `app.js?v=18`, `share.js?v=5`, `report-pdf.js?v=11`,
    i18n `?v=79` (`nav.projectname`).

- **strings.html: NO auto-fill on load - explicit "Auto from location" only.**
  - The site inputs are never auto-completed on page load: saved project values
    (`stringSizing.tamin/tamax/gmin/gmax`) are restored if present, otherwise the static
    defaults stay - **T_a -20/45 °C, G 100/1000 W/m²** (HTML defaults updated; the same
    constants are the fallbacks in connections.html). The clear-sky/temp-grid estimate
    runs ONLY on the "Auto from location" button (which also calculates + persists);
    switching strings no longer re-estimates either. The async temp-grid poll (which
    existed to refresh the on-load estimate) was removed.
  - T_a,min/T_a,max (one pair per location, not per string) also persist immediately on
    manual edit, and "Calculate string sizing" persists all four site values. Reports and
    Connections read the persisted values.
  - The String dropdown options now read "Module name (count×)" - the "String N - " prefix
    was redundant next to the colored S-chip.

- **Connections: per-string G_min[i]/G_max[i] (clear-sky POA at each string's β/γ).**
  - G is plane-of-array, so it differs per orientation: connections.html now runs the same
    clear-sky estimator as strings.html "Auto from location" PER STRING (first-hour-after-
    sunrise January TL=3 → G_min; June-solstice noon TL=4 → G_max), memoised per load.
    The engine stack (config/solar-geometry/irradiance-hofierka/yield-engine) was added to
    the page; without a project location it falls back to the shared §11 `gmin/gmax`.
  - Effect: a west string (γ90) gets G_min 50 / G_max 704 vs a south string's 180/985 -
    colder at dawn (higher Voc) and cooler at noon (k_T 0.67 vs 0.54). A "G_min / G_max
    (β/γ)" explain block shows each string's values; `cxn.g` key, i18n → `?v=77`.

- **Connections: cabling math restated in the course's own relations (14)-(20).**
  - The DC/AC voltage-drop computation now follows the course form exactly - first
    R_C = ρ·l_C/S_C (rel. 16/18/20), then ΔU(%) = 2·R_C·I_mp-STC/(N_S·U_mp-STC)·100 (rel. 15)
    for DC, 2·R_C·I_inv,ca/V_inv,ca·100 (rel. 17, 1F) or √3·... (rel. 19, 3F) for AC, cosφ = 1.
    S_VD is the same relations rearranged for S at the ΔU% limit, then verified (16)→(15)
    with the chosen standard section. Explain blocks show this exact sequence and the
    descriptions cite the course relation numbers.
  - **Per-circuit currents (course + IEC convention):** one string circuit carries the module
    I_mp-STC/I_sc-STC; np > 1 means np identical cable runs ("n circuite identice" shown in
    the currents cell, with the combined MPPT current alongside). Ampacity and S_VD now size
    the individual run - previously they wrongly used the np-combined current (oversized:
    e.g. 10 mm² → 4 mm² for 2p strings). MPPT-level checks (fuse note) keep the combined np·I.
  - `fnum4` (4 decimals, stripped) added for conductor resistances where 2 dp would collapse
    the value; i18n → `?v=76` (`cxn.rc`, `cxn.duac`, `cx.circuits`, relation-numbered texts).

- **Connections: per-string §11 CELL temperatures (Tc,min[i] / Tc,max[i]).**
  - Instead of one global Ta,min/Ta,max, each string card derives its own cell temperatures
    from the shared §11 site inputs + **its module's own NMOT** (∓3% tolerance, identical
    formulas to calcString): Tc,min = Ta,min + (0.97·NMOT−20)·Gmin/800 and
    Tc,max = Ta,max + (1.03·NMOT−20)·Gmax/800. Cold V_OC is evaluated at Tc,min (matches
    §11's voc_max exactly), and the ampacity derating becomes k_T = √((90−Tc,max)/60) -
    string cables routed along the modules see module-level air, the conservative case.
  - Two new explain blocks (`cxn.tcmin` / `cxn.tcmax`) show the derivation with live values;
    the Voc metric label now reads "(Tc,min -4.09°C)" and the section cell "kT=0.53 @Tc,max
    72.94°C". ρ literals in the explain blocks now reference `RHO_CU` (0.0179, updated from
    the course's 0.0175; Al 0.0294) so they can't drift. i18n → `?v=75`.

- **House number format: 2 decimals, trailing zeros stripped (rule now in the dev guide).**
  - All computed values on connections.html go through `fnum(v) = (+v).toFixed(2).replace(/\.?0+$/, '')`
    - `23.7` not `23.70`, `43.63` not `43.5` (the old 1-decimal truncation made the displayed
    working irreproducible against full-precision math), `13` not `13.00`. Integer-by-nature
    values (counts, fuse/MCB ratings, standard sections) stay plain integers.

- **Connections: "Mod explicativ" learning mode; components chips de-duplicated.**
  - connections.html gets the standard learning toggle (top-right, global `spv_learn` flag)
    with live-value `Explain.block()` working, consistent with mounting/yield/recalc:
    per string - V_OC,rece (substituted ns·Voc·(1+λV/100·(Ta,min−25))), S_VD from the
    voltage-drop formula, I_nec = 1.25·Isc/k_T → chosen section, actual ΔU%, and (np>1)
    I_max = (Np−1)·Isc; AC side - I_CA from P/(√3·U) or P/U, S_VD, MCB ≥ I_CA.
    New `cxn.*` description keys (RO+EN), i18n → `?v=74`.
  - components.html string-row headers show just the colored S1/S2 chip (the redundant
    "String N" text next to it was dropped).

- **T_a,min / T_a,max persisted + used by Connections; S-chips on Yield.**
  - `calcString` (§11) now persists the site design inputs `tamin / tamax / gmin / gmax`
    into `Project.stringSizing` (schema documented in project-state; also `stringId` and
    the new `connections` section) — so they round-trip through JSON export/import and
    appear in **both reports** (report.html + client PDF): "Design temperatures Ta
    (min/max)" and "Design irradiance G (min/max)" rows (`rep.ss.ta` / `rep.ss.g`).
  - **connections.html** now uses them: cold V_OC is evaluated at **T_a,min** (ambient
    site minimum — cell ≈ ambient at dawn, IEC 62548 worst case; falls back to §11 cell
    tmin), and DC ampacity gets a hot-ambient derating **k_T = √((90−T_a,max)/60)** for
    T_a,max > 30 °C, shown in the cross-section cell when active.
  - **yield.html** per-string cards and the breakdown table now use the same **S1/S2
    colored tag chips** as connections (`.str-tag` promoted to the shared `style.css`,
    local copies removed; `.str-dot` retired). **components.html** string-row headers
    got the chips too (constants.js added to its script stack).
  - Bumps: `style.css?v=36`, `string-ui.js?v=38`, `project-state.js?v=9`,
    `report-pdf.js?v=9`, i18n `?v=73` — all site-wide.

- **Shared per-string palette + Strings-page string selector.**
  - `STR_COLORS` moved from yield.html's inline script into `js/constants.js` (next to
    MCOLS/OCOLS) — one global palette, index = string position. The S1/S2… tags on
    connections.html now use it (S1 green `#1a5c2a`, S2 blue `#2563eb` — same as the
    yield chart series) instead of the primary orange. `constants.js` → `?v=2`; the
    script is now also loaded by connections.html and strings.html.
  - **strings.html: the Module-template dropdown is replaced by a String selector**
    (mirrors mounting.html) whenever the project has strings: pick "String N - module
    (count×)", the module datasheet fields prefill from THAT string's module, the
    colored S-tag updates, the §11 calc re-runs, and the site auto-estimate (G_min/G_max
    POA) now uses the SELECTED string's β/γ instead of always strings[0]. The chosen
    string persists as `stringSizing.stringId` (restored on revisit). With no project
    strings the module-DB dropdown remains (standalone calculator mode).

- **String sizing (`strings.html` / `calcString`) — Neamț §11 fidelity.**
  - N_p,max now divides by the temperature/irradiance-corrected **I_SC,max / I_mp,max** (eqs 9-10, eqs 11-12),
    not the STC currents — slightly more conservative, per the standard. Explicit eq.13/14 single-string
    checks added as warnings. NMOT tolerance is now **±3%** (was ±3 °C absolute).
  - **G_min auto-estimate** ("Auto Gmin din locație"): computes the cold-morning plane-of-array irradiance
    (first hour after sunrise, January) from the tool's own clear-sky model (`clearSkyHofierka`) +
    `sunPos` + `transposeHayDavies` for the project lat/lon and string β/γ — no backend, no async grid
    (default winter Linke turbidity TL=3). Pre-fills on load, editable, with a method note. strings.html
    now also loads solar-geometry/irradiance-hofierka/yield-engine for this. `string-ui.js` → `?v=35`.

- **Wind step (`wind.html`) — layout + ballast methodology overhaul.**
  - **Layout** rebuilt onto the standard `.card` + two-column (`col-lg-4`/`col-lg-8`) shell used by
    consumption/mounting (was a narrow centered `.wind-doc` with custom monospace `.formula-card`).
    Explain toggle in the Results header; formula reference uses the shared `.xpl` blocks.
  - **Ballast model switched from per-module suction to indicative screening.** The old model applied
    bare-roof EN cladding c_pe (-1.8/-1.2/-0.7) to each module in isolation, over-estimating ballast
    ~6-10x (≈170 kg/m² vs the ~15 kg/m² of engineered NEN 7250 reports). It now reports q_p plus a
    calibrated **ballast intensity (kg/m²) per exposure zone** (F 30-50, G 15-25, H 5-12 @ q_p≈1000 Pa,
    tilt 12.5°), scaled by q_p and tilt, with a ±35% band and a prominent "indicative - engineered NEN
    7250 plan + structural sign-off required" banner. Calibrated against the Avasco Solar "Zeiden Arena"
    report (lands ~19 kg/m² vs its 15.4-22.1 kg/m²).
  - **Fixed the EN 1991-1-4 exposure coefficient bug:** `ce = kr²·ln·(ln + 7·kr)` -> `kr²·ln·(ln + 7)`
    (the `1+7·Iv` turbulence term was mis-formed), which had halved q_p. q_p now matches the report
    (1220 vs 1122 N/m²). Module tilt is read from the strings; SF/μ per-module inputs removed.
  - **System weights breakdown** (Module / Frame / Ballast / Total + average kg/m²), modelled on the
    Avasco report card. Per-module weight reads `MODULE_LIST[].weight` (kg) when the module DB carries
    it (planned), falling back to an areal-mass estimate (12.5 kg/m²) with a note; frame allowance
    2.6 kg/m². A **Recalculate** button re-reads the Premises building params + refreshes the NASA
    wind-at-site card (auto-recompute on input is also kept).
  - i18n `?v=60`; both EN/RO. Earlier same-session fix: MODULE_LIST length/width are mm, so module
    area divides by 1e6 (was giving ~2e6 m²).

- **Module DB — cell technology field + explainer.** Every `MODULE_LIST` entry now carries a
  `cellType` field (`'TOPCon'`, `'HJT'`, `'PERC'`, `'HPBC'`, `'ABC'`), generated from the
  `cell_type` key in each brand's JSON temp file by `build-module-list.py`'s new
  `normalize_cell_type()` helper.
  - **Colour-coded badge** displayed in the module detail pane, below the model name.
  - **"Mod explicativ" on cell technology** (`modules.html`): when learning mode is on, a second
    explainer bar (`#celltype-explain`) appears below the FF bar and describes what makes the selected
    cell technology different — temperature coefficient, recombination physics, market position. One
    paragraph per tech (TOPCon, HJT, PERC, HPBC, ABC), with i18n in both RO (primary) and EN.
    i18n keys `mod.celltype`, `mod.ct.topcon/hjt/perc/hpbc/abc` (`?v=56`).
  - **Brands updated:** REC Solar (unavailable EU/RO since 2022) and Meyer Burger (insolvency 2025,
    no RO/HU stock) removed; **ASTROnergy (Chint)** and **AE Solar** added — both confirmed active in
    the Romanian market (219 and 353 residential installs respectively per solar-edge.ro 2024).
    `string-ui.js?v=31`.

- **Module Fill Factor (FF / factor de umplere).** The module DB now shows each panel's fill factor
  — `FF = (V_mp·I_mp) / (V_oc·I_sc)`, a dimensionless quality/"squareness" metric — in the Electrical
  (STC) group. **Derived on the fly** from the four datasheet fields already on each `MODULE_LIST`
  row (never stored, so it can't drift from the data the other agent maintains). i18n `mod.ff`.
  - **"Mod explicativ" on the module DB** (`modules.html` now loads `explain.js`): a learning-mode
    toggle reveals a standout explainer bar (same accent treatment as the brand-highlight bar) with
    the FF formula, what it means, and **where our catalogue sits — avg 0.793 · min 0.772 · max 0.826
    · N=85**, computed live so it tracks the DB. i18n `mod.ffdesc` / `mod.ffavg`. (i18n `?v=53`.)
  - **`scripts/fill-factor-stats.js`** — read-only QA tool: extracts `MODULE_LIST`, prints avg / median
    / min / max (with the named min/max modules) and flags any module outside the healthy 0.70–0.86
    band or missing datasheet fields. Mirrors the live UI numbers; writes nothing.

- **Production & String-connection steps auto-compute on load.** Both pages used to render blank
  until you pressed *Calculate*, which looked broken and — worse — left **read-only share viewers**
  with a page they could never populate (they can't click anything). Both results are pure functions
  of the saved project, so the click gated the maths for no reason. Now:
  - **`yield.html`** waits for the data grids a manual click would use (`KT_DATA`/`TEMP_DATA`, 6 s
    fallback) then renders once on load; a brand-new project with no real strings shows a guidance
    hint (`pv.autohint`) instead of a fabricated default result.
  - **`strings.html`** auto-runs `calcString()` (pure datasheet maths, no grids) when the module +
    inverter are prefilled from the project.
  - The explicit **Calculate** button is kept for edit mode (it still persists + marks the step done)
    but **hidden in read-only mode** (`#pv-calc-btn` / `#ss-calc-btn`) so viewers get no dead button.
  - i18n `pv.autohint` (EN/RO, `?v=52`).

---

## [0.9.9] — 2026-06-10 — Equipment DB, client PDF, collaborative share, account hub

- **Account menu = project hub.** Import/Export JSON moved into the avatar dropdown (global, works on
  every page via `site-nav.js`), so the in-page buttons (Report's Export, Location's Import) were
  removed. Menu order: **Import · Export — Language · Theme — Switch back · Exit** (two separators);
  "Switch back" (exit read-only) shows only in a shared view, "Exit" (log out) only when signed in.
  i18n `nav.importjson/exportjson/switchback/exit`.

- **Report + PDF: per-string mounting (β/γ).** Tilt/azimuth are per-string, but the Amplasare section
  showed only one pair. Now it lists a row per string (Șir N → β … · γ …) above the shared layout
  params (mode, pitch, GCR, modules used), in both `report.html` and the PDF. (`report-pdf.js?v=7`.)

- **Higher text contrast (both themes).** Pushed the text greys for readability — dark theme:
  `--text #e0e0e0→#f5f5f7`, `--text2 #aaa→#cfcfd4`, `--text3 #999→#aeaeb4` (crisper on OLED);
  light theme: `--text #222→#0f0f0f`, `--text2 #666→#3d3d3d`, `--text3 #888→#5c5c5c` (darker).
  (`style.css?v=35`.)
- **Report: removed the Print button; Invite label simplified** to just "Invite / Invită" (the
  read-only nature is explained in the share modal). **Fix:** the location search "Go" button
  overflowed its card (flex child without `min-width:0`) — now constrained.

- **Invite → share-link modal.** Clicking Invite now opens a centered modal with the link in a field,
  a **Copy** button (clipboard, with "Copied!" feedback), the read-only hint, and Close (✕ / backdrop /
  Esc) — instead of an inline box. Much easier to copy on mobile. i18n `rep.sharetitle` / `rep.close`.
- **PDF cover: show Coverage, not Performance ratio.** The cover's third metric tile was "Performance
  ratio" (≈86%, = 1−losses), which has no counterpart in the app and read as a mismatch next to the
  Recalculare page's "Acoperire 111%". Switched the tile to **Coverage** (production ÷ consumption) so
  the cover's headline % matches the interface. (`report-pdf.js?v=6`.)

- **Components: brand → model cascade dropdowns.** The flat module (85) and inverter (224) selects
  were unwieldy. Replaced each with a parent **brand** dropdown + an indented (`↳`) **model**
  dropdown filtered to that brand. Per string row and for the inverter. Lists shrink from 85/224 to
  ~16 brands + a handful of models each. Both dropdowns start at a **"Select…"** placeholder (unless
  a selection is already saved); the model dropdown shows only "Select…" until a brand is chosen, and
  picking a brand does **not** auto-select a model — the user chooses explicitly. New strings start
  unselected. Uses the `brandId` + `MODULE_BRANDS` / `INVERTER_BRANDS` registries.
- **Collaborative read-only share links.** Report has an **Invite** button that saves the project via
  the shared Lambda → GeoCraft and gets a 32-char token, building a `…/?share=<token>` link (re-inviting
  returns the same token while the backend keeps the new values). Opening the link — after the gate
  (viewer must be logged in / have bought access) — loads that snapshot in **read-only mode**: a banner,
  all inputs disabled site-wide (`body.spv-ro`), and the shared data shown **without touching the
  viewer's own project** (`Project.enterReadOnly`, separate `spv_ro`/`spv_ro_data` keys; writes are
  no-ops). The topbar's logout button became an **account avatar** (person silhouette) with a menu:
  *Exit read-only mode* (non-destructive — restores the viewer's own project) + *Log out*. New
  `js/share.js` (`Share.save/load/link`, `?share=` landing via a `window.onGateAuthed` hook in
  `gate.js`); `project-state.js` gained `enterReadOnly/exitReadOnly/isReadOnly/readOnlyToken`. i18n
  `nav.account/exitro/robanner`, `rep.invite/sharehint`, `share.*`. **Backend:** the Lambda
  dispatches by URL **path** (not a body action), so the frontend POSTs to `…/share-save` and
  `…/share-get` with `{service,email,key,projectRef|token,state}`; it branches on the Lambda's
  status codes (401 not-paid → log in/buy · 404 bad link · 413 too large · 502 retry). The
  `share-save` / `share-get` routes (Lambda → GeoCraft) are owned by the other agents; the frontend
  degrades gracefully until they're live. (`gate.js?v=8`, `site-nav.js?v=3`,
  `site-nav.css?v=7`, `project-state.js?v=7`, `share.js?v=1`, `i18n?v=44`.)
- **Language + theme moved into the account menu.** Both the language selector and the light/dark
  toggle left the topbar and now sit inside the avatar dropdown as "Language / Limbă" and
  "Theme / Temă" rows (changing either keeps the menu open). The topbar is just brand + avatar now.
  i18n `nav.langlabel`. The avatar is
  always available (it hosts the theme switch); Log out shows only when signed in, Exit read-only only
  in a shared view. i18n `nav.themelabel`.
- **Log out button** in the shared topbar. `gate.js` now exposes `window.gateLogout()` (clears the
  `spv_t` session — including a master-PIN session — and reloads so the gate reappears). The topbar
  shows a "Log out / Ieși din cont" button only when a session exists; on ungated reference pages it
  falls back to clearing `spv_t` + reload. Lets someone given the master PIN sign out to reach the
  paywall / PayPal button. i18n `nav.logout`. (`gate.js ?v=7`, `site-nav.js ?v=2`, `site-nav.css ?v=6`.)
- **Mounting: E-W gets the no-gap treatment.** East–West (dual-tilt) packs at the footprint with no
  inter-row gap, but it was showing the single-direction shading rows (sun altitude, rise, gap = 0)
  next to a bare "Pas între rânduri" that read as wrong. Now E-W (like coplanar) hides those rows,
  tags the pitch "fără spațiu între rânduri / no inter-row gap", and hides the design-hour field.
  The value (pitch = footprint, GCR > 100%) is unchanged — only the presentation. i18n `mnt.ewtag`.
- **Mounting: "Pitched roof (coplanar)" layout mode** (customer request). A third mode alongside
  single-direction and East–West: panels sit **flush on the roof slope**, so coplanar rows don't
  shade each other — no inter-row gap, row pitch = module length, GCR = 100%, and rows tile the
  roof directly (`floor(roofD / L)`). Shading-only fields (design hour, sun altitude, rise, gap)
  are hidden in this mode; a dedicated to-scale side elevation shows the modules packed along the
  slope, and the top view tiles them with no gaps. i18n `mnt.flush` / `mnt.flushtag` / `mxp.flush`.
- **Client PDF report (pdfmake) — looks like the interface.** New "⬇ Download PDF" button on the
  Report step generates a branded, client-facing PDF entirely in the browser (no backend) that
  mirrors the app's own UI: the orange `--clr-primary` brand, `.sec`-style section headers with an
  orange rule, the `.metric`-grid tiles (big value / label / sub), `.kv` rows, and the interface's
  chart colours — rendered via Chart.js → PNG. **Page 1 is a results summary** (PV*SOL-style):
  three headline metrics (annual PV energy, specific yield, performance ratio), a diverging monthly
  bar (PV energy up / consumption down), and two donuts — self-consumption (own-use vs grid feed-in)
  and coverage (covered by PV vs by grid), from a monthly min-overlap self-consumption estimate.
  Following pages mirror the workflow steps and keep their interface graphs (Location · Premises
  [monthly consumption] · Components + **technical choices** · Mounting · Production [stacked
  per-string monthly + daily clear-sky curve + monthly table] · Balance [consumption-vs-production]).
  Language follows the UI (RO/EN). New module `js/report-pdf.js` (`ReportPDF.generate()`); Chart.js
  + pdfmake from CDN on `report.html`; the old print stays as a secondary "🖨 Print". Yield persists
  the daily-curve series + per-string monthly (`sizing.daily`, `sizing.monthlyByString`) so the
  report draws them without reloading the engine (older projects that haven't re-run Yield omit
  those). i18n `rep.pdf*`, `rep.pvenergy`, `rep.pr`, `rep.ownuse`/`feedin`/`bypv`/`bygrid`, etc.
- **Fix (mobile): the Next/Prev footer hid behind the Android system bar.** The shell used
  `height: 100vh`, which on mobile is the *tall* viewport (URL bar hidden), pushing the bottom
  prev/next footer below the visible area. Switched to `height: 100dvh` (dynamic viewport, tracks
  the actually-visible height; `100vh` kept as fallback) + a `env(safe-area-inset-bottom)` cushion.
  (`site-nav.css ?v=5`.)
- **Fix (mobile): the Location map covered the nav drawer.** Leaflet's controls/panes use
  `z-index: 1000`, which beat the mobile stepper drawer (`z-index: 50`), so the map's zoom buttons
  poked through the open menu. `#map` now gets `isolation: isolate`, trapping Leaflet's internal
  z-indexes inside the map's own stacking context so the menu always paints above it. (`style.css ?v=34`.)
- **Report: "Clear / new project" button** next to Export JSON. Asks for confirmation (with a
  "export first" nudge), then `Project.reset()` wipes the saved `spv_project` blob and redirects to
  step 1 (Location) so you can start fresh. Red-outlined to signal it's destructive. i18n
  `rep.clear` / `rep.clearconfirm`.

_Next: per-model `vmpptmin` reconciliation; client PDF; promote the learning toggle to the shared header._

---

## [0.9.8] — 2026-06-09 — Per-string β/γ, brand highlights, learning mode on 5 steps

- **Mounting: per-string tilt/azimuth.** β (tilt) and γ (azimuth) were a single shared pair; they're now
  **per-String**, bound to the String dropdown — selecting a String loads/edits its `tilt/azimuth` in
  `Project.strings[i]` (the array Yield reads). Split into a "String orientation — String N" card
  (β/γ) separate from the global Layout card (dropdown + orientation + mode + hour), with a read-only
  **"Per string: …"** summary of all strings. i18n `mnt.strorient` / `mnt.persum`.
- **Fix:** the Yield daily-curve x-axis title was hardcoded "Ora locală" (RO) even in EN — now i18n
  (`pvs.localtime`). (The E-W twin-curve "shoulder" some users notice is correct physics: an East/West
  panel loses its direct beam once the sun passes behind it, leaving only the gently-tapering diffuse tail.)
- **Equipment DB: brand highlight.** Selecting a specific brand in the Inverter/Module database brand
  filter now shows that brand's one-liner highlight (e.g. "Tier-1 global, growing in RO commercial")
  in a tinted banner under the dropdown; hidden for "All brands". Highlights live in the
  `INVERTER_BRANDS` / `MODULE_BRANDS` arrays (`js/string-ui.js`); the DB pages render them.
- **"Mod explicativ" rolled out to 5 more steps.** The learning-mode toggle (shared global flag
  `spv_learn`, persisted) now appears on **Premises**, **Components**, **Yield**, **Recalculation**
  and **String connection** — toggling it on any page reveals the live formula working everywhere.
  Each page surfaces its real numbers: Premises (demand → design energy → target kWp), Components
  (P_FV, inverter ratio, 0.8–1.2 window), Yield (per-string PR + peak power, cell-temp derating,
  annual + specific yield), Recalculation (coverage, balance, specific yield). On String connection
  the answers (metrics, config table, warnings) stay visible while the step-by-step derivation +
  method note become the toggled "working". The `.xpl-*` styles moved into the shared
  `css/site-nav.css`; new i18n keys `cxp.* / kxp.* / rxp.* / yxp.*` (RO + EN).

---

## [0.9.7] — 2026-06-09 — Steps 7 & 9, inverter DB, learning mode, full-snapshot export

- **Mounting E-W → per-string azimuth pre-fill:** choosing "East–West (dual-tilt)" now pre-sets the
  string azimuths in the data model — String 1 → −90° (East), String 2 → +90° (West) — which Yield
  reads directly (twin-hump production), with an info note on the Layout card. Fires only on the
  explicit mode choice, so manual Yield edits aren't clobbered. i18n `mnt.ewaz`. If E-W is picked with
  fewer than 2 strings, an amber hint (`mnt.ewhint`) prompts adding the second (West) string in Components.
- **Inverter DB filled to 224 models / 15 brands** (external agent) + **micro-inverter guards** (mine):
  Enphase/Hoymiles entries are tagged `type:'micro'`, and the central-inverter logic now detects that —
  **String Sizing §11** (`calcString`/`loadInverterTemplate`) shows "1:1 module topology, series sizing
  doesn't apply" instead of a meaningless Ns=Np=1, and **Components** shows the same note instead of a
  false "undersized" P_inv/P_FV ratio. i18n `ss.micro` / `cmp.micro`. (string-ui.js `?v=29`, i18n `?v=31`.)
- **"Mod explicativ" (show-the-working) learning layer** — new `js/explain.js`: a per-page learning-mode
  toggle (persisted `spv_learn`, off by default) that reveals the actual formulas **with the user's live
  numbers substituted and the result** (phpMyAdmin-style), each with an i18n explanation. Prototyped on
  **Mounting** (X / foot / α / Y / pitch / GCR). i18n `xpl.*` + `mxp.*` (RO+EN). To roll out next:
  String Sizing (§11), Components ratio, Consum target, Recalc, Yield. Mounting also now labels the
  module dims **L** (slope side) / **l** (width), tags the tilt/azimuth inputs with their variable
  (β / γ), and annotates the side-elevation drawing with **β** and **α** so symbols ↔ inputs are obvious.
- **Brand DB + filter:** `string-ui.js` gained `INVERTER_BRANDS` (15) and `MODULE_BRANDS` (16) registries
  and a `brandId` on every device (DB-fill work). The Inverter DB and Module DB pages now have a
  **brand dropdown** (next to search) — "All brands" + every brand present in the list, sorted; filters
  combine with the text search, and each list row now shows its brand. (string-ui.js `?v=28`, i18n `?v=29`
  with `db.allbrands`.)
- **Yield (Producție) i18n:** the page's JS-generated content was hardcoded Romanian and didn't switch
  to English — now fully i18n'd via a new `pvs.*` key block: per-String card labels (Panels, String
  power, System losses, Optimizer, Ground albedo, Tilt, Azimuth + hints, the two checkboxes), albedo
  options, the 4 metric cards, breakdown table headers + Total, the daily-curve title + season selector,
  the "Diffuse transposition" label, the temp-derating hint, and the model note. "String N" labels use
  `cmp.stringlbl` (→ "Șir N" in RO). The page now **re-renders on language switch** (`renderList` rebuilds
  cards + recomputes). i18n `?v=28`.
- **Report fixes:** the Mounting card now shows **modules used** (actual count from Components, e.g.
  16) instead of the roof-capacity "modules that fit"; fixed hardcoded RO labels (Fus orar → i18n,
  and an elevation label that rendered a raw key) and made the whole report **re-translate on language
  switch** (rebuilds via `renderList`, all text through `tr()`).
- **Report step (Raport, new phase D):** new `report.html` — a printable project summary generated from
  the whole `Project` (client, location, premises, components/strings, mounting, production, balance),
  with **🖨 Generate PDF** (browser print, with print CSS that hides the chrome) and **⬇ Export JSON**
  (downloads the full state as `solar-pv-<slug>.json`).
- **Export/import is now a full snapshot:** persisted the last UI settings that were previously DOM-only,
  so an imported project round-trips 1:1 — Mounting `orient / hour / roofW / roofD`, Yield model card
  (`sizing.model = {irrModel, tl, gsc, useTemp, tcModel, uc, uv}`), and per-string `optangle / usehorizon`
  (stored on `strings[]`). All restore on load. project-state `?v=6`.
- **Import JSON on Location (step 1):** "⬆ Import project (JSON)" button reads a previously-exported
  file and restores the entire app state via the new `Project.importState(obj)` (validates `_v`), then
  reloads. Round-trips with Export JSON. `site-map` gained phase D + `report` step; project-state `?v=5`,
  site-map `?v=5`, i18n `?v=27`, app.js `?v=16`.
- **Recalculare (step 7):** new `recalc.html` — reconciliation dashboard (course point 10). Reads
  `consumption` (demand + monthly profile + ATR) and `sizing` (production from Yield) and shows annual
  production / consumption / **coverage %** / **balance** (surplus exported vs deficit imported), a
  **monthly Consum-vs-Producție** bar chart, a reconciliation table (installed kWp, target, specific
  yield, target energy, ATR), and a verdict (meets-target ✓ / under-target ⚠ / exceeds-ATR ⚠) with
  links back to Premises/Components/Yield. Yield now also persists `sizing.monthlyProd[12]`.
  `site-map` `recalc`→ready; project-state `?v=4`, site-map `?v=4`, i18n `?v=26`.
- **Obstacles step now checks off on visit** — it's optional (a clear horizon is valid), so it marked
  done only when an obstacle/horizon existed and otherwise never showed ✓. Now `markDone('obstacles')`
  fires on page load.
- **Consum → "Loc de consum" / "Premises"** (renamed `nav.consumption` label; underlying `consumption`
  id/file unchanged). Added **ATR** input — "Putere maximă aprobată la racordare (ATR, kW)" (course
  point 5, the grid-connection limit) with the official-document hint *"puterea maximă simultană ce
  poate fi absorbită"* → persisted to `consumption.maxPowerKw`; an amber warning fires when the
  recommended PV target exceeds the ATR.
- **Yield label de-PVGIS'd:** `nav.yield` "Producție PVGIS"/"PVGIS yield" → **"Producție"/"Yield"**
  (+ page title); the model note's "PVGIS" is now a link to the PVGIS tools page (new tab). i18n `?v=25`.

_Next: Recalculare (step 7), per-String mounting, Battery DB, Theory, client PDF._

---

## [0.9.6] — 2026-06-08 — Stepper workflow rebuild (Model 2)

Rebuilding the 4-tab SPA into a guided multi-page stepper mirroring the Neamț PV-design course
(steps 1–11 now). RO-primary, gated workflow pages, one persisted `localStorage` project blob.
Full architecture in CONTEXT.md → "Stepper workflow rebuild".

### Added
- **Shared chrome:** `js/site-map.js` (manifest), `js/site-nav.js` (header + stepper + prev/next),
  `js/project-state.js` (`Project` API over `spv_project`, _v2), `css/site-nav.css`.
- **Step pages:** `index.html`→Step 1 Locație (project details + location + sun-path), `obstacles.html`,
  `components.html` (multi-String editor), `mounting.html` (placement, to-scale SVG diagrams),
  `yield.html`, `strings.html`. Reference: `inverters.html` + 5 `*Viz.html` on shared chrome
  (`css/viz.css`, theme-aware basemap `js/viz-basemap.js`).
- **String model:** `Project.strings` array (one per inverter input — own module type/count/orientation);
  per-module `gamma` + `pmax/length/width` in `MODULE_LIST`; `pac` in `INVERTER_LIST`.
- **Placement math:** winter-solstice inter-row spacing (X/Y/pitch/GCR), single-direction + East–West
  dual-tilt, to-scale side + top SVG diagrams.
- **Consumption step (3):** new `consumption.html` — two input modes (toggle): **Simplu** = 12 monthly
  kWh inputs (straight from the bills → real monthly profile, plus a "fill all" helper and optional
  RON/kWh price → annual cost) and **Detaliat** = an appliance table (`{name, W, h/day, qty}` → kWh/yr,
  summed, flat monthly). Results: annual kWh, daily average, peak month, and a **recommended PV size**
  (`kWp = annual × coverage% ÷ specific-yield`, specific yield auto-pulled from the Yield step or a RO
  default), with a monthly bar chart. Persists `consumption{mode,monthly,annualKwh,coverage,specificYield,
  targetKwp,…}`. **Components now reads `consumption.targetKwp`** as its sizing target (label "Țintă (din
  consum)"), falling back to PVGIS yield. `site-map` `consumption`→ready (`?v=3`); project-state `?v=3`.
- **Module specs verified against datasheets** + explicit `efficiency` field (shown verbatim, not the
  rounded computed value): Jinko **22.77%** (NMOT→45, datasheet omits it/IEC 61215:2021), Canadian 20.4%
  (βVoc→−0.27, NMOT→42), Helios 20.58% (Voc→49.28, Vmp→40.96, Isc→11.57, Imp→10.99, γPmax→−0.35).
  Fixed the dead Helios datasheet link → Eco Green Energy 2024 PDF. (string-ui.js `?v=27`.)
- **Module database:** new `modules.html` reference page (master-detail browser mirroring
  `inverters.html`, reads `MODULE_LIST`) — searchable list + spec sheet (Pmax, efficiency, γ, Voc/Vmp/
  Isc/Imp, temp coefficients, NMOT, dimensions, area), deep-linkable via `#<module-id>`. Linked from
  Components: each string row has a "▦ Specificați modul →" link (same tab, carries `?s=<stringId>`),
  plus a general "▦ Bază module →" link. `site-map.js` `mod-db` flipped to `ready:true` (bumped to
  `?v=2` site-wide). When opened from a string row the DB shows a "→ Șir N" context badge and a
  "✓ Folosește în Șir N" button that assigns the selected module to that string and returns to Components.
  Official **datasheet URLs** added to all three `MODULE_LIST` entries (Canadian Solar / Helios·EGE / Jinko)
  → "Open datasheet PDF" button on the DB (string-ui.js `?v=26`).
- **Components:** removed the per-string **tilt** input — orientation (tilt/azimuth) belongs to Mounting
  (step 5) / Yield (step 6), not the electrical-sizing step. Tilt stays in the string data model
  (default 35°) and is edited downstream; Components is now module + count + inverter only.
- **Mounting "Modules used":** Placement results gained a `mnt.used` row — sum of the configured
  string counts (breakdown e.g. `6+6=12`) + total kWp summed per-module — below "Modules that fit"
  (which remains the roof-capacity figure). Always shown when strings exist; all prior rows unchanged.
- **Mounting String selector:** `mounting.html` gained a String dropdown (Layout card) listing
  `Project.strings`; selecting one autofills the module width/height/Pmax (+ name) that drive the
  spacing math and to-scale diagrams. Chosen String persisted as `mounting.stringId`. Legacy projects
  with no `strings` array fall back to the `components` mirror (dropdown hidden) — no other field changed.
- **Yield multi-String:** `yield.html` reworked — one PV-system+orientation card per String, loops
  `calcYield` and element-wise sums monthly[12]; stacked monthly bar chart, per-String breakdown table,
  and a clear-sky daily-production curve with a summer/equinox/winter season selector (twin-hump for E/W).
  NOCT & γ now per-module; shared irradiance-model card. No `yield-engine.js` change.

### Changed
- i18n default → Romanian (`LANG_CURRENT='ro'`, RO-first). `applyTheme()` moved `app.js`→`theme.js`.
- Inverter datasheet values corrected (Huawei/Fronius) + `datasheet` URL field added.

### Pending
- Recalculare (7), per-String mounting, battery DB, theory, client PDF (P5).

---

## [0.9.5] — 2026-05-19 — TL Full-Model Regen · tl1 · temp1 · Kt Renorm Fix

### Added
- **`data/tl1.png`** (generating) — 1°×1° global Linke turbidity grid, 181 lats × 361 lons × 12 months
  - Method: identical to tl5 — binary search against NASA POWER MERRA-2 CLRSKY using full Ineichen (beam+diffuse)
  - Layout: horizontal PNG 4332×181; encoding: pixel = round(TL × 20); ~14 h runtime, resumable
- **`data/temp1.png`** — 1°×1° monthly T₂m air temperature, 8-bit PNG, 4332×181 horizontal layout
  - Renamed from `temperature.png`; same encoding as temp5.png (pixel = °C + 128)
- **`scripts/generate-tl-grid-1deg.js`** — 1°×1° TL grid generator (65 341 points × 12 months)
  - Same ghiFull back-solving as tl5; progress saved to `tl1-grid-progress.json` for resume

### Changed
- **`data/tl5.png`** regenerated using full Ineichen model (beam + diffuse) for TL back-solving
  - Previous: beam-only `ghiIneichen = dni × sinEl` — engine always predicted higher clearsky than NASA POWER (≈7% DHI inflation bias)
  - Now: `ghiFull = dni × sinEl + dhi` — engine clear-sky GHI matches NASA POWER by construction
  - TL range: 1.00 – 9.00, mean 3.10 (was 1.00 – 8.35, mean 2.60); file 12.8 KB
- **`scripts/generate-tl-grid.js`** — updated: replaced `ghiIneichen` with `ghiFull`, fixed header comment (horizontal layout, not stacked)
- **`scripts/generate-temperature-png.js`** — fixed output layout: was writing stacked PNG (73×444); now writes correct horizontal (876×37) matching all decoders; usage example updated to `temp1.png`

### Fixed
- **Ineichen Kt renorm closure bug** in `js/yield-engine.js`
  - `_clearSkyMonthSums` passes only `(el, n, lat)` to its `clearSkyFn` callback; `clearSkyHofierka(el,n,lat,tlOverride)` would have received `lon` as `tlOverride`, producing absurd TL values (e.g. lon=25.6 → TL override 25.6)
  - Fix: closure `const ineWithLon = (el, n, lt) => clearSkyFn(el, n, lt, lon)` wraps only the Ineichen computation; `_clearSkyMonthSums` kept at 3-arg call; Hofierka path unchanged
  - Same closure pattern applied in `calcYieldDailyTilt`

---

## [0.9.4] — 2026-05-19 — Linke Turbidity Grid · DHI Fix · tlViz

### Added
- **`data/tl5.png`** — 5°×5° global Linke turbidity grid, 37 lats × 73 lons × 12 months
  - Method: per-node binary search against NASA POWER MERRA-2 `CLRSKY_SFC_SW_DWN` — back-calculates TL that makes the Ineichen beam-only model match NASA POWER's clear-sky GHI
  - Encoding: pixel = round(TL × 20); decode: TL = pixel / 20; PNG 876×37 (horizontal layout — months side-by-side)
  - TL range: 1.00 – 8.35, global mean 2.60 *(regenerated in v0.9.5 using full model)*
  - Validated via `test-tl-ineichen.js`: Simple/POWER = 0.996 (construction check ✓); Full/POWER = 1.045 (4.5% diffuse term — expected and physically correct)
- **`js/tl-png.js`** — browser PNG loader for tl.png; decodes horizontal layout back to `(m*NLATS+r)*NLONS+c` array; returns `Uint8Array`, decode TL = value/20
- **`tlViz.html`** — interactive Leaflet visualisation of the TL grid
  - Month slider, opacity slider, 8-class colour scale (now 9 including split bottom bucket)
  - Polar-night cells rendered with diagonal hatch pattern (`isPolarNight()` from Spencer declination)
  - World-wrap rendering (draws for lonOff ∈ [0, −360, +360]) — prevents gaps at ±180°
  - Tooltip shows all 12 monthly TL values, annual mean, grid node coordinates
  - **Colour scale split** (v0.9.4): `< 1.5` — deep navy (Antarctic/deep ocean); `1.5–2.0` — sky blue (pristine maritime) — makes seasonal variation in clean-ocean regions visible
- **`scripts/generate-tl-grid.js`** — one-time Node.js generator (~9 min, resumable via `tl-grid-progress.json`)
  - Uses beam-only Ineichen formula for back-solving (avoids unbounded DHI term)
  - Horizontal PNG layout (876×37) for better DEFLATE compression vs stacked (444×73)
  - Patching: 44 cells where NASA POWER returned API errors were individually re-fetched and patched post-generation
- **`scripts/test-tl-ineichen.js`** — validation script; tests 8 representative cities against live NASA POWER CLRSKY; reports simple/POWER and full/POWER ratios, DHI inflation percentage
- **`js/config.js`** — added `tlUrl: 'data/tl5.png?v=2'`

### Fixed
- **DHI coefficient decimal-point error in `js/irradiance-ineichen.js`** (Mode A)
  - `0.27 − 0.0017·TL` was 10× too large — should be `0.027 − 0.00017·TL`
  - Effect: clear-sky DHI was ~10× overestimated, inflating full clear-sky GHI by ~39% at typical TL=2.5
  - After fix: Full/POWER validation ratio improved from 1.392 → 1.045 (±4.5% — expected diffuse term)
  - **SCIENCE.md §4A.3 updated** with correct formula and correction note
- **Southern-Hemisphere season reversal in `scripts/generate-kt-grid-1deg.js`**
  - `_getTL(lat, mo)` used `Math.abs(lat)` for the latitude band but did not flip the month index for SH sites — Sydney July got NH-summer TL=4.64 instead of the correct SH-winter TL=2.68
  - Fixed: `mIdx = lat < 0 ? (mo + 6) % 12 : mo` before the table lookup

---

## [0.9.3] — 2026-05-18 — PNG Grids · Elevation Offline · 1°×1° Kt

### Added
- **`js/elevation-png.js`** — manual PNG parser + `DecompressionStream('deflate')` loader for elevation.png
  - Replaces the old inline IDAT approach; returns `Int16Array` of metres, north-first row-major
- **`js/temp-png.js`** — same pattern for temperature PNG; returns `Int8Array` of signed °C
- **`data/elevation.png`** — 0.1°×0.1° global terrain elevation (ETOPO2022), 8-bit grayscale PNG
  - Encoding: `pixel = round(max(0, elev_m) / 25)`, decode: `elev_m ≈ pixel × 25`; ocean clamped to 0
  - Replaces `data/elevation.bin` (1°×1°) — 18× higher resolution, ~25 m vertical precision
  - Valid standard PNG — opens in Mac Preview, Windows Photos, any image viewer
- **`data/temp5.png`** — 5°×5° monthly temperature re-encoded as 8-bit grayscale PNG
  - Layout: horizontal — width=73×12=876, height=37; `pixel = temp_°C + 128`; valid standard PNG
  - Replaces binary `temp.bin` loader with `loadTemperaturePng(url)` in `temp-grid.js`
- **`scripts/generate-elevation-png.js`** — generates elevation.png from ETOPO2022 source
- **`scripts/generate-temperature-png.js`** — converts temp.bin → temp5.png (generic, works for 1°×1° too)
- **`scripts/generate-kt-grid-1deg.js`** — 1°×1° global Kt_cs grid generator
  - Phase 1: 3 staggered PVGIS workers; SARAH2 → NSRDB → ERA5 cascade per land cell
  - Phase 2: NASA POWER batch (100 pts/req) for ocean/polar cells
  - Normalisation: `Kt_cs = GHI_pvgis / clearsky_hofierka` — Hofierka-normalised, no formula error
  - Outputs `data/kt1.bin` (Uint8, value=round(Kt×100)) + `data/kt1-sources.bin` (provenance)
  - Source legend: 1=NASA-POWER, 2=PVGIS-SARAH2, 3=PVGIS-NSRDB, 4=PVGIS-ERA5
- **`scripts/test-kt-1deg.js`** — dry-run validation: 12 representative points (land/ocean/polar/coastal)
- **`js/config.js`** now centralises ALL grid constants — `ELEV_*`, `KT_*`, `TEMP_*` globals
  - Eliminates duplicate declarations in viz files and grid loaders

### Changed
- **PNG compression** switched from raw DEFLATE (`deflate-raw`) to standard zlib DEFLATE
  - `deflateRawSync` → `deflateSync` in all generators; `DecompressionStream('deflate-raw')` → `'deflate'` in all loaders
  - PNG files are now valid and open in Mac Preview, Windows Photos, and all standard viewers
- **Live elevation API removed** (`js/elevation.js`)
  - open-meteo.com Copernicus DEM 90 m fetch removed; no localStorage caching needed
  - `updateElevation()` reads directly from the offline ETOPO2022 PNG grid (instant, no network)
- **`js/temp-grid.js`** — uses `loadTemperaturePng(CONFIG.tempUrl)` via new `temp-png.js`

### Fixed
- **`ktViz.html`** — broken due to duplicate `const KT_*` declarations in inline `<script>` shadowing config.js globals; removed duplicates

### Removed
- `data/elevation.bin` — superseded by elevation.png (higher resolution, valid PNG format)
- `data/elevation05.bin` — superseded
- `scripts/generate-elevation-grid.js` — superseded by generate-elevation-png.js
- `scripts/patch-elevation-highlat.js` — not needed; ETOPO2022 has global coverage including high latitudes
- `scripts/generate-temp-grid.js` — superseded by generate-temperature-png.js

---

## [0.9.2] — 2026-05-14 — Kt Formula Fix · Auto-Tilt · UI Improvements

### Fixed
- **Kt source data diagnosis** (`yield-engine.js`, `SCIENCE.md`)
  - Cross-validated `kt5.bin` against 19 years of PVGIS SARAH-3 monthly GHI (Brașov 2005–2023). Found two compensating errors: (1) formula uses `clearsky_GHI × Kt ≈ 0.73×H₀ × Kt` → −27% formula error; (2) NASA POWER ALLSKY_KT overestimates PVGIS SARAH-3 by +11% on an H₀-weighted annual basis (monthly distribution differs by up to ±40% per month). Net error: 0.73 × 1.11 = 0.81 → ~−19% vs PVGIS.
  - Applying the correct formula `H₀ × Kt` without fixing source data causes +11% overestimate. Formula left as `clearsky × Kt` until `kt5.bin` is regenerated from PVGIS-quality source data.
  - Full analysis documented in `SCIENCE.md §11` and `Appendix B`.
- **Language switch did not re-render dynamic metric cards** (`i18n.js`)
  - `applyI18n()` only updated static `data-i18n` DOM elements; yield metrics, table headers, and chart labels baked the language in at calculation time and stayed Romanian after switching to English.
  - Fixed: `applyI18n()` now calls `runYield()` when results are already displayed.
- **Specific yield metric duplicated annual yield** (`yield-ui.js`)
  - Second metric card showed `annual/power` kWh/kWp — identical to annual yield when power = 1 kWp.
  - Replaced with **yearly in-plane irradiation (kWh/m²)**, matching PVGIS's two primary output values exactly.

### Added
- **Auto-tilt (motorised actuator)** — checkbox below tilt input (`yield-engine.js`, `yield-ui.js`, `index.html`)
  - Computes `β(n) = clamp(lat − δ(n), minTilt, maxTilt)` for each sampled day, integrating hourly irradiance with the daily-optimal panel angle.
  - Configurable mechanical limits: Min (default 15° — snow/drainage floor) and Max (default 60° — wind uplift ceiling).
  - Monthly table gains a **Tilt (°)** column showing average daily angle per month.
  - Metric card shows range (`15–60°`) and sub-label `Auto · β=lat−δ(n)`.
- **Yearly in-plane irradiation metric** — second KPI card now matches PVGIS label and value directly.
- **Metric labels match PVGIS exactly**: "Yearly PV energy production" / "Yearly in-plane irradiation".

## [0.9.1] — 2026-05-12 — pvlib Formula Audit & Bug Fixes

### Fixed
- **Spencer (1971) declination was actually Cooper (1969)** (`solar-geometry.js`)
  - Old function `declinationSpencer` implemented `23.45·sin(360°·(284+n)/365)` — this is the Cooper (1969) simple sinusoid (±0.3°), not Spencer (1971)
  - Replaced with the genuine Spencer (1971) 7-term Fourier series (±0.035°, 10× more accurate):
    `δ = R2D·[0.006918 − 0.399912·cos B + 0.070257·sin B − 0.006758·cos 2B + 0.000907·sin 2B − 0.002697·cos 3B + 0.001480·sin 3B]` where `B = 2π(n−1)/365`
  - Old formula renamed `declinationCooper()` and kept as a reference fallback
  - `declination()` backward-compatible alias now points to the correct Spencer series
- **Hay-Davies anisotropy index used wrong extraterrestrial value** (`yield-engine.js`)
  - `Ai = DNI / G0(0)` used the fixed Jan 1 extraterrestrial value (~1406 W/m²) as denominator for every day of year
  - Corrected to `Ai = DNI / G0(n)` — actual day's extraterrestrial irradiance
  - Also tightened cosZ denominator floor from `max(0.01, cosZ)` to `max(0.01745, cosZ)` (= cos 89°), matching pvlib
  - `transposeHayDavies()` now accepts `n` as 6th parameter; backward-compatible alias defaults to day 172
- **Equation of time day offset and divisor** (`solar-geometry.js`)
  - Was `B = 360°·(n−81)/364` — off by one day and wrong period
  - Corrected to `B = 360°·(n−80)/365` matching the PVCDROM reference formula

### Verified (matches pvlib / PVGIS Python exactly)
- Hofierka/Suri declination: `arcsin(0.3978·sin(B−1.4+0.03344·sin(B−0.048869)))`, B=2π·n/365.25 — exact match
- Perez epsilon formula: `((DHI+DNI)/DHI + 1.041·z³)/(1+1.041·z³)` — exact match
- Perez epsilon bin edges: [1.065, 1.230, 1.500, 1.950, 2.800, 4.500, 6.200] — exact match
- Perez F coefficient table (allsitescomposite1990): rounding differences ≤0.001 in all bins
- Perez F1/F2 formulas, a/b ratio, cos(85°)=0.08716 floor — exact match
- Hofierka/Suri clear-sky model (all coefficients) — exact match to PVGIS rsun_base.c

### Known limitation (documented)
- **Kt definition mismatch**: `kt5.bin` stores `ALLSKY_KT = actual_GHI / H₀_extraterrestrial` (NASA POWER parameter), but the yield engine applies it as a cloud factor multiplied against the clear-sky model output. Since clear-sky ≈ 0.75–0.82×H₀, the actual/clearsky factor is larger than ALLSKY_KT, causing ~15–20% irradiance underestimation. Proper fix: regenerate `kt5.bin` using `ALLSKY_SFC_SW_DWN / CLRSKY_SFC_SW_DWN` (NASA POWER cloud transmittance ratio). The PR fix in v0.9.0 partially compensates.

---

## [0.9.0] — 2026-05-12 — Perez Transposition + Temperature Derating + Elevation Live API

### Added
- **Perez (1990) diffuse transposition model** (`yield-engine.js`, new default)
  - Adds horizon-brightening term `F2·sin(β)` absent from Hay-Davies, improving accuracy by 3–8% in diffuse-rich climates
  - Sky clearness ε bins and F1/F2 coefficient table from Perez et al. (1990), allsitescomposite1990
  - `transposePerez(sun, cs, tiltDeg, azPVGIS, albedo, n)` — full implementation including sky brightness Δ = DHI·m/I₀
  - Selectable via new **Diffuse transposition** radio group in Yield sidebar: Hay-Davies / **Perez (selected by default)**
  - Model note at bottom of results updates to reflect active transposition model
- **Monthly temperature derating** (`js/temp-grid.js`, `data/temp.bin`)
  - NOCT cell temperature model: `T_cell = T₂ₘ + (NOCT−20)/800 × G_panel [W/m²]`
  - Per-module power derating: `derate = max(0, 1 + γ·(T_cell − 25))`
  - `data/temp.bin` — 37×73×12 = 32,412 Int8 values (1°C resolution, range −65…+39°C); generated from NASA POWER T2M climatological monthly means
  - `js/temp-grid.js` — `TEMP_DATA`, `resolveTemp(lat, lon, mo)` with bilinear interpolation; same grid geometry as kt-grid.js
  - On/off toggle **"Apply temperature derating"** (requires temp.bin) — gamma=0 when off
  - NOCT (°C) and γ Pmpp (%/°C) inputs in Physical constants section
  - Live T₂ₘ indicator shows min→max and all 12 monthly values once temp.bin loaded
  - `scripts/generate-temp-grid.js` — one-time Node.js script (~9 min, resumable)
- **`tempVisualization.html`** — standalone QA tool for the temperature grid
  - Month selector, −30…+40°C colour scale, tooltip with all 12 monthly values + annual mean
- **Two-stage live elevation** (`js/elevation.js` rewritten)
  - Stage 1: binary grid value shown instantly (0-latency placeholder)
  - Stage 2: open-meteo.com Copernicus DEM 90 m point fetch runs in background (~0.5 s); updates field when result arrives
  - Guard prevents stale updates if user moved location during fetch
  - Live values cached in localStorage (`elev:{lat.toFixed(3)},{lon.toFixed(3)}`)
  - CORS-enabled, no key required; previous open-elevation.com endpoint blocked browser CORS preflight
  - *(removed in v0.9.3 — offline PNG grid made live API redundant)*

### Changed
- **PR / system loss — removed double-counting** (`yield-ui.js`, `index.html`)
  - Previous formula: `effPR = PR × (1 − loss/100)` — applied two independent loss factors (e.g. 0.75 × 0.86 = 0.645)
  - Corrected to: `effPR = 1 − loss/100` — single system-loss factor matching PVGIS convention
  - PR dropdown removed; `System losses (%)` is now the sole efficiency parameter
  - Metric card now shows `PR = 1 − loss%` in subtitle
- **Elevation data files renamed** (`data/`)
  - `elevation.bin` ← formerly `elevation1x1.bin` (1°×1° grid, active profile)
  - `elevation05.bin` ← formerly `elevation.bin` (0.5°×0.5° grid)
  - `config.js` ELEV_PROFILES updated accordingly; active profile remains `'1x1'`
- **Chart resize on tab reveal** (`app.js`)
  - `pvChart.resize()` and `tiltChart.resize()` called when switching to Yield tab, fixing blank charts initialised while tab was hidden
- **Script cache busting** — `?v=N` suffix on all local `<script>` tags in index.html

---

## [0.8.6] — 2026-05-11 — Satellite Kt Grid + ASTER Elevation Patch + Visualization

### Added
- **`js/kt-grid.js`** — 5°×5° global clearness-index grid from NASA POWER satellite data
  - 37 lats × 73 lons × 12 months = 32,412 Uint8 values (~32 KB) — trivial file size
  - Parameter: `ALLSKY_KT` (actual GHI / extraterrestrial GHI), 20+ yr climatological mean
  - `getSatelliteKt(lat, lon, mo)` — bilinear interpolation across 4 surrounding nodes
  - `resolveKt(lat, lon, mo)` — transparent fallback: satellite grid when populated, `KT_TABLE` when stub
  - `KT_POPULATED` flag controls which path is taken (same pattern as `ELEV_POPULATED`)
- **`scripts/generate-kt-grid.js`** — one-time Node.js script (~45 min, fully resumable)
  - Queries NASA POWER free API, no key required, CORS `*`
  - 1 req/s rate limit respected; progress saved to `kt-grid-progress.json`
  - Output: `js/kt-grid.js` with `const KT_GRID_DATA = new Uint8Array([…32412 values…])`
- **`scripts/patch-elevation-highlat.js`** — patches high-latitude (|lat| > 58°) zero cells
  - SRTM (open-elevation.com) only covers 56°S–60°N; above that open-elevation returns 0
  - Queries opentopodata.org ASTER30m (83°S–83°N, 30 m, same resolution as SRTM, free, no key)
  - Batches 100 points per POST; ~230 batches, ~4 min; resumable
  - Result: 7,399 land cells patched (Russia, Siberia, Canada, Scandinavia, Greenland perimeter)
  - 15,504 remain 0 = true ocean + Antarctic ice (ASTER also has no-data there)
  - `js/elevation-grid.js` grew from 151 KB → 168 KB; land cells 11,418 → 18,817; max 5,893 → 8,189 m
- **`elevationVisualization.html`** — standalone grid QA tool (open directly in browser, `file://`)
  - CartoDB dark basemap + canvas overlay; 65,341 circles sized by elevation, coloured by band
  - Live hover tooltip showing stored value vs cursor position
  - Controls: radius scale, opacity, hide ocean, show 5°×5° Kt grid overlay
  - Stats bar: total points, land count, max elevation, mean land elevation, visible count
  - Redraws on every map move/zoom; no server required

### Changed
- **`scripts/generate-elevation-grid.js`** — now auto-selects API by latitude:
  - |lat| ≤ 58°: open-elevation.com SRTM (batch 500)
  - |lat| > 58°: opentopodata.org ASTER30m (batch 100)
  - Future full regenerations produce a correct global grid in one run
- **`js/yield-engine.js`** — `getKt(lat, mo)` replaced by `resolveKt(lat, lon, mo)`
  - Yield calculation now uses longitude-aware satellite Kt when grid is populated
  - Zero code change needed at call sites; `resolveKt` handles both paths transparently
- **`index.html`** — added `<script src="js/kt-grid.js">` before yield-engine.js
- **Timezone auto-select** — `autoTimezone(lon)` added to `map.js`; fires on every location change
  - `Math.round(lon / 15)` clamped to select range; `bestDiff` loop handles half-hour zones

---

## [0.8.5] — 2026-05-11 — Site Elevation & Air-Mass Pressure Correction

### Added
- **Site elevation field** in Location sidebar card — auto-filled on every map interaction
  - Shows nearest-integer-degree grid value immediately (offline, no network needed)
  - Refines async with live SRTM 30 m lookup from open-elevation.com (CORS *, free, no key)
  - Live values cached in `localStorage` (key: `elev:{lat.toFixed(2)},{lon.toFixed(2)}`)
  - Manual override supported — user can type any altitude
- **`js/elevation-grid.js`** — 1°×1° global elevation stub (65,341 Int16 values, all-zero until populated)
- **`js/elevation.js`** — `getElevationGrid(lat, lon)`, `fetchElevationLive(lat, lon)`, `updateElevation(lat, lon)`
- **`scripts/generate-elevation-grid.js`** — one-time Node.js script to populate the grid
  - Batches 500 points per POST to `https://api.open-elevation.com/api/v1/lookup`
  - ~131 batches, ~3–5 min with 1.2 s delay; supports resume via progress JSON file
  - Output: `js/elevation-grid.js` with `const ELEV_DATA = new Int16Array([…65341 values…])`
- **Barometric pressure correction for optical air mass** in Hofierka Mode B
  - `airMass(elDeg, siteElevM)`: `AM *= exp(−z/8434.5)` matching PVGIS `rayleigh_optical_thickness.py`
  - At 500 m: AM reduced by ~5.7%; at 2000 m: ~21% — meaningful for high-altitude sites
  - Correction is 0 (no-op) when elevation = 0 m (sea level default / stub grid)

### Changed
- `clearSkyHofierka(elDeg, n, lat, tlOverride, siteElevM)` — added `siteElevM` parameter (default 0)
- `getIrradianceModel()` in `yield-ui.js` reads `#site-elevation` and threads it into the Hofierka closure
- `setCoords()` in `map.js` now calls `updateElevation(lat, lng)` after every location change

---

## [0.8.4] — 2026-05-11 — Editable Constants & Swappable Declination

### Added
- **Solar constant G_sc** editable input in Yield tab (default 1361 W/m²; hint shows WRC/PVGIS/TIS reference values)
  - `GSC` is now a mutable global in `solar-geometry.js`; `runYield()` writes it before each calculation
  - Both `G0()` (Mode A) and `G0_hofierka()` (Mode B) read from the same global — one input controls both
- **Solar declination formula selector** (radio button, Yield tab):
  - `declinationSpencer(n)` — Spencer (1971), `23.45·sin(360°·(284+n)/365)`, ±0.3°, default
  - `declinationHofierka(n)` — PVGIS native, `arcsin(0.3978·sin(dayAngle−1.4+0.03344·sin(dayAngle−0.048869)))`, ±0.2°
  - `declination(n)` kept as backward-compatible alias → Spencer
  - `sunPos()` accepts optional 7th parameter `declinFn`; defaults to Spencer when omitted (canvas drawing unaffected)
  - `calcYield()` and `findOptimal()` accept `declinFn` as last parameter and pass it to every `sunPos()` call
- Method note in result area now shows active declination formula name and G_sc value used

### Changed
- `irradiance-hofierka.js` `G0_hofierka()` now reads global `GSC` instead of hardcoded 1360.8

---

## [0.8.3] — 2026-05-11 — Hofierka Model Accuracy Fixes

### Fixed
- **Solar constant** corrected from 1367 W/m² to **1360.8 W/m²** in `G0_hofierka()`
  (modern Total Solar Irradiance measurement; matches `pvgis/constants.py:SOLAR_CONSTANT`)
- **Atmospheric refraction** now applied to solar elevation before computing optical air mass
  in Hofierka Mode B — improves accuracy at low sun angles (sunrise/sunset, winter at high latitudes)
  Formula: `Δh = 0.061359·(0.1594 + 1.123·h + 0.065656·h²) / (1 + 28.9344·h + 277.3971·h²)`
  (matches PVGIS `calculate_refracted_solar_altitude_series()` / Kasten formulation)
- Combined effect: ~0.5% lower peak DNI, ~2–5% better accuracy near horizon

### Verified unchanged (matches PVGIS Python source exactly)
- Rayleigh optical thickness polynomial (both AM ≤ 20 and AM > 20 branches)
- `Tn(TL)` diffuse transmission function coefficients
- `fd(h, TL)` angular distribution coefficients (A1/A2/A3) and A1 clamp guard
- Ground reflection formula `GHI·ρ_g·(1−cosβ)/2`

---

## [0.8.2] — 2026-05-08 — N_p Formula Fix

### Fixed
- **String Sizing N_p,max formula** — two independent limits now correctly use matching current types:
  - `N_p,sc = floor(I_sc,MPPT / I_SC,STC)` — fault/short-circuit protection check
  - `N_p,op = floor(I_max,MPPT / I_mp,STC)` — steady-state operating current check (previously incorrectly used I_SC instead of I_mp)
  - `N_p,max = min(N_p,sc, N_p,op)`
- Added separate warnings for each binding constraint (fault current vs operating current)
- Added hint when operating current is the limiting factor (showing actual margin)

### Impact
- Huawei SUN2000-5KTL-L1: N_p,max was showing 0 (FAIL) due to comparing I_max,MPPT=13A against I_SC=13.8A; now correctly 1 (OK) since I_mp=12.9A ≤ 13A

---

## [0.8.1] — 2026-05-08 — Inverter Template System

### Added
- **Inverter template selector** in String Sizing tab — dropdown auto-fills all 6 inverter fields
- `js/inverter-index.js` — central registry (`INVERTER_LIST`, `populateInverterSelect`, `loadInverterTemplate`)
- `js/inverter-generic-5kw.js` — generic 5 kW placeholder template
- `js/inverter-victron-multiplus2-48-5000.js` — Victron SmartSolar MPPT 250/100 (battery charge controller; 70 A input, 250 V window)
- `js/inverter-fronius-symo-hybrid-5-3s.js` — Fronius Symo Hybrid 5.0-3-S (per-string-input specs; 800 V, 18 A MPPT)
- `js/inverter-huawei-sun2000-5kw.js` — Huawei SUN2000-5KTL-L1 (per MPPT tracker; 1000 V, 13 A operating, 20 A SC)
- Inverter note field (`#ss-inverter-note`) shows model description and architecture notes after template load
- Convention: values in each file are **per MPPT input** (not per inverter total)

### Changed
- Inverter fields retain manual editability after template load

---

## [0.8.0] — 2026-05-08 — Modular Refactor + Hofierka Model

### Added
- **Hofierka/Suri (2002) clear-sky model** — Mode B irradiance option in Yield tab
  - Linke turbidity (TL) from 8-latitude × 12-month lookup table (PVGIS native values)
  - Optional manual TL override input
  - Kasten air mass formula, Rayleigh optical thickness polynomial
  - DNI = G0·exp(−0.8662·TL·AM·τ_R); DHI = G0·t_n(TL)·f_d(el,TL)
  - `js/irradiance-hofierka.js`
- **Irradiance model radio selector** in Yield sidebar panel (Mode A / Mode B)
  - TL override row shown only when Mode B is selected
  - Method note in result area updates to show which model was used
- **Dependency injection for irradiance models** — `calcYield` and `findOptimal` accept `clearSkyFn` as last parameter; caller decides which model to use

### Changed
- **Full modular refactor** — monolithic `<script>` block split into 13 JS files:
  - `js/constants.js` — shared arrays
  - `js/theme.js` — theme state
  - `js/solar-geometry.js` — pure solar geometry
  - `js/convention.js` — azimuth convention state + conversions
  - `js/irradiance-ineichen.js` — Mode A clear-sky
  - `js/irradiance-hofierka.js` — Mode B clear-sky
  - `js/yield-engine.js` — yield calculation core
  - `js/yield-ui.js` — yield tab rendering
  - `js/canvas.js` — canvas drawing
  - `js/map.js` — Leaflet map
  - `js/obstacles.js` — obstacle state
  - `js/string-ui.js` — string sizing tab
  - `js/app.js` — composition root
- Converted from `type="module"` ES modules to plain `<script>` tags with global namespace
  - Reason: ES modules are blocked by CORS policy on `file://` URLs; no server required
  - Load order in `index.html` replaces import graph

---

## [0.7.0] — 2026-05-08 — String Sizing Tab

### Added
- **String Sizing tab** — fourth tab implementing Neamț §11 formulas
- Module datasheet inputs: V_OC,STC · V_mp,STC · I_SC,STC · I_mp,STC · λV · λI · N_MOT
- Inverter datasheet inputs: V_max,inv · V_r,MPPT · V_min/max,MPPT · I_max,MPPT · I_sc,MPPT
- Site inputs: T_a,min · T_a,max · G_min · G_max
- Computed intermediate values: T_min, T_max (cell temps at extreme irradiance), V_OC,max, V_mp,min
- Primary outputs: N_s,max · N_s,min · N_opt · N_p,max with OK/FAIL badges
- String configuration table: per-N_s row with string V_OC (cold), V_mp (hot), V_mp (STC), MPPT range check, parallel count
- Parallel limit: floor(I_sc,MPPT / I_SC) — fault protection (corrected to two-limit formula in v0.8.2)
- Warnings and recommendations: incompatible voltage window, N_opt outside valid range, inverter current too low
- Formula reference note in output area (all equations cited to Neamț §11)

---

## [0.6.0] — 2026-05-08 — Static Yield Engine

### Added
- **Full client-side irradiance engine** — no API dependency
  - Ineichen/Perez clear-sky model (GHI, DNI, DHI)
  - Hay-Davies anisotropic transposition to tilted plane (direct + diffuse + reflected)
  - Monthly clearness index Kt lookup table (8 latitude bands × 12 months, Liu-Jordan climatology)
  - Hourly integration over full year (365 days × 24 hours)
  - Ground albedo input (grass/concrete/snow)
  - Performance ratio and system loss inputs
- **Tilt optimizer** — brute-force grid search over tilt 0–80° and azimuth ±45°
- **Tilt curve chart** — annual yield vs tilt angle (Chart.js line chart) with selected-tilt marker
- **Optimal yield metric** — always shows best-case alongside user-specified case
- **Horizon shading integration** — hourly check against 36-point obstacle array
- **Method note** — accuracy disclaimer (±10–15% vs satellite data)

### Changed
- Tab renamed "PVGIS Yield" → "Yield Calc" (no longer API-dependent)
- Performance ratio selector replaces technology/mounting dropdowns
- Albedo selector added

---

## [0.5.1] — 2026-05-08 — Character Encoding Fix

### Fixed
- All special characters (`°`, `→`, `±`, `−`, `↑`, `…`) now use HTML entities or Unicode escapes
- Added `<meta charset="utf-8">` declaration
- Eliminated `Â°` / `â†'` rendering artifacts in Safari and older Chromium builds

---

## [0.5.0] — 2026-05-08 — PVGIS API Tab

### Added
- **PVGIS Yield tab** — third tab in the menu bar
- PVGIS `PVcalc` API call proxied (CORS workaround)
- System inputs: peak power, losses, technology, mounting type
- Panel orientation: tilt and PVGIS-convention azimuth (0°=South)
- Optional: let PVGIS calculate optimal tilt & azimuth
- Optional: pass horizon array from Obstacles tab as `userhorizon` parameter
- Monthly energy bar chart (Chart.js)
- Monthly data table with irradiance column and relative bar
- Three metric cards: annual yield, specific yield, tilt/azimuth used
- PVGIS attribution and external link

### Changed
- Chart.js loaded from cdnjs CDN

---

## [0.4.0] — 2026-05-08 — Topbar Merge

### Changed
- Merged two-row layout (title bar + tab bar) into a single topbar row
- Tab buttons (Sun Path / Horizon / Obstacles) on the left of topbar
- Theme switcher (System / Light / Dark) on the right of topbar
- Removed "Sun Path Chart" title text — tabs serve as navigation label

---

## [0.3.0] — 2026-05-08 — Azimuth Convention Clarity

### Added
- **Convention switcher** in Horizon panel: Nav/Chart (0°=N) vs PVGIS/Solar (0°=S)
- All obstacles stored internally in Nav convention; PVGIS equivalents computed and displayed
- Obstacle list shows both Nav and PVGIS azimuth ranges with colour-coded badges
- Horizon chart annotates N/E/S/W compass points with dual convention labels
- X-axis label explicitly states Nav convention on both chart types
- `conv-hint` text updates dynamically with a concrete example per convention

### Changed
- Obstacle azimuth inputs relabelled dynamically based on selected convention
- `buildHorizonArr()` always outputs Nav-based 36-point array regardless of input convention
- Horizon chart x-axis label includes full dual-convention string

---

## [0.2.0] — 2026-05-08 — Horizon / Obstacles Tab

### Added
- **Horizon / Obstacles tab** — second tab in menu
- Obstacle definition: label, azimuth range (start/end), elevation angle
- Obstacle list with per-item removal and colour coding
- `buildHorizonArr()` — converts obstacle list to 36-point horizon elevation array
- **PVGIS horizon.txt export** — one elevation value per line, 36 values CW from North
- Horizon profile chart — full 360° azimuth view with obstacle rectangles overlaid
- Jun 21 and Dec 21 sun path arcs shown in horizon chart for shading context
- Combined horizon line in red (envelope of all obstacles)
- Horizon overlay on Sun Path tab — shaded risk zone + dashed red line

### Changed
- Sun path legend gains "Horizon" item when obstacles are present
- Sidebar panel switches on tab change (sp-panel / hz-panel)

---

## [0.1.1] — 2026-05-08 — Defaults Update

### Changed
- Default timezone: UTC+0 (Greenwich), pre-selected
- Default dates mode: "All 12 months" moved to first position, pre-selected
- Default coordinates: Greenwich Observatory (51.4769°N, 0.0005°W)
- Map centres on Greenwich at zoom 10

---

## [0.1.0] — 2026-05-08 — Leaflet Map Location Picker

### Added
- **Leaflet.js map** replacing US ZIP code input
- CartoDB light/dark tiles — switches automatically with theme
- Click-to-place pin on map
- Draggable marker
- **Nominatim geocoder** — free-text place search, worldwide
- Lat/lon inputs remain editable and sync bidirectionally with map pin
- Map defaults to Brașov, Romania (45.65°N, 25.63°E)

### Removed
- US ZIP code radio option and zippopotam.us lookup

---

## [0.0.5] — 2026-05-08 — Theme Switcher

### Added
- **System / Light / Dark** theme switcher in topbar
- CSS custom properties for all colours (--bg, --surface, --border, --text, --input-bg)
- `.dark` class toggled on `<body>` by `applyTheme()`
- `sysDark` media query listener for live OS theme changes
- Canvas background, grid, axis, and text colours all derive from theme state
- CartoDB dark tiles used in dark mode, light tiles in light mode

### Changed
- All form elements (inputs, selects) styled with CSS variables
- `isDark()` function is single source of truth for both CSS and canvas drawing

---

## [0.0.4] — 2026-05-08 — Base Consolidation

### Added
- Unified base from human-viewer and robot-deployment branches
- Pill label helper (`pill()`) for month names and hour badges
- Auto-cropped azimuth axis (fits data ± one grid step)
- Hourly crossing lines with purple AM/PM pill badges
- Month-peak pill labels on arc apexes
- Download PNG button

### Changed
- Solar math consolidated: `declination()`, `equationOfTime()`, `sunPos()`
- Date sets: All 12 / Dec→Jun / Jun→Dec / Single date
- LST vs solar time toggle

---

## [0.0.3] — 2026-05-08 — Robot Deployment Branch

### Added
- Robot-specific overlay: shading risk zone, roof azimuth guide line
- Tilt optimizer chart (annual yield vs tilt)
- Irradiance heatmap (month × hour)
- Deployment action plan generator
- String sizing formulas (Ns_max, Ns_min, Nopt, Np_max per PDF §11)

*Note: robot branch later merged with human branch into base [0.0.4]*

---

## [0.0.2] — 2026-05-08 — Visual Redesign

### Changed
- Replaced UO SRML chart style with modern pill-label design
- Colored arcs per month (spectral gradient)
- Reference: screenshot from third-party sun path tool showing pill labels
- Hour badges on crossing lines (purple rounded pills)
- Clean minimal axes with dashed grid

---

## [0.0.1] — 2026-05-08 — Initial Build

### Added
- Cartesian sun path chart (canvas-based)
- Solar math: declination, equation of time, altitude/azimuth
- Date modes: Dec→Jun, Jun→Dec, typical months, single date
- LST vs solar time
- Latitude/longitude + US ZIP input (zippopotam.us)
- Full UTC−12 to UTC+14 timezone selector
- Form matches original UO SRML `SunChartProgram.html` fields
- PDF/PNG output placeholder

### Context
- Built as replacement for defunct `solardat.uoregon.edu/SunChartProgram.html`
- Original site archived on Wayback Machine; HTML extracted from archive
- Original site used server-side CGI (`SunChart.cgi`) — no client JS to extract
- Referenced in: Neamț L., *Proiectarea unui sistem fotovoltaic on-grid*, UTC Cluj, 2007 [ref. 4]
