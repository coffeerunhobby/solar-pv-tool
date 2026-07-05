/* battery-list.js — Battery storage registry (BATTERY_BRANDS + BATTERY_LIST).

   SINGLE SOURCE OF TRUTH for the storage database. Loaded BEFORE string-ui.js (which used to
   host BATTERY_LIST) on every page that needs it, so the globals exist for the equipment UI and
   the economics autoconsum simulation. No ES modules - attaches plain globals (load-order graph).

   ── Why these fields (autoconsum simulation) ──────────────────────────────────────────────
   Battery capacity alone does NOT determine self-consumption: it is a timing problem between
   PV(t), load(t) and the battery state. The decisive parameters for an hourly/seasonal sim are
   the USABLE energy, the max CHARGE/DISCHARGE power (kW, not just A), the round-trip EFFICIENCY,
   and the min state of charge (SoC). Those drive E_battery in  Rac = (E_direct + E_battery) / Wp.

   ── SLUG RULESET (verbatim from MODULE_LIST/INVERTER_LIST; the dev guide) ──────────────────────
   id = slugify('<brand>-<model>'):  lowercase · ASCII only · every run of non-[a-z0-9] -> one
   hyphen (kills dots/slashes/parens/+) · hyphen is the ONLY separator · trim/collapse hyphens.
   e.g. "BYD HVS 10.2" -> 'byd-battery-box-premium-hvs-10-2'.

   ── Field reference ───────────────────────────────────────────────────────────────────────
     id            : slug (see ruleset)                         brandId : BATTERY_BRANDS[].id
     name          : display name in the dropdown              note    : one-line description
     datasheet     : manufacturer datasheet URL
     chemistry     : 'LiFePO4' | 'NMC' | 'VRLA'
     architecture  : 'hv' (stacked, ~90-600 V DC) | 'lv' (48 V)
     coupling      : 'dc' (DC-coupled to a hybrid inverter) | 'ac' (AC-coupled, e.g. Tesla PW)
     kwhNominal    : total rated energy of the listed configuration (kWh)
     kwhUsable     : usable energy of the listed configuration (kWh)  ← sim "capacitate utila"
     moduleKwh     : energy per stack module (kWh); null if not modular
     modulesMin/Max: stack range (module count) for the product line
     pChargeKw     : max continuous CHARGE power of the listed config (kW)
     pDischargeKw  : max continuous DISCHARGE power of the listed config (kW)
     pPeakKw       : peak/short discharge power (kW), optional
     effRt         : round-trip DC efficiency (0-1)             ← sim "randament"
     socMin        : min state of charge (%)                    ← sim "SOC minim"
     dod           : usable depth of discharge (0-1) = 1 - socMin/100
     cycles        : rated cycle life                          warrantyYears : warranty (years)
     vnom/vchrg/vdisch/ahnom : voltages (V) + Ah (LV needs these for current; HV nominal only)
     compatBrands    : INVERTER_BRANDS[].id list this pairs with (ecosystem-locked = one brand)
     compatInverters : optional specific INVERTER_LIST[].id list (overrides/narrows compatBrands)
     protocol        : open-LV comms protocol (e.g. 'pylontech-can'); null for locked ecosystems
     priceEur        : INDICATIVE retail price in EUR; the CHEAPEST reputable listing found across RO/HU/PL/
                       DE/FR/ES (reputable = established solar distributor or price-comparison merchant, NOT a
                       marketplace/dropshipper). Volatile - verify at purchase. Non-EUR sources converted with
                       FX_PER_EUR (config.js): RON/4.97, USD/1.08 (e.g. V-TAC 3470 lei ex-VAT ×1.19 /4.97 ≈ 830).
                       ⚠ BASIS varies: many lowest prices are DE shops at 0% solar VAT (§12 UStG) so they read
                       lower than a VAT-inclusive RO price - a RO buyer adds local VAT. `est.` = market estimate.
     priceSrc        : where priceEur came from (store + country), for auditability
     eurPerKwh       : VALUE metric = round(priceEur / kwhUsable), EUR per usable kWh (the battery DB sort
                       key - lower = better value). DERIVED/baked - recompute if priceEur or kwhUsable changes.

   ── Data provenance ───────────────────────────────────────────────────────────────────────
   Specs VERIFIED against each manufacturer's datasheet (read June 2026; source URL per row).
   Power/voltage/usable-energy/DoD are datasheet figures for the LISTED kwhUsable configuration
   (modular stacks scale with module count - moduleKwh/modulesMin..Max give the full range).
   effRt marked "~0.95/0.96" is a typical-class value where the datasheet omits a round-trip
   number (Huawei/Sungrow/GoodWe/SolaX/FoxESS list no RT %); BYD (>=96%) and SolarEdge (94.5%)
   are datasheet-stated. Scope: ecosystem HV batteries pairing with our hybrid inverter brands +
   open 48 V LV racks from Deye's Approved Battery List (Dyness/V-TAC/WeCo/Pylontech + optional
   Ampleness). The open-LV rows use module-standard specs (less PDF-verified) - confirm at purchase.
   ALL rows carry an INDICATIVE priceEur (2026 EU/RO street incl VAT; BYD/Sungrow/Pylontech are
   sourced from EU price-comparison, the rest are per-kWh market estimates) - see the field note. */

