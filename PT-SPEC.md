# PT-SPEC — Proiect Tehnic (PTh+DDE) generator — design blueprint

> **Status: Phase PT-1 IMPLEMENTED (2026-06-12) — pt.html + js/pt-doc.js + js/pt-text-ro/en.js.**
> Built: admin/grid form (all PT fields live on pt.html, not step 1 — deviation from §8 for UX
> cohesion), chapter registry + self-paginating A4 engine (D7), chapters cover/borderou/
> semnături/atestate/cuprins/1-6b/teste/faze, pre-flight, **Anexa 1 with the retired client
> PDF's graphs** (report-pdf.js + pdfmake removed from report.html; its button now opens
> pt.html), and the P-A planșe placeholder pages (pulled forward from Phase PT-5).
> Chapter numbering is DYNAMIC (registry order) — numbers shift as PT-2/PT-3 chapters arrive,
> cuprins/borderou regenerate. Numbered chapters ALWAYS start on a fresh page (user decision).
> Every state value the document injects has an input box on pt.html, grouped in cards named
> after the SOURCE STEP (Locație/Componente/Conectare șiruri/Producție); derived values show
> as disabled "(calculat)" boxes refreshed from build().values. Next: Phase PT-2 (§8).
> This document remains the blueprint for turning the site's data into a government-grade
> Romanian Proiect Tehnic — written so any future agent can pick up without re-deriving. Reference document studied:
> `/Volumes/work/electro-zugrav/isgs fotovoltaice/Lia-PT-FOTOVOLTAICE-.pdf` (80 pp, BVG Electro
> Project, CEF 78,2 kWp Complexul Sportiv "Lia Manoliu", PTh+DDE, 2022) — text-extracted and
> analysed 2026-06-12. Related agent memory: `project_pt_report_spec.md`.

---

## 0. Goal and legal frame

Produce a **Memoriu Tehnic + annexes** structured per **HG 907/2016** (conținut-cadru PTh+DDE)
that an **ANRE-attested engineer** (atestat societate tip B + atestat proiectant IVA/IVB) can
review, stamp and sign **without reformatting anything**. The tool cannot replace the
attestation or the verificator de proiecte — water-tightness means: complete admin skeleton,
correct normative references, every number traceable to the project state, zero internal
contradictions (all prose data-driven).

**Two-document model:**
- **Memoriu Tehnic** — NEW generator (the bulk of this spec).
- **Anexa 1 — Breviar de calcul CEF** — the EXISTING report (report.html/client PDF), which
  already matches/beats the PV*SOL annex of the reference PT (per-string PVGIS official data,
  IEC 60891 defectoscopy, course-form cable math are all stronger than the reference).

## 1. Decisions taken (overridable, but don't re-litigate silently)