const BATTERY_BRANDS = [
  { id: 'huawei',    name: 'Huawei',     highlight: 'LUNA2000 HV, pairs with SUN2000 hybrids' },
  { id: 'byd',       name: 'BYD',        highlight: 'Battery-Box HVS/HVM, multi-brand HV (Fronius/Kostal/SMA/GoodWe)' },
  { id: 'sungrow',   name: 'Sungrow',    highlight: 'SBR HV stack, pairs with SH hybrids' },
  { id: 'goodwe',    name: 'GoodWe',     highlight: 'Lynx Home F HV, pairs with ET/EH hybrids' },
  { id: 'solaredge', name: 'SolarEdge',  highlight: 'Home Battery, pairs with Energy Hub' },
  { id: 'solax',     name: 'SolaX Power', highlight: 'Triple Power T-BAT HV, pairs with X1/X3 Hybrid' },
  { id: 'foxess',    name: 'FoxESS',     highlight: 'ECS HV stack, pairs with H-series hybrids' },
  { id: 'deye',      name: 'Deye',       highlight: 'SE-G5.1 LV rack + BOS-G HV stack, pair with SUN SG04/SG01HP3 hybrids (popular RO)' },
  { id: 'dyness',    name: 'Dyness',     highlight: 'Open 48 V LV (A48100/B4850), Deye-approved + many hybrids' },
  { id: 'vtac',      name: 'V-TAC',      highlight: 'Budget 48 V LV rack, popular RO retail, Deye-approved' },
  { id: 'weco',      name: 'WeCo',       highlight: 'Dual-voltage 5K3 (LV/HV), 98% DoD, Deye-approved' },
  { id: 'ampleness', name: 'Ampleness',  highlight: 'Amensolar 48 V LV (CATL cells); vendor-claimed Deye-compatible, NOT on approved list' },
  { id: 'pylontech', name: 'Pylontech',  highlight: 'Open 48 V LV (Victron + many hybrids via CAN)' },
];