| # | Decision | Rationale |
|---|---|---|
| D1 | Memoriu is **bilingual RO/EN like the rest of the app** (USER DECISION 2026-06-12, overrides the earlier RO-only draft) | Two complete template sets with IDENTICAL placeholder keys: `js/pt-text-ro.js` + `js/pt-text-en.js`. The generated document is single-language (picked by the UI language at generation time, with an explicit language switch on pt.html itself); RO remains the legally operative version for Romanian submissions — note this in the EN cover footer. Normative reference TITLES stay in RO in both versions (they are proper names). |
| D2 | New page **pt.html**, phase D (after report.html in SITE_MAP) | report.html stays the simple client deliverable; the PT is a separate, much longer artifact. Page contract identical to other steps (site-nav shell, gate, Project state). |
| D3 | Chapter prose lives in **js/pt-text-ro.js / js/pt-text-en.js** as template strings with `{placeholders}` | Keeps the 30+ pages of legal text out of i18n_xx.js (which is UI strings) and out of the HTML (testable, diffable). Chapter ids/keys shared; a missing EN key falls back to RO (never blank). |
| D4 | Output = **print-optimized HTML → browser print-to-PDF (A4)** | An 80-page doc through jsPDF (report-pdf.js style) is madness. Charts reused as `<canvas>`/`<img>`. |
| D5 | Planșe (drawings) are **phased**: placeholders → auto plan-amplasament → auto single-line | See §6. Never block the memoriu on CAD. |
| D6 | The unbuilt steps **10–14 are the missing PT chapters** — build them AS PT feeders | Economics (10–11) → cap. financiar; Deviz (12) → Lista de cantități; Avize (13) → cap. ANRE/CEFND + ATR flow; Plan instalare (14) → faze determinante/PIF/organizare șantier. |
| D7 | **Pagination = explicit A4 page boxes, each rendering its own header strip; continuous numbering** (USER approved the recommendation) | Browsers don't implement `@page` margin boxes, so per-page "Cod \| MEMORIU TEHNIC \| Ediția/Revizia \| Pag. X/Y" headers like the reference PT require self-paginated layout: pt-doc.js flows rendered chapter HTML into fixed 297 mm boxes (measure-and-split; never split a table row or a formula block). Continuous "Pag. X/Y" across the whole artifact; the borderou's per-section page counts are DERIVED from the real boxes, not estimated. Browser print headers/footers OFF (we own the chrome). |
| D8 | **Verificator de proiecte block: YES** (USER DECISION) | `meta.verificator { nume, atestat, domeniu: 'Ie', firma }` + a cover/signature-list row ("Verificator proiect — cerința Ie — nume — atestat nr. — semnătura" left for wet ink). Pre-flight warns when empty but does not block (verificator is often contracted later). |

## 2. Data-model additions (project-state.js)

> **USER DECISION (2026-06-12, post-PT-1): NO seeded defaults anywhere in the PT.** The field
> values shown in the snippet below ('PTh+DDE', editie 1, categoria 'C', domeniu 'Ie',
> mode 'no-injection', tensiune 0.4, auto codDoc) are documentation of the field MEANINGS,
> not initial values — the state ships them EMPTY/null, the pt.html form uses placeholders
> only, and pt-doc renders missing values as [de completat] + pre-flight entries (an unset
> grid.mode flags `gridmode` instead of assuming SEM).

```js
meta: {
  // existing: first, last, name, address, projectName, projectRef
  beneficiar:   { firma: '', adresa: '', contact: '' },   // ≠ client name when institutional
  proiectant:   { firma: '', nume: '', atestatSocietate: '',   // "ANRE tip B nr. …"
                  atestatProiectant: '', adresa: '' },          // "ANRE grad IVA/IVB nr. …"
  faza:         'PTh+DDE',
  codDoc:       '',            // e.g. "MT-XXX-01"; auto "MT-<projectRef>" if empty
  editie: 1, revizie: 0,
  categoriaImportanta: 'C',    // HGR 766/1997
  dataIntocmirii: '',          // ISO date
  verificator:  { nume: '', atestat: '', domeniu: 'Ie', firma: '' },   // D8 — wet-ink signature row
},
grid: {                        // NEW section — racordare (feeds cap. 6 + CEFND)
  mode: 'no-injection',        // 'no-injection' (SEM) | 'injection' (prosumator cu injecție)
  tensiuneRacord: 0.4,         // kV
  tablouRacord: '',            // "TGD …" free text
  ptAlimentare: '',            // PT/branșament description free text
  consumAnualKwh: null,        // mirror of consumption.annualKwh (editable override)
  atrNr: '', atrData: '',      // aviz tehnic de racordare, if obtained
},
economics: { ... }             // step 10–11 (see §5.4) — design when built
boq:       { rows: [...] }     // step 12 — auto-derived + manual rows (see §5.3)
```