const BATTERY_LIST = [
  /* ─── HUAWEI LUNA2000-S0 (modular 5 kWh, 100% DoD, pairs with SUN2000 L1/M1 hybrids) ─── */
  {
    id: 'huawei-luna2000-5-s0', brandId: 'huawei',
    name: 'Huawei LUNA2000-5-S0 (5 kWh)',
    note: 'LiFePO4 HV, 1×5 kWh module (stack 5-15 kWh), 100% DoD, 2.5 kW (peak 3.5 kW/10s), 350-560 V. Pairs with Huawei SUN2000 hybrids. Source: Huawei LUNA2000-5/10/15-S0 datasheet.',
    datasheet: 'https://solar.huawei.com/en/products/luna2000-5-10-15-s0/specs/',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 5, kwhUsable: 5, moduleKwh: 5, modulesMin: 1, modulesMax: 3,
    pChargeKw: 2.5, pDischargeKw: 2.5, pPeakKw: 3.5, effRt: 0.95, socMin: 0, dod: 1.0,
    cycles: null, warrantyYears: 10, priceEur: 2450, priceSrc: 'ab-solarenergie.de (DE)', eurPerKwh: 490,
    vnom: 450, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['huawei'], compatInverters: [], protocol: null,
  },
  {
    id: 'huawei-luna2000-10-s0', brandId: 'huawei',
    name: 'Huawei LUNA2000-10-S0 (10 kWh)',
    note: 'LiFePO4 HV, 2×5 kWh modules, 100% DoD, 5 kW (peak 7 kW/10s), 350-560 V. Pairs with Huawei SUN2000 hybrids. Source: Huawei LUNA2000-5/10/15-S0 datasheet.',
    datasheet: 'https://solar.huawei.com/en/products/luna2000-5-10-15-s0/specs/',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 10, kwhUsable: 10, moduleKwh: 5, modulesMin: 2, modulesMax: 3,
    pChargeKw: 5, pDischargeKw: 5, pPeakKw: 7, effRt: 0.95, socMin: 0, dod: 1.0,
    cycles: null, warrantyYears: 10, priceEur: 3630, priceSrc: 'Geizhals DE (photovoltaik-shop)', eurPerKwh: 363,
    vnom: 450, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['huawei'], compatInverters: [], protocol: null,
  },
  {
    id: 'huawei-luna2000-15-s0', brandId: 'huawei',
    name: 'Huawei LUNA2000-15-S0 (15 kWh)',
    note: 'LiFePO4 HV, 3×5 kWh modules, 100% DoD, 5 kW (peak 7 kW/10s), 350-560 V. Pairs with Huawei SUN2000 hybrids. Source: Huawei LUNA2000-5/10/15-S0 datasheet.',
    datasheet: 'https://solar.huawei.com/en/products/luna2000-5-10-15-s0/specs/',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 15, kwhUsable: 15, moduleKwh: 5, modulesMin: 3, modulesMax: 3,
    pChargeKw: 5, pDischargeKw: 5, pPeakKw: 7, effRt: 0.95, socMin: 0, dod: 1.0,
    cycles: null, warrantyYears: 10, priceEur: 5885, priceSrc: 'idealo.at', eurPerKwh: 392,
    vnom: 450, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['huawei'], compatInverters: [], protocol: null,
  },

  /* ─── BYD Battery-Box Premium HVS (modular 2.56 kWh, 96% eff, multi-brand HV) ─── */
  {
    id: 'byd-battery-box-premium-hvs-10-2', brandId: 'byd',
    name: 'BYD Battery-Box Premium HVS 10.2 (10.24 kWh)',
    note: 'LiFePO4 HV, 4×2.56 kWh modules (HVS range 5.1-12.8 kWh), >=96% RT eff, 100% DoD. 25 A continuous (~10.2 kW @ 409.6 V) / 50 A 3 s peak; battery-side, inverter-limited in practice. Multi-brand HV. Source: BYD Battery-Box Premium HVS/HVM datasheet V1.7.',
    datasheet: 'https://www.bydbatterybox.com/uploads/downloads/230530_BYD_Battery-Box_Premium_HVS&HVM_Datasheet_V1.7_EN-647eedf90f9c3.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 10.24, kwhUsable: 10.24, moduleKwh: 2.56, modulesMin: 2, modulesMax: 5,
    pChargeKw: 10.24, pDischargeKw: 10.24, pPeakKw: 20.5, effRt: 0.96, socMin: 0, dod: 1.0,
    cycles: null, warrantyYears: 10, priceEur: 3800, priceSrc: 'Geizhals AT', eurPerKwh: 371,
    vnom: 409.6, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['fronius', 'kostal', 'sma', 'goodwe'], compatInverters: [], protocol: null,
  },

  /* ─── SUNGROW SBR (modular 3.2 kWh, 100% DoD, pairs with SH hybrids) ─── */
  {
    id: 'sungrow-sbr096', brandId: 'sungrow',
    name: 'Sungrow SBR096 (9.6 kWh)',
    note: 'LiFePO4 HV, 3×3.2 kWh modules (SBR range 2-8 modules, 6.4-25.6 kWh), 100% DoD, 30 A continuous (~5.76 kW @ 192 V). Pairs with Sungrow SH hybrids. Source: Sungrow SBR064-256 datasheet V5.',
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2024/09/13/DS_20240907_SBR064_096_128_160_192_224_256_Datasheet_V5_EN.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 9.6, kwhUsable: 9.6, moduleKwh: 3.2, modulesMin: 2, modulesMax: 8,
    pChargeKw: 5.76, pDischargeKw: 5.76, pPeakKw: null, effRt: 0.96, socMin: 0, dod: 1.0,
    cycles: null, warrantyYears: 10, priceEur: 2790, priceSrc: 'solarscouts.de (DE)', eurPerKwh: 291,
    vnom: 192, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['sungrow'], compatInverters: [], protocol: null,
  },

  /* ─── GOODWE Lynx Home F G2 (modular 3.2 kWh, pairs with ET/EH hybrids) ─── */
  {
    id: 'goodwe-lynx-home-f-g2-9-6', brandId: 'goodwe',
    name: 'GoodWe Lynx Home F G2 (9.6 kWh)',
    note: 'LiFePO4 HV, 3×3.2 kWh modules (Lynx F G2 range 2-9 modules, 6.4-28.8 kWh, up to 576 V), 100% DoD, 35 A nominal (6.72 kW @ 192 V). Pairs with GoodWe BH/EH/BT/ET hybrids. Source: GoodWe Lynx F G2 datasheet.',
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_Lynx-F-G2_Datasheet-EN.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 9.6, kwhUsable: 9.6, moduleKwh: 3.2, modulesMin: 2, modulesMax: 9,
    pChargeKw: 6.72, pDischargeKw: 6.72, pPeakKw: null, effRt: 0.96, socMin: 0, dod: 1.0,
    cycles: null, warrantyYears: 10, priceEur: 2900, priceSrc: 'est. EU retail', eurPerKwh: 302,
    vnom: 192, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['goodwe'], compatInverters: [], protocol: null,
  },
  /* ─── GOODWE ESA battery modules (Lynx D G2 tech, pair with the ESA/ETA-G20 hybrids) ─── */
  {
    id: 'goodwe-gw5-1-bat-d-g20', brandId: 'goodwe',
    name: 'GoodWe BAT 5.1 (5.12 kWh)',
    note: 'LiFePO4 HV module (Lynx D G2 tech) for the ESA/ETA-G20 system. 5.12 kWh rated / 5.0 usable, 100% DoD, 5 kW charge/discharge (7.5 kW peak 10s), 3ph-system voltage 700-950 V (nom 750 V). Stack up to 12 (max 6 per single-column), >=8000 cycles, 57.5 kg, IP66. Pairs with GoodWe ESA/ETA-G20 hybrids. Source: GoodWe ESA 5-30kW datasheet (pdfplumber-verified).',
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ESA-5-30kW_Datasheet-EN.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 5.12, kwhUsable: 5.0, moduleKwh: 5.12, modulesMin: 1, modulesMax: 12,
    pChargeKw: 5.0, pDischargeKw: 5.0, pPeakKw: 7.5, effRt: 0.96, socMin: 0, dod: 1.0,
    cycles: 8000, warrantyYears: 10, priceEur: 1317, priceSrc: 'photovoltaik-shop.de (DE, 0% VAT)', eurPerKwh: 263,
    vnom: 750, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['goodwe'], compatInverters: [], protocol: null,
  },
  {
    id: 'goodwe-gw8-3-bat-d-g20', brandId: 'goodwe',
    name: 'GoodWe BAT 8.3 (8.32 kWh)',
    note: 'LiFePO4 HV module (Lynx D G2 tech) for the ESA/ETA-G20 system. 8.32 kWh rated / 8.0 usable, 100% DoD, 8 kW charge/discharge (12 kW peak 10s), 3ph-system voltage 700-950 V (nom 750 V). Stack up to 12 (max 6 per single-column), >=8000 cycles, 79 kg, IP66. Pairs with GoodWe ESA/ETA-G20 hybrids. Source: GoodWe ESA 5-30kW datasheet (pdfplumber-verified).',
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ESA-5-30kW_Datasheet-EN.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 8.32, kwhUsable: 8.0, moduleKwh: 8.32, modulesMin: 1, modulesMax: 12,
    pChargeKw: 8.0, pDischargeKw: 8.0, pPeakKw: 12, effRt: 0.96, socMin: 0, dod: 1.0,
    cycles: 8000, warrantyYears: 10, priceEur: 1634, priceSrc: 'photovoltaik-shop.de (DE, 0% VAT)', eurPerKwh: 204,
    vnom: 750, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['goodwe'], compatInverters: [], protocol: null,
  },

  /* ─── SOLAREDGE Home Battery 400V (BAT-10K1P, 9.7 kWh unit, pairs with Energy Hub) ─── */
  {
    id: 'solaredge-home-battery-400v', brandId: 'solaredge',
    name: 'SolarEdge Home Battery 400V (9.7 kWh)',
    note: 'LiFePO4 HV unit, 9.7 kWh, 5 kW continuous / 7.5 kW peak, 94.5% round-trip. Up to 3 units (~29.1 kWh). Pairs with SolarEdge Home Hub / Energy Hub. Source: SolarEdge Home Battery 400V BAT-10K1P datasheet.',
    datasheet: 'https://knowledge-center.solaredge.com/sites/kc/files/se-solaredge-home-battery-400v-datasheet-eng.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 10, kwhUsable: 9.7, moduleKwh: 9.7, modulesMin: 1, modulesMax: 3,
    pChargeKw: 5, pDischargeKw: 5, pPeakKw: 7.5, effRt: 0.945, socMin: 0, dod: 1.0,
    cycles: null, warrantyYears: 10, priceEur: 4225, priceSrc: 'Geizhals EU', eurPerKwh: 436,
    vnom: 400, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['solaredge'], compatInverters: [], protocol: null,
  },

  /* ─── SOLAX Triple Power T-BAT H 5.8 (modular 5.8 kWh, 95% eff, pairs with X1/X3 Hybrid G4) ─── */
  {
    id: 'solax-t-bat-h-5-8', brandId: 'solax',
    name: 'SolaX Triple Power T-BAT H 5.8 (5.8 kWh)',
    note: 'LiFePO4 HV, 1×5.8 kWh module (T-BAT H V3 range 5.8-34.6 kWh nominal, 1-6 modules), 95% DoD -> 5.5 kWh usable, rated 2.9 kW / max 4 kW, 115.2 V, >6000 cycles. Pairs with SolaX X1/X3 Hybrid G4. Source: SolaX T-BAT H 5.8 (T58) V3 datasheet V1.2.',
    datasheet: 'https://www.solaxpower.com/uploads/file/solax-t-bat-sys-hv-5.8-t58-datasheet-en.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 5.8, kwhUsable: 5.5, moduleKwh: 5.8, modulesMin: 1, modulesMax: 6,
    pChargeKw: 2.9, pDischargeKw: 2.9, pPeakKw: 4, effRt: 0.95, socMin: 5, dod: 0.95,
    cycles: 6000, warrantyYears: 10, priceEur: 2200, priceSrc: 'besa.energy (DE)', eurPerKwh: 400,
    vnom: 115.2, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['solax'], compatInverters: [], protocol: null,
  },

  /* ─── FOXESS ECS HV (ECM4100, modular 4.03 kWh, 90% DoD, pairs with H-series hybrids) ─── */
  {
    id: 'foxess-ecs-hv-8-06', brandId: 'foxess',
    name: 'FoxESS ECS HV ECM4100 (8.06 kWh)',
    note: 'LiFePO4 HV, 2×4.03 kWh modules (1 master + slaves, stack to ~28.2 kWh / 7 modules), 90% DoD, 5.76 kW continuous / 7.49 kW surge (15 s), 115 V. Pairs with FoxESS H-series hybrids. Source: FoxESS ECS4100 datasheet V3.6 + retailer spec.',
    datasheet: 'https://www.fox-ess.com/download/upfiles/EN-ECS4100-Datasheet-V3.6-20241111.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 8.06, kwhUsable: 7.25, moduleKwh: 4.03, modulesMin: 2, modulesMax: 7,
    pChargeKw: 5.76, pDischargeKw: 5.76, pPeakKw: 7.49, effRt: 0.95, socMin: 10, dod: 0.90,
    cycles: null, warrantyYears: 10, priceEur: 2770, priceSrc: 'online-batterien.de (DE)', eurPerKwh: 382,
    vnom: 115, vchrg: null, vdisch: null, ahnom: null,
    compatBrands: ['foxess'], compatInverters: [], protocol: null,
  },

  /* ─── DEYE (SE-G5.1 LV rack + BOS-G HV stack - pair with Deye SUN hybrids, popular RO) ─── */
  {
    id: 'deye-se-g5-1-pro-b', brandId: 'deye',
    name: 'Deye SE-G5.1 Pro-B (5.12 kWh)',
    note: 'LiFePO4 48 V LV rack module, 100 Ah, 5.12 kWh (4.6 usable, 90% DoD). 100 A max (~5.12 kW) / 150 A 2-min peak; recommend 50 A. Stack to 32 (64 with external setup), 19in rack/wall/floor. Pairs with Deye SUN-SG04LP1/SG04LP3 LV hybrids. Source: Deye SE-G5.1 Pro-B datasheet V2.1.',
    datasheet: 'https://mvmoptimum.hu/wp-content/uploads/2026/01/Deye-se-g5.1-pro-b-datasheet.pdf',
    chemistry: 'LiFePO4', architecture: 'lv', coupling: 'dc',
    kwhNominal: 5.12, kwhUsable: 4.6, moduleKwh: 5.12, modulesMin: 1, modulesMax: 32,
    pChargeKw: 5.12, pDischargeKw: 5.12, pPeakKw: 7.68, effRt: 0.95, socMin: 10, dod: 0.90,
    cycles: 6000, warrantyYears: 10, priceEur: 980, priceSrc: 'solartech.eu (RO/EU)', eurPerKwh: 213,
    vnom: 51.2, vchrg: 57.6, vdisch: 43.2, ahnom: 100,
    compatBrands: ['deye'], compatInverters: [], protocol: 'deye-can',
  },
  {
    id: 'deye-bos-g30', brandId: 'deye',
    name: 'Deye BOS-G30 HV (6x5.12 kWh, 30.72 kWh)',
    note: 'LiFePO4 HV stack of 5.12 kWh / 51.2 V modules (BOS-GM5.1), 3-12 in series = 15.36-61.44 kWh (BOS-G15..G60); listed = 6 modules (30.72 kWh, 27.64 usable, 307.2 V). 100 A nominal (~30.7 kW battery-side, inverter-limited) / 125 A 2-min peak. HV control box 120-750 V. Pairs with Deye SUN-SG01HP3 HV hybrids. Source: Deye BOS-G datasheet V1.31.',
    datasheet: 'https://au.deyeinverter.com/deyeinverter/2024/04/03/datasheet-a-hv-3u-battery-bos-g-v1.31.pdf',
    chemistry: 'LiFePO4', architecture: 'hv', coupling: 'dc',
    kwhNominal: 30.72, kwhUsable: 27.64, moduleKwh: 5.12, modulesMin: 3, modulesMax: 12,
    pChargeKw: 30.72, pDischargeKw: 30.72, pPeakKw: 38.4, effRt: 0.95, socMin: 10, dod: 0.90,
    cycles: 6000, warrantyYears: 10, priceEur: 6100, priceSrc: 'est. (module x6 + HV box)', eurPerKwh: 221,
    vnom: 307.2, vchrg: 350.4, vdisch: 249.6, ahnom: 100,
    compatBrands: ['deye'], compatInverters: [], protocol: 'deye-can',
  },

  /* ─── APPROVED THIRD-PARTY LV 48 V (open-ecosystem racks on Deye's Approved Battery List
     DY-LV48-0109; also work with Solis/Growatt/Victron etc.). Specs are the module standard
     ratings from the manufacturer listing/datasheet (per-row URL) - less rigorously PDF-verified
     than the ecosystem-HV first pass; confirm power/DoD at purchase. Prices indicative (see header). ─── */
  {
    id: 'dyness-a48100', brandId: 'dyness',
    name: 'Dyness A48100 (4.8 kWh)',
    note: '48 V LV LFP rack, 100 Ah, 4.8 kWh (4.32 usable @ 90% DoD), ~50 A continuous, 6000 cycles, floor/wall stack. Open 48 V CAN; on Deye approved list (A48100). Source: Dyness A48100 datasheet.',
    datasheet: 'https://www.dyness.com/Public/Uploads/uploadfile/files/20241022/DynessA48100datasheetEN.pdf',
    chemistry: 'LiFePO4', architecture: 'lv', coupling: 'dc',
    kwhNominal: 4.8, kwhUsable: 4.32, moduleKwh: 4.8, modulesMin: 1, modulesMax: 16,
    pChargeKw: 2.56, pDischargeKw: 2.56, pPeakKw: 5.12, effRt: 0.95, socMin: 10, dod: 0.90,
    cycles: 6000, warrantyYears: 10, priceEur: 1360, priceSrc: 'Geizhals DE', eurPerKwh: 315,
    vnom: 51.2, vchrg: 57.6, vdisch: 43.2, ahnom: 100,
    compatBrands: ['deye', 'solis', 'growatt', 'victron-energy'], compatInverters: [], protocol: 'open-can',
  },
  {
    id: 'vtac-vt-48100e', brandId: 'vtac',
    name: 'V-TAC VT-48100E (5.12 kWh)',
    note: '48 V LV LFP rack, 100 Ah, 5.12 kWh (~4.6 usable @ 90% DoD), 6000 cycles, IP20. Budget, very common RO retail; on Deye approved list (V-TAC VT series). Price 3470 lei ex-VAT -> ~830 EUR incl VAT (FX 4.97).',
    datasheet: 'https://v-tac.ro/sisteme-solare/solu%C8%9Bii-de-stocare-baterii.html',
    chemistry: 'LiFePO4', architecture: 'lv', coupling: 'dc',
    kwhNominal: 5.12, kwhUsable: 4.6, moduleKwh: 5.12, modulesMin: 1, modulesMax: 16,
    pChargeKw: 5.12, pDischargeKw: 5.12, pPeakKw: null, effRt: 0.95, socMin: 10, dod: 0.90,
    cycles: 6000, warrantyYears: 10, priceEur: 830, priceSrc: 'gtaenergy.ro (RO), 3470 lei ex-VAT', eurPerKwh: 180,
    vnom: 51.2, vchrg: 57.6, vdisch: 43.2, ahnom: 100,
    compatBrands: ['deye', 'solis', 'growatt', 'victron-energy'], compatInverters: [], protocol: 'open-can',
  },
  {
    id: 'pylontech-us5000', brandId: 'pylontech',
    name: 'Pylontech US5000 (4.8 kWh)',
    note: '48 V LV LFP, 100 Ah, 4.8 kWh (4.56 usable @ 95% DoD), ~80 A nominal / 100 A max, native CAN, up to 16 parallel. Open ecosystem; on Deye approved list. Newer/higher-power sibling of the US3000C.',
    datasheet: null,
    chemistry: 'LiFePO4', architecture: 'lv', coupling: 'dc',
    kwhNominal: 4.8, kwhUsable: 4.56, moduleKwh: 4.8, modulesMin: 1, modulesMax: 16,
    pChargeKw: 4.1, pDischargeKw: 4.1, pPeakKw: 5.12, effRt: 0.95, socMin: 5, dod: 0.95,
    cycles: 6000, warrantyYears: 10, priceEur: 700, priceSrc: 'Geizhals EU', eurPerKwh: 154,
    vnom: 48, vchrg: 53.5, vdisch: 44.5, ahnom: 100,
    compatBrands: ['victron-energy', 'deye', 'solis', 'growatt'], compatInverters: [], protocol: 'pylontech-can',
  },
  {
    id: 'weco-5k3-xp', brandId: 'weco',
    name: 'WeCo 5K3-XP (5.3 kWh)',
    note: 'Dual-voltage LFP module, 5.37 kWh (~5.2 usable @ 98% DoD), 7000 cycles, ~1C charge/discharge, Wi-Fi/BT. Usable LV (Deye SG04) or HV (with HV BOX). On Deye approved list (Weco 5K3 LV). Source: WeCo 5K3-XP brochure.',
    datasheet: 'https://wecobatteries.com/wp-content/uploads/2024/06/05-Brochure_5K3-XP.pdf',
    chemistry: 'LiFePO4', architecture: 'lv', coupling: 'dc',
    kwhNominal: 5.37, kwhUsable: 5.2, moduleKwh: 5.37, modulesMin: 1, modulesMax: 15,
    pChargeKw: 5.3, pDischargeKw: 5.3, pPeakKw: null, effRt: 0.95, socMin: 2, dod: 0.98,
    cycles: 7000, warrantyYears: 10, priceEur: 1300, priceSrc: 'GWL.eu / reichelt.de (est)', eurPerKwh: 250,
    vnom: 51.2, vchrg: 58.4, vdisch: 46.5, ahnom: 105,
    compatBrands: ['deye', 'solis', 'growatt', 'victron-energy'], compatInverters: [], protocol: 'open-can',
  },
  {
    id: 'ampleness-s5285', brandId: 'ampleness',
    name: 'Ampleness S5285 (4.35 kWh)',
    note: 'OPTIONAL / budget. 48 V LV LFP (CATL cells), 85 Ah, 4.35 kWh (~3.9 usable @ 90% DoD), >3000 cycles, CAN/RS485. Vendor claims Deye/Solis/Growatt/Victron compat but NOT on Deye official approved list - verify before use. Price ~660 USD ex-works (/1.08 ~= 610 EUR); ~700 EUR retail. Source: Amensolar S5285 datasheet.',
    datasheet: 'https://cdn.enfsolar.com/z/pp/2024/7/jmuv7w502oz55v4f4/datasheet-ampleness-s5285-202401221.pdf',
    chemistry: 'LiFePO4', architecture: 'lv', coupling: 'dc',
    kwhNominal: 4.35, kwhUsable: 3.9, moduleKwh: 4.35, modulesMin: 1, modulesMax: 16,
    pChargeKw: 4.35, pDischargeKw: 4.35, pPeakKw: null, effRt: 0.95, socMin: 10, dod: 0.90,
    cycles: 3000, warrantyYears: 10, priceEur: 765, priceSrc: 'ecosolaris.ro (RO), ~3800 lei', eurPerKwh: 196,
    vnom: 51.2, vchrg: 58.4, vdisch: 44.8, ahnom: 85,
    compatBrands: ['deye', 'solis', 'growatt', 'victron-energy'], compatInverters: [], protocol: 'open-can',
  },

  /* ─── PYLONTECH US3000C (legacy LV 48 V, open CAN - migrated from string-ui.js) ─── */
  {
    id: 'pylontech-us3000c', brandId: 'pylontech',
    name: 'Pylontech US3000C (3.5 kWh)',
    note: 'LiFePO4 48 V LV, 74 Ah, 3.55 kWh, native CAN. Open ecosystem (Victron + many 48 V hybrids). 442×410×132 mm, 37 kg. Source: Pylontech US3000C datasheet.',
    datasheet: null,
    chemistry: 'LiFePO4', architecture: 'lv', coupling: 'dc',
    kwhNominal: 3.55, kwhUsable: 3.2, moduleKwh: 3.55, modulesMin: 1, modulesMax: 16,
    pChargeKw: 1.78, pDischargeKw: 1.78, pPeakKw: 3.55, effRt: 0.95, socMin: 10, dod: 0.90,
    cycles: 6000, warrantyYears: 10, priceEur: 540, priceSrc: 'Geizhals DE', eurPerKwh: 169,
    vnom: 51.2, vchrg: 53.2, vdisch: 47.0, ahnom: 74,
    compatBrands: ['victron-energy', 'deye', 'solis', 'growatt'], compatInverters: [], protocol: 'pylontech-can',
  },
];