Additive only; `_v` stays 2. Pages degrade gracefully: missing fields render as
`[de completat]` highlighted placeholders in pt.html preview (never silently blank in print —
print CSS turns unresolved placeholders red so a reviewer can't miss them).

## 3. Architecture — js/pt-doc.js

```js
const PT_CHAPTERS = [   // ORDER = document order; borderou + cuprins generated from this
  { id, title,                 // RO title, numbered automatically
    kind: 'template'|'computed'|'annex'|'placeholder',
    deps: ['strings','connections', …],   // Project sections consumed (for the "missing data" banner)
    render(state) → html },               // pure function, no DOM reads
];
```

- **Borderou** (document register) auto-built: one row per chapter/annex/planșă with code,
  page estimate, format (A4/A3).
- **Cuprins** auto-built with anchors; page numbers only in print (CSS counters).
- **Doc chrome**: every printed page header = `Cod | MEMORIU TEHNIC … | Ediția/Revizia | Pag.`
  (mirror of the reference PT header).
- Numbers go through `fnum` (the dev guide typography rule); dates RO format.
- Validation pass before print: list of unresolved placeholders + missing deps shown as a
  pre-flight checklist ("Lipsesc: atestat proiectant, lungime cablu AC, …").

## 4. Chapter map (mirror of the reference PT, with verdicts)

| # | Chapter | Kind | Source / notes |
|---|---|---|---|
| 0 | Copertă | computed | meta.* — titlu "Instalație de producere … energie solară {kWp} kW", beneficiar, adresă, proiectant |
| 0b | Borderou + Lista de semnături | computed | from PT_CHAPTERS + meta.proiectant (attestation numbers); signature lines stay EMPTY (wet ink) |
| 1 | Atestate | placeholder | 2 image slots (scanned certificates) — upload/paste or "se anexează" |
| 2 | Date generale | template | denumire, amplasament, beneficiar, faza, elaborator — 1 page |
| 3 | Necesitatea și oportunitatea | template | boilerplate + computed: economii kWh, CO₂ evitat (factor 0.265 kg/kWh RO mix 2023 — DO NOT copy reference's stale 0.5; cite source) |
| 4 | Lista abrevieri | static | curated once (ANRE, ATR, CEF, CEFND, SEN, ROCOF, RfG, SEM…) |
| 5 | Normative și reglementări | static | the big table: SR HD 60364-7-712, SR EN 62109-1/2, SR EN IEC 62790, SR EN 50530, SR EN 60269(-6), NTE 007/08/00, I7/2011, PE 102/103/116, 1 RE-Ip 30/2004, Legea 10/1995, Legea 50/1991, HG 907/2016, Legea 307/2006 + Ord. MAI 163/2007. CITE ONCE here; later chapters reference, never repeat (reference PT repeats fire law 3× — don't) |
| 6 | Prezentarea proiectului | computed+template | kWp, nr. module, racordare {grid.tensiuneRacord} în {grid.tablouRacord}, prosumator cu/fără injecție per grid.mode, categoria C, suprafață (Σ planes area / mounting), date climatice (location + temp grid Tmin/Tmax/Tmed), iradiere GHI anuală (engine or per-string PVGIS), consum anual, situația existentă (free text), soluția de racordare (template per grid.mode) |
| 6b | Date tehnice CEF + tabel configurație șiruri | computed | component list w/ quantities; PER-STRING table: Nr. module, P string, Imp, Ump, Isc, **Voc,cold (din §11)** — superior to reference which shows one string only |
| 7 | Breviar de calcul | computed | **our strength**: print the actual relations (14)–(20) with live values from connections (R_C, ΔU%, gPV window, Iz ≥ 1.25·Isc, AC sizing), §11 string sizing (Ns min/max, Voc cold), NOT a "see annex" cop-out. Cable table per string + AC |
| 8 | Tehnologia de montare / organizarea șantierului | template | 1 page generic (reference has 3 — trim) |
| 9 | CEFND — cerințe ANRE | static+small table | Ord. 208/2018 frequency-endurance table (47,5–51,5 Hz rows), ROCOF (2/1,5/1,25 Hz/s), protection settings table (Umin 0,85Un/3s, Umax, fmin 47,5/0,5s, fmax 52/0,5s — EDITABLE defaults), Ord. 228/2018, Ord. 51/2019 PIF notification, SEM no-injection paragraph conditional on grid.mode |
| 10 | Descrierea elementelor | computed | **fișe tehnice auto-generate** din MODULE_LIST/INVERTER_LIST (we have ~90% of the PV*SOL datasheet fields); structura de fixare (template + reference to vendor calc per D5/§6); trasee CC/CA (template + connections data); priză de pământ & paratrăsnet (template: Rd ≤ 1 Ω… wait — reference says ≤ 1 Ω for combined; keep their values: Rd ≤ 1 Ω, Ua=Upas ≤ 120 V, 1 RE-Ip 30/2004, STAS 2612-87, 12604/4-89); SPD per connections |
| 11 | SSM / protecția muncii | template | 1 page |
| 12 | Protecția mediului | template | ape/aer/zgomot/deșeuri + CO₂ number reused from cap. 3 |
| 13 | Măsuri siguranță + PSI | template | prevention list + reference §5 (no law repetition) |
| 14 | Teste, verificări, măsurări și PIF | static table | torque checks, inspecție vizuală, măsurători (Riz, continuitate PE, Rd priză), probe funcționale |
| 15 | Program urmărire execuție + FAZE DETERMINANTE | static table | the RI/PV/PVR × E/B/P matrix (9 rows, copy structure from reference p.26) — Legea 10/1995, HG 272/1994 |
| 16 | Lista de cantități | computed+manual | step-12 BoQ (§5.3) in 4 sections: instalații electrice / lucrări civile / montaj echipamente / echipare tablouri |
| A1 | Anexa 1 — Breviar calcul CEF | annex | = existing report (yield, monthly, PR, per-string PVGIS deltas, charts) |
| A2 | Anexa 2 — Calcul structură | placeholder | "se anexează raportul producătorului sistemului de montaj (K2 Base/echiv.)" + our wind.html screening printout as preliminary |
| P1–P5 | Planșe IE001–IE005 | phased | §6 |

## 5. Sub-specs for the feeder steps

### 5.1 Step 13 — Avize și documentație (avize.html)
Checklist-driven page: ATR (nr/dată → grid.atrNr), certificat racordare, notificare Ord. 51/2019,
dosarul prosumatorului. Each item: stare (de obținut/depus/obținut) + nr/dată. Renders cap. 9
adjacent info + a tracking table in the PT.

### 5.2 Step 14 — Plan de instalare (install.html)
Inputs: durată estimată, echipe, restricții acces. Renders cap. 8 + 15. Mostly template.

### 5.3 Step 12 — Deviz / Lista de cantități (deviz.html)
Auto-derived rows (source → quantity):
- module FV ← Σ strings count; invertor ← components.inverterId (1); structură ← planes/mounting totals
- cablu CC roșu/negru ← 2 × Σ connections.cables[stringId] (one-way m) + slack %
- cablu CA ← connections.lenAC; secțiuni from the computed S
- siguranțe gPV ← per-string fuse ratings (count = 2×strings with np>1); MCB/RCD AC ← connections verdicts
- conectori MC4 ← 2 × nr. strings + spares; priză de pământ kit (static defaults: electrozi, platbandă OlZn 40×4)
Manual rows: jgheaburi, tuburi, subtraversări, civile. Each row {cap, um, cant, src:'auto'|'manual'} —
auto rows recompute, manual persist verbatim.

### 5.4 Steps 10–11 — Analiză economică / ROI
PV*SOL financial page equivalent: investiție (manual), preț energie (js/electricity-prices.js —
EXISTS, UNUSED), inflație %, autoconsum % (needs consumption hourly overlap assumption — start
with user-set %), economii an 1, amortizare simplă + actualizată, cash-flow 20–25 ani, grafic.
Renders the financial chapter of Anexa 1. (Design detail deferred to its own session.)

> **STATUS (built): step 11 `economics.html` is live** — Neamț course pts 18-19, relations
> (21)-(28): B (e1/e2 self-consumption split), simple payback, RIR (VNA=0 solved numerically),
> NPV at market rate, discounted cash-flow chart + verdict; real vs optim × own/financed; RO/EN +
> Explain; `Project.economics` section. The pt-18 optim reference IS auto-computed (yield-engine
> `findOptimalTilt` at azimut 0 + optimal tilt, summed over strings into `sizing.optimalProdKwh`;
> economics auto-fills it). STILL TODO for PT-4: (a) autoconsum% refinement (currently the course
> annual-balance model = self-consume min(Wp,Wc) at e1); (b) wire `electricity-prices.js` once a
> country code is stored; (c) render this into the Anexa 1 financial chapter. inflație % not yet
> modeled (course uses constant B).

## 6. Planșe phasing

- **P-A (cheap)**: title-block placeholder pages for IE001–IE005 (cartuș with Desenat/Proiectat/
  Aprobat from meta.proiectant, faza, scara, cod planșă) + "se anexează" note. Borderou lists them.
- **P-B**: IE005 "Plan amplasament panouri" = the mounting planes SVG to scale (we already draw
  it — add title block + scale bar + north arrow from azimuth).
- **P-C (ambitious, last)**: IE002/003-style **schema monofilară SVG generator** from state:
  strings → gPV fuses → MPPT inputs → inverter → AC breaker/RCD → SPD → TE-CEF → TGD, with
  cable labels (type+section from connections) and SEM/analizor block when grid.mode='no-injection'.
  All data exists; it's pure SVG layout work. Spec separately before building.

## 7. What NOT to copy from the reference PT

- Law-list repetition across chapters (cite once in cap. 5).
- 6 pages of per-block K2 layout repetition — one to-scale figure carries it.
- 3 pages of generic șantier prose — 1 page.
- Their stale CO₂ factor (0,5 kg/kWh) and their PR=90,4% claim without loss budget — our numbers
  must carry sources (SCIENCE.md refs / ANRE-published grid factor).
- Scanned-image annexes where we can generate native tables (fișe tehnice).

## 8. Implementation phasing (for whoever picks this up)

1. **Phase PT-1 (skeleton)**: meta+grid fields (step-1 card + pt.html form), pt-doc.js registry,
   chrome (header/borderou/cuprins/print CSS), chapters 0–6b, 14, 15 (computed+static), validation
   pre-flight. → already a signable-looking memoriu.
2. **Phase PT-2 (breviar + fișe)**: chapters 7, 10 (auto datasheets), CEFND cap. 9 with settings table.
3. **Phase PT-3 (feeders)**: step 12 BoQ → cap. 16; step 13 avize; step 14 plan instalare.
4. **Phase PT-4 (economics)**: steps 10–11 + financial chapter in Anexa 1.
5. **Phase PT-5 (planșe)**: P-A → P-B → P-C.

Each phase: bump SITE_MAP, deploy.sh registration, CHANGELOG, and update THIS FILE's status line.

## 9. Open questions — ALL RESOLVED by the user (2026-06-12)

- ~~RO-only vs bilingual~~ → **RO/EN like the rest of the app** (D1 rewritten).
- ~~Beneficiar vs client~~ → **separate `meta.beneficiar` entity** (as drafted in §2).
- ~~Atestate scans~~ → **"se anexează" placeholders**, no uploads into state.
- ~~Pagination~~ → **self-paginated A4 boxes with per-page header, continuous numbering** (new D7).
- ~~Verificator block~~ → **YES** — `meta.verificator` + signature row (new D8).

No open design questions remain; implementation can start at Phase PT-1 (§8).
