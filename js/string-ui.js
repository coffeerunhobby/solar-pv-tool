/* ── Inverter brand registry ─────────────────────────────────────────────────
   Top-15 inverter manufacturers - cross-referenced: PV*SOL DB × EU market × RO stores.
   id       : kebab-case key referenced by INVERTER_LIST[].brandId
   name     : display name
   highlight: one-liner shown when this brand is selected in the UI */

const INVERTER_BRANDS = [
  { id: 'huawei',         name: 'Huawei',              highlight: 'RO dominant, SUN2000 string MPPT' },
  { id: 'fronius',        name: 'Fronius',              highlight: 'Austrian premium, Gen24 hybrid' },
  { id: 'sma',            name: 'SMA Solar Technology', highlight: 'German reference, best EU service network' },
  { id: 'goodwe',         name: 'GoodWe',               highlight: 'Best-value hybrid in RO/CEE' },
  { id: 'solis',          name: 'Ginlong (Solis)',       highlight: 'Best price/quality ratio RO residential' },
  { id: 'sungrow',        name: 'Sungrow',              highlight: 'Tier-1 global, growing in RO commercial' },
  { id: 'solaredge',      name: 'SolarEdge',            highlight: 'SE + P-optimizers, best shade performance' },
  { id: 'growatt',        name: 'Growatt',              highlight: 'Budget residential SPH hybrid' },
  { id: 'solax',          name: 'SolaX Power',          highlight: 'X3-Hybrid G4, strong dealer net' },
  { id: 'deye',           name: 'Deye',                 highlight: 'Very popular RO hybrid 2023–25' },
  { id: 'kostal',         name: 'Kostal',               highlight: 'Premium German PLENTICORE' },
  { id: 'victron-energy', name: 'Victron Energy',       highlight: 'Dutch off-grid/hybrid king - not in PV*SOL DB' },
  { id: 'foxess',         name: 'FoxESS',               highlight: 'Growing RO, T/H hybrid series' },
  { id: 'hoymiles',       name: 'Hoymiles',             highlight: 'EU micro-inverters, balcony PV' },
  { id: 'enphase',        name: 'Enphase Energy',       highlight: 'IQ8 micro-inverters, FR/DE dominant' },
];

/* ── Inverter template registry ─────────────────────────────────────────────
   224 models across 15 EU brands. Fields:
     id       : unique kebab-case string (used as <option value>)
     brandId  : matches an INVERTER_BRANDS[].id
     name     : display name shown in the dropdown
     note     : one-line description shown below the dropdown after selection
     type     : 'micro' only for micro-inverters (Enphase, Hoymiles)
                 guard in loadInverterTemplate/calcString: §11 doesn't apply
     vinvmax  : absolute max DC input voltage (V) - string V_OC must stay below this
     vrmppt   : nominal / rated MPPT operating voltage (V) - used for N_opt
     vmpptmin : MPPT window lower bound at RATED power (V) - full-power floor,
                NOT the absolute cold-start minimum (see vmpptmin convention below)
     vmpptmax : MPPT window upper bound (V)
     impptmax : max continuous MPPT operating current per tracker (A)
     iscmppt  : max short-circuit / fault current the MPPT input can tolerate (A)
                null when the manufacturer does not publish this value
     datasheet: official manufacturer datasheet URL ('' if none)
     pac      : rated AC output power (W) - used for the 0.8–1.2·P_FV sizing check
     nmppt    : number of independent MPP trackers (one per independent string orientation).
                ALL 224 populated: 143 auto-scraped (agreement-gated) by
                scripts/{collect,extract,apply}-inverter-mppt.* + 81 hand-resolved from the
                datasheets in scripts/inverter-mppt-manual.json (per-id provenance in .src).
                The gating value for the components.html "not enough inputs" check + schema.html
                multi-inverter logic. Micro-inverters (type:'micro') = MPPT inputs per unit.
     ndc      : total DC string inputs (Σ strings over all MPPTs), when the datasheet stated it
                cleanly (71/224); optional/absent otherwise. nmppt is the gating value.
     priceEur/priceSrc/eurPerKw : INDICATIVE cheapest-reputable retail price in EUR + its source
                (store+country) + value metric = round(priceEur / (pac/1000)). Same scheme as
                battery-list.js. So far ONLY the 11 Deye rows are priced (2026 EU/RO; Geizhals /
                solarscouts / RO retail; 'est.' where no firm reputable listing). Volatile - verify
                at purchase; many DE lows are 0% solar VAT. eurPerKw is derived - recompute if changed.

   vmpptmin convention: must be the FULL-POWER MPPT floor (lower bound at rated
   output), not the absolute cold-start minimum. Using the absolute min collapses
   ns_min to 1-2 and produces strings that silently clip on hot summer days.
   For inverters where the datasheet only gives the absolute min, the full-power
   floor is estimated via vmpptmin ≈ ⌈P_rated / I_mppt,max⌉ (per-model).

   To add an inverter: copy an existing entry from the matching brand section. */

const INVERTER_LIST = [
  /* ─── HUAWEI ───────────────────────────────────────────────── */
  {
    id:       'huawei-sun2000-3ktl-l1',
    brandId:   'huawei',
    name:     'Huawei SUN2000-3KTL-L1 (3 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid; LUNA2000 battery ready; SetApp via FusionSolar; IP65; arc fault protection',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 90,
    vmpptmax: 560,
    impptmax: 12.5,
    iscmppt:  18,
    datasheet: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolar%2Fattachment%2Fpdf%2Feu%2Fdatasheet%2FSUN2000-2_3_3_68_4_4_6_5_6KTL-L1.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 435, priceSrc: 'Geizhals EU', eurPerKw: 145,
  },
  {
    id:       'huawei-sun2000-4ktl-l1',
    brandId:   'huawei',
    name:     'Huawei SUN2000-4KTL-L1 (4 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid; LUNA2000 battery ready; SetApp via FusionSolar; IP65; arc fault protection',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 90,
    vmpptmax: 560,
    impptmax: 12.5,
    iscmppt:  18,
    datasheet: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolar%2Fattachment%2Fpdf%2Feu%2Fdatasheet%2FSUN2000-2_3_3_68_4_4_6_5_6KTL-L1.pdf',
    pac: 4000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 589, priceSrc: 'Geizhals DE', eurPerKw: 147,
  },
  {
    id:       'huawei-sun2000-5ktl-l1',
    brandId:   'huawei',
    name:     'Huawei SUN2000-5KTL-L1 (5 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid; LUNA2000 battery ready; SetApp via FusionSolar; IP65; arc fault protection; EU bestseller',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 90,
    vmpptmax: 560,
    impptmax: 12.5,
    iscmppt:  18,
    datasheet: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolar%2Fattachment%2Fpdf%2Feu%2Fdatasheet%2FSUN2000-2_3_3_68_4_4_6_5_6KTL-L1.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 649, priceSrc: 'Geizhals DE', eurPerKw: 130,
  },
  {
    id:       'huawei-sun2000-6ktl-l1',
    brandId:   'huawei',
    name:     'Huawei SUN2000-6KTL-L1 (6 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid; LUNA2000 battery ready; SetApp via FusionSolar; IP65; arc fault protection; EU bestseller',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 90,
    vmpptmax: 560,
    impptmax: 12.5,
    iscmppt:  18,
    datasheet: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolar%2Fattachment%2Fpdf%2Feu%2Fdatasheet%2FSUN2000-2_3_3_68_4_4_6_5_6KTL-L1.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 745, priceSrc: 'Geizhals DE', eurPerKw: 124,
  },
  {
    id:       'huawei-sun2000-5ktl-m1',
    brandId:   'huawei',
    name:     'Huawei SUN2000-5KTL-M1 (5 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid; Huawei Smart String ESS compatible; IP65; integrated PID recovery; arc fault protection',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 980,
    impptmax: 11,
    iscmppt:  15,
    datasheet: 'https://solar.huawei.com/en-GB/download?p=%2F-%2Fmedia%2FSolar%2Fattachment%2Fpdf%2Feu%2Fdatasheet%2FSUN2000-3-10KTL-M1.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 549, priceSrc: 'Geizhals EU', eurPerKw: 110,
  },
  {
    id:       'huawei-sun2000-6ktl-m1',
    brandId:   'huawei',
    name:     'Huawei SUN2000-6KTL-M1 (6 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid; Huawei Smart String ESS compatible; IP65; integrated PID recovery; arc fault protection; popular EU small-commercial',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 980,
    impptmax: 11,
    iscmppt:  15,
    datasheet: 'https://solar.huawei.com/en-GB/download?p=%2F-%2Fmedia%2FSolar%2Fattachment%2Fpdf%2Feu%2Fdatasheet%2FSUN2000-3-10KTL-M1.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 600, priceSrc: 'Geizhals DE (~)', eurPerKw: 100,
  },
  {
    id:       'huawei-sun2000-8ktl-m1',
    brandId:   'huawei',
    name:     'Huawei SUN2000-8KTL-M1 (8 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid; Huawei Smart String ESS compatible; IP65; integrated PID recovery; arc fault protection',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 980,
    impptmax: 11,
    iscmppt:  15,
    datasheet: 'https://solar.huawei.com/en-GB/download?p=%2F-%2Fmedia%2FSolar%2Fattachment%2Fpdf%2Feu%2Fdatasheet%2FSUN2000-3-10KTL-M1.pdf',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 845, priceSrc: 'Geizhals DE', eurPerKw: 106,
  },
  {
    id:       'huawei-sun2000-10ktl-m1',
    brandId:   'huawei',
    name:     'Huawei SUN2000-10KTL-M1 (10 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid; Huawei Smart String ESS compatible; IP65; integrated PID recovery; arc fault protection',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 980,
    impptmax: 11,
    iscmppt:  15,
    datasheet: 'https://solar.huawei.com/en-GB/download?p=%2F-%2Fmedia%2FSolar%2Fattachment%2Fpdf%2Feu%2Fdatasheet%2FSUN2000-3-10KTL-M1.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'Geizhals DE', eurPerKw: 90,
  },
  {
    id:       'huawei-sun2000-12ktl-m2',
    brandId:   'huawei',
    name:     'Huawei SUN2000-12KTL-M2 (12 kW)',
    note:     'Three-phase; 2 inputs per MPPT; optimizer compatible (SUN2000-450W-P); IP65; integrated PID recovery; InterSolar 2019 award winner',
    vinvmax:  1080,
    vrmppt:   600,
    vmpptmin: 160,
    vmpptmax: 950,
    impptmax: 22,
    iscmppt:  30,
    datasheet: 'https://solar.huawei.com/en-GB/download?p=/-/media/Solar/attachment/pdf/eu/datasheet/SUN2000-12-20KTL-M2.pdf',
    pac: 12000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 790, priceSrc: 'Geizhals EU', eurPerKw: 66,
  },
  {
    id:       'huawei-sun2000-15ktl-m2',
    brandId:   'huawei',
    name:     'Huawei SUN2000-15KTL-M2 (15 kW)',
    note:     'Three-phase; 2 inputs per MPPT; optimizer compatible (SUN2000-450W-P); IP65; integrated PID recovery',
    vinvmax:  1080,
    vrmppt:   600,
    vmpptmin: 160,
    vmpptmax: 950,
    impptmax: 22,
    iscmppt:  30,
    datasheet: 'https://solar.huawei.com/en-GB/download?p=/-/media/Solar/attachment/pdf/eu/datasheet/SUN2000-12-20KTL-M2.pdf',
    pac: 15000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1030, priceSrc: 'Geizhals DE', eurPerKw: 69,
  },
  {
    id:       'huawei-sun2000-17ktl-m2',
    brandId:   'huawei',
    name:     'Huawei SUN2000-17KTL-M2 (17 kW)',
    note:     'Three-phase; 2 inputs per MPPT; optimizer compatible (SUN2000-450W-P); IP65; integrated PID recovery',
    vinvmax:  1080,
    vrmppt:   600,
    vmpptmin: 160,
    vmpptmax: 950,
    impptmax: 22,
    iscmppt:  30,
    datasheet: 'https://solar.huawei.com/en-GB/download?p=/-/media/Solar/attachment/pdf/eu/datasheet/SUN2000-12-20KTL-M2.pdf',
    pac: 17000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 971, priceSrc: 'Geizhals DE', eurPerKw: 57,
  },
  {
    id:       'huawei-sun2000-20ktl-m2',
    brandId:   'huawei',
    name:     'Huawei SUN2000-20KTL-M2 (20 kW)',
    note:     'Three-phase; 2 inputs per MPPT; optimizer compatible (SUN2000-450W-P); IP65; integrated PID recovery',
    vinvmax:  1080,
    vrmppt:   600,
    vmpptmin: 160,
    vmpptmax: 950,
    impptmax: 22,
    iscmppt:  30,
    datasheet: 'https://solar.huawei.com/en-GB/download?p=/-/media/Solar/attachment/pdf/eu/datasheet/SUN2000-12-20KTL-M2.pdf',
    pac: 20000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1879, priceSrc: 'Geizhals DE', eurPerKw: 94,
  },

  /* ─── FRONIUS ───────────────────────────────────────────────── */
  {
    id:       'fronius-fronius-primo-5-0-1',
    brandId:   'fronius',
    name:     'Fronius Primo 5.0-1 (5 kW)',
    note:     'Legacy SnapINverter, 1-phase 3.0–8.2 kW range; transformerless, IP65, VDE/G98/G99 certified vmpptmin 200 V = full-power MPPT floor per Fronius Primo datasheet.',
    vinvmax:  1000,
    vrmppt:   440,
    vmpptmin: 200,
    vmpptmax: 800,
    impptmax: 12,
    iscmppt:  24,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Primo_EN.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1050, priceSrc: 'est. EU retail', eurPerKw: 210,
  },
  {
    id:       'fronius-fronius-primo-3-0-1',
    brandId:   'fronius',
    name:     'Fronius Primo 3.0-1 (3 kW)',
    note:     'Legacy SnapINverter, 1-phase; transformerless, IP65, VDE/G98/G99 certified vmpptmin 200 V = full-power MPPT floor per Fronius Primo datasheet.',
    vinvmax:  1000,
    vrmppt:   440,
    vmpptmin: 200,
    vmpptmax: 800,
    impptmax: 12,
    iscmppt:  24,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Primo_EN.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 300,
  },
  {
    id:       'fronius-fronius-primo-6-0-1',
    brandId:   'fronius',
    name:     'Fronius Primo 6.0-1 (6 kW)',
    note:     'Legacy SnapINverter, 1-phase; transformerless, IP65, VDE/G98/G99 certified vmpptmin 200 V = full-power MPPT floor per Fronius Primo datasheet.',
    vinvmax:  1000,
    vrmppt:   440,
    vmpptmin: 200,
    vmpptmax: 800,
    impptmax: 12,
    iscmppt:  24,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Primo_EN.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1150, priceSrc: 'est. EU retail', eurPerKw: 192,
  },
  {
    id:       'fronius-fronius-primo-8-2-1',
    brandId:   'fronius',
    name:     'Fronius Primo 8.2-1 (8.2 kW)',
    note:     'Legacy SnapINverter, 1-phase, largest EU Primo variant; transformerless, IP65 vmpptmin 200 V = full-power MPPT floor per Fronius Primo datasheet.',
    vinvmax:  1000,
    vrmppt:   440,
    vmpptmin: 200,
    vmpptmax: 800,
    impptmax: 18,
    iscmppt:  36,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Primo_EN.pdf',
    pac: 8200,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1400, priceSrc: 'est. EU retail', eurPerKw: 171,
  },
  {
    id:       'fronius-fronius-primo-gen24-3-0-plus',
    brandId:   'fronius',
    name:     'Fronius Primo GEN24 3.0 Plus (3 kW)',
    note:     'Single-phase hybrid (battery-ready). Hybrid 1-ph, PV Point + Full Backup, battery DC coupling (150–455V), active cooling, IP66, G98/G99; MPPT1: 22A, MPPT2: 12A',
    vinvmax:  600,
    vrmppt:   400,
    vmpptmin: 190,
    vmpptmax: 530,
    impptmax: 22,
    iscmppt:  41.25,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Primo_GEN24_GEN24Plus_3_to_6_kW_EN.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1300, priceSrc: 'est. EU retail', eurPerKw: 433,
  },
  {
    id:       'fronius-fronius-primo-gen24-5-0-plus',
    brandId:   'fronius',
    name:     'Fronius Primo GEN24 5.0 Plus (5 kW)',
    note:     'Single-phase hybrid (battery-ready). Hybrid 1-ph, PV Point + Full Backup, battery DC coupling (150–455V), active cooling, IP66, G98/G99; MPPT1: 22A, MPPT2: 12A',
    vinvmax:  600,
    vrmppt:   400,
    vmpptmin: 230,
    vmpptmax: 530,
    impptmax: 22,
    iscmppt:  41.25,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Primo_GEN24_GEN24Plus_3_to_6_kW_EN.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1500, priceSrc: 'est. EU retail', eurPerKw: 300,
  },
  {
    id:       'fronius-fronius-primo-gen24-6-0-plus',
    brandId:   'fronius',
    name:     'Fronius Primo GEN24 6.0 Plus (6 kW)',
    note:     'Single-phase hybrid (battery-ready). Hybrid 1-ph, PV Point + Full Backup, battery DC coupling (150–455V), active cooling, IP66, G98/G99; MPPT1: 22A, MPPT2: 12A',
    vinvmax:  600,
    vrmppt:   400,
    vmpptmin: 230,
    vmpptmax: 480,
    impptmax: 22,
    iscmppt:  41.25,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Primo_GEN24_GEN24Plus_3_to_6_kW_EN.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1650, priceSrc: 'est. EU retail', eurPerKw: 275,
  },
  {
    id:       'fronius-fronius-symo-5-0-3-m',
    brandId:   'fronius',
    name:     'Fronius Symo 5.0-3-M (5 kW)',
    note:     'Legacy SnapINverter 3-phase 5–8.2 kW; IP65, VDE/G98/G99/CEI 0-21 certified, 2 MPPT',
    vinvmax:  1000,
    vrmppt:   475,
    vmpptmin: 150,
    vmpptmax: 800,
    impptmax: 16,
    iscmppt:  31,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Symo_EN.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1100, priceSrc: 'est. EU retail', eurPerKw: 220,
  },
  {
    id:       'fronius-fronius-symo-8-2-3-m',
    brandId:   'fronius',
    name:     'Fronius Symo 8.2-3-M (8.2 kW)',
    note:     'Legacy SnapINverter 3-phase; IP65, VDE/G98/G99/CEI 0-21 certified, 2 MPPT',
    vinvmax:  1000,
    vrmppt:   475,
    vmpptmin: 150,
    vmpptmax: 800,
    impptmax: 16,
    iscmppt:  31,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Symo_EN.pdf',
    pac: 8200,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1400, priceSrc: 'est. EU retail', eurPerKw: 171,
  },
  {
    id:       'fronius-fronius-symo-10-0-3-m',
    brandId:   'fronius',
    name:     'Fronius Symo 10.0-3-M (10 kW)',
    note:     'Legacy SnapINverter 3-phase 10–20 kW range; IP66, MPPT1: 27A / MPPT2: 16.5A (10 kW)',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 200,
    vmpptmax: 800,
    impptmax: 27,
    iscmppt:  56,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Symo_EN.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1550, priceSrc: 'est. EU retail', eurPerKw: 155,
  },
  {
    id:       'fronius-fronius-symo-17-5-3-m',
    brandId:   'fronius',
    name:     'Fronius Symo 17.5-3-M (17.5 kW)',
    note:     'Legacy SnapINverter 3-phase; IP66, MPPT1: 33A / MPPT2: 27A (15–20 kW models)',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 200,
    vmpptmax: 800,
    impptmax: 33,
    iscmppt:  68,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Symo_EN.pdf',
    pac: 17500,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 2200, priceSrc: 'est. EU retail', eurPerKw: 126,
  },
  {
    id:       'fronius-fronius-symo-gen24-3-0-plus',
    brandId:   'fronius',
    name:     'Fronius Symo GEN24 3.0 Plus (3 kW)',
    note:     'Three-phase hybrid (battery-ready). Hybrid 3-ph, PV Point (Comfort), no Full Backup for 3–5 kW; battery DC 160–700V, active cooling, IP66, G98/G99; MPPT1=MPPT2=12.5A',
    vinvmax:  1000,
    vrmppt:   610,
    vmpptmin: 125,
    vmpptmax: 800,
    impptmax: 12.5,
    iscmppt:  20,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Symo_GEN24_GEN24Plus_3_to_10_kW_EN.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1350, priceSrc: 'est. EU retail', eurPerKw: 450,
  },
  {
    id:       'fronius-fronius-symo-gen24-6-0-plus',
    brandId:   'fronius',
    name:     'Fronius Symo GEN24 6.0 Plus (6 kW)',
    note:     'Three-phase hybrid (battery-ready). Hybrid 3-ph, PV Point + Full Backup; battery DC 160–700V, active cooling, IP66, G98/G99; MPPT1: 25A, MPPT2: 12.5A',
    vinvmax:  1000,
    vrmppt:   610,
    vmpptmin: 174,
    vmpptmax: 800,
    impptmax: 25,
    iscmppt:  40,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Symo_GEN24_GEN24Plus_3_to_10_kW_EN.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1600, priceSrc: 'est. EU retail', eurPerKw: 267,
  },
  {
    id:       'fronius-fronius-symo-gen24-8-0-plus',
    brandId:   'fronius',
    name:     'Fronius Symo GEN24 8.0 Plus (8 kW)',
    note:     'Three-phase hybrid (battery-ready). Hybrid 3-ph, PV Point + Full Backup; battery DC 160–700V, active cooling, IP66, G98/G99; MPPT1: 25A, MPPT2: 12.5A',
    vinvmax:  1000,
    vrmppt:   610,
    vmpptmin: 224,
    vmpptmax: 800,
    impptmax: 25,
    iscmppt:  40,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Symo_GEN24_GEN24Plus_3_to_10_kW_EN.pdf',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1680, priceSrc: 'est. EU retail', eurPerKw: 210,
  },
  {
    id:       'fronius-fronius-symo-gen24-10-0-plus',
    brandId:   'fronius',
    name:     'Fronius Symo GEN24 10.0 Plus (10 kW)',
    note:     'Three-phase hybrid (battery-ready). Hybrid 3-ph, PV Point + Full Backup; battery DC 160–700V, active cooling, IP66, G98/G99; MPPT1: 25A, MPPT2: 12.5A',
    vinvmax:  1000,
    vrmppt:   610,
    vmpptmin: 278,
    vmpptmax: 800,
    impptmax: 25,
    iscmppt:  40,
    datasheet: 'https://www.fronius.com/en/~/downloads/Solar%20Energy/Datasheets/SE_DS_Fronius_Symo_GEN24_GEN24Plus_3_to_10_kW_EN.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1749, priceSrc: 'Geizhals EU', eurPerKw: 175,
  },

  /* ─── SMA ───────────────────────────────────────────────── */
  {
    id:       'sma-sb3-0-1av-41',
    brandId:   'sma',
    name:     'SMA Sunny Boy 3.0 (3 kW)',
    note:     'SetApp commissioning via smartphone, SMA ShadeFix shade optimisation, SMA ArcFix integrated',
    vinvmax:  600,
    vrmppt:   365,
    vmpptmin: 110,
    vmpptmax: 500,
    impptmax: 15,
    iscmppt:  20,
    datasheet: 'https://manuals.sma.de/SBxx-1AV-41/en-US/4177679243.html',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 500, priceSrc: 'est. EU retail', eurPerKw: 167,
  },
  {
    id:       'sma-sb3-6-1av-41',
    brandId:   'sma',
    name:     'SMA Sunny Boy 3.6 (3.7 kW)',
    note:     'SetApp commissioning, SMA ShadeFix, 2 MPPT each accepting 2 strings in parallel',
    vinvmax:  600,
    vrmppt:   365,
    vmpptmin: 130,
    vmpptmax: 500,
    impptmax: 15,
    iscmppt:  20,
    datasheet: 'https://manuals.sma.de/SBxx-1AV-41/en-US/4177679243.html',
    pac: 3680,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 550, priceSrc: 'est. EU retail', eurPerKw: 149,
  },
  {
    id:       'sma-sb4-0-1av-41',
    brandId:   'sma',
    name:     'SMA Sunny Boy 4.0 (4 kW)',
    note:     'SetApp commissioning, SMA ShadeFix, transformerless, IP65',
    vinvmax:  600,
    vrmppt:   365,
    vmpptmin: 140,
    vmpptmax: 500,
    impptmax: 15,
    iscmppt:  20,
    datasheet: 'https://manuals.sma.de/SBxx-1AV-41/en-US/4177679243.html',
    pac: 4000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 600, priceSrc: 'est. EU retail', eurPerKw: 150,
  },
  {
    id:       'sma-sb5-0-1av-41',
    brandId:   'sma',
    name:     'SMA Sunny Boy 5.0 (5 kW)',
    note:     'SetApp commissioning, SMA ShadeFix, SMA ArcFix, 50/60 Hz compatible',
    vinvmax:  600,
    vrmppt:   337,
    vmpptmin: 175,
    vmpptmax: 500,
    impptmax: 15,
    iscmppt:  20,
    datasheet: 'https://manuals.sma.de/SBxx-1AV-41/en-US/4177754251.html',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 750, priceSrc: 'mg-solar-shop.de', eurPerKw: 150,
  },
  {
    id:       'sma-sb6-0-1av-41',
    brandId:   'sma',
    name:     'SMA Sunny Boy 6.0 (6 kW)',
    note:     'SetApp commissioning, SMA ShadeFix, SMA ArcFix, max single-phase Sunny Boy variant',
    vinvmax:  600,
    vrmppt:   355,
    vmpptmin: 210,
    vmpptmax: 500,
    impptmax: 15,
    iscmppt:  20,
    datasheet: 'https://manuals.sma.de/SBxx-1AV-41/en-US/4177754251.html',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 820, priceSrc: 'est. EU retail', eurPerKw: 137,
  },
  {
    id:       'sma-sbse3-6-50',
    brandId:   'sma',
    name:     'SMA Sunny Boy Smart Energy 3.6 (3.6 kW)',
    note:     'Single-phase hybrid (battery-ready). Integrated battery (LV 48V BYD/SMA), 3 independent MPPT inputs, battery-backup capable',
    vinvmax:  600,
    vrmppt:   270,
    vmpptmin: 60,
    vmpptmax: 480,
    impptmax: 15,
    iscmppt:  30,
    datasheet: 'https://manuals.sma.de/SBSExx-50/en-US/12996397195.html',
    pac: 3600,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 250,
  },
  {
    id:       'sma-sbse4-0-50',
    brandId:   'sma',
    name:     'SMA Sunny Boy Smart Energy 4.0 (4 kW)',
    note:     'Single-phase hybrid (battery-ready). Integrated battery storage, 3 MPPT, SMA Home Manager compatible, battery-backup function',
    vinvmax:  600,
    vrmppt:   270,
    vmpptmin: 60,
    vmpptmax: 480,
    impptmax: 15,
    iscmppt:  30,
    datasheet: 'https://manuals.sma.de/SBSExx-50/en-US/12996397195.html',
    pac: 4000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 950, priceSrc: 'est. EU retail', eurPerKw: 238,
  },
  {
    id:       'sma-sbse5-0-50',
    brandId:   'sma',
    name:     'SMA Sunny Boy Smart Energy 5.0 (5 kW)',
    note:     'Single-phase hybrid (battery-ready). Integrated battery storage, 3 MPPT, multifunction relay, battery-backup capable',
    vinvmax:  600,
    vrmppt:   270,
    vmpptmin: 60,
    vmpptmax: 480,
    impptmax: 15,
    iscmppt:  30,
    datasheet: 'https://manuals.sma.de/SBSExx-50/en-US/12996397195.html',
    pac: 5000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1050, priceSrc: 'est. EU retail', eurPerKw: 210,
  },
  {
    id:       'sma-sbse6-0-50',
    brandId:   'sma',
    name:     'SMA Sunny Boy Smart Energy 6.0 (6 kW)',
    note:     'Single-phase hybrid (battery-ready). Integrated battery storage, 3 MPPT, max single-phase hybrid in range, IP65',
    vinvmax:  600,
    vrmppt:   270,
    vmpptmin: 60,
    vmpptmax: 480,
    impptmax: 15,
    iscmppt:  30,
    datasheet: 'https://manuals.sma.de/SBSExx-50/en-US/12996397195.html',
    pac: 6000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1150, priceSrc: 'est. EU retail', eurPerKw: 192,
  },
  {
    id:       'sma-stp3-0-3av-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower 3.0 (3 kW)',
    note:     'SetApp commissioning, SMA ShadeFix, transformerless three-phase, suitable for smaller 3-phase households',
    vinvmax:  850,
    vrmppt:   495,
    vmpptmin: 140,
    vmpptmax: 800,
    impptmax: 12,
    iscmppt:  18,
    datasheet: 'https://manuals.sma.de/STPxx-3av-40-BE/en-US/3190770571.html',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 550, priceSrc: 'est. EU retail', eurPerKw: 183,
  },
  {
    id:       'sma-stp4-0-3av-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower 4.0 (4 kW)',
    note:     'SetApp commissioning, SMA ShadeFix, 2 MPPT trackers, three-phase output',
    vinvmax:  850,
    vrmppt:   470,
    vmpptmin: 175,
    vmpptmax: 800,
    impptmax: 12,
    iscmppt:  18,
    datasheet: 'https://manuals.sma.de/STPxx-3av-40-BE/en-US/3190770571.html',
    pac: 4000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 620, priceSrc: 'est. EU retail', eurPerKw: 155,
  },
  {
    id:       'sma-stp5-0-3av-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower 5.0 (5 kW)',
    note:     'SetApp commissioning, SMA ShadeFix, 580V rated input, transformerless',
    vinvmax:  850,
    vrmppt:   508,
    vmpptmin: 215,
    vmpptmax: 800,
    impptmax: 12,
    iscmppt:  18,
    datasheet: 'https://manuals.sma.de/STPxx-3av-40-BE/en-US/3190775563.html',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 680, priceSrc: 'est. EU retail', eurPerKw: 136,
  },
  {
    id:       'sma-stp6-0-3av-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower 6.0 (6 kW)',
    note:     'SetApp commissioning, SMA ShadeFix, 580V rated input, max of 3-6kW three-phase range',
    vinvmax:  850,
    vrmppt:   530,
    vmpptmin: 260,
    vmpptmax: 800,
    impptmax: 12,
    iscmppt:  18,
    datasheet: 'https://manuals.sma.de/STPxx-3av-40-BE/en-US/3190775563.html',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 740, priceSrc: 'est. EU retail', eurPerKw: 123,
  },
  {
    id:       'sma-stp8-0-3av-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower 8.0 (8 kW)',
    note:     'Input A: 20A/30A ISC, Input B: 12A/18A ISC; 1000V max DC, SetApp commissioning',
    vinvmax:  1000,
    vrmppt:   580,
    vmpptmin: 260,
    vmpptmax: 800,
    impptmax: 20,
    iscmppt:  30,
    datasheet: 'https://manuals.sma.de/STP8-10-3AV-40/en-US/4176094859.html',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 820, priceSrc: 'est. EU retail', eurPerKw: 103,
  },
  {
    id:       'sma-stp10-0-3av-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower 10.0 (10 kW)',
    note:     'Input A: 20A/30A ISC, Input B: 12A/18A ISC; 1000V max DC, 98.3% max efficiency',
    vinvmax:  1000,
    vrmppt:   580,
    vmpptmin: 320,
    vmpptmax: 800,
    impptmax: 20,
    iscmppt:  30,
    datasheet: 'https://manuals.sma.de/STP8-10-3AV-40/en-US/4176094859.html',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 870, priceSrc: 'est. EU retail', eurPerKw: 87,
  },
  {
    id:       'sma-stp5-0-3se-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower Smart Energy 5.0 (5 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid with battery backup, 1000V DC max, integrated energy management',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 210,
    vmpptmax: 800,
    impptmax: 12.5,
    iscmppt:  20,
    datasheet: 'https://manuals.sma.de/STPxx3SE40/en-US/14416373771.html',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 180,
  },
  {
    id:       'sma-stp6-0-3se-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower Smart Energy 6.0 (6 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid with battery backup, 1000V DC, SMA Home Manager 2.0 compatible',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 250,
    vmpptmax: 800,
    impptmax: 12.5,
    iscmppt:  20,
    datasheet: 'https://manuals.sma.de/STPxx3SE40/en-US/14416373771.html',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1000, priceSrc: 'est. EU retail', eurPerKw: 167,
  },
  {
    id:       'sma-stp8-0-3se-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower Smart Energy 8.0 (8 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid with battery backup, battery-backup function, 1000V DC max',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 330,
    vmpptmax: 800,
    impptmax: 12.5,
    iscmppt:  20,
    datasheet: 'https://manuals.sma.de/STPxx3SE40/en-US/14416373771.html',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1163, priceSrc: 'mg-solar-shop.de', eurPerKw: 145,
  },
  {
    id:       'sma-stp10-0-3se-40',
    brandId:   'sma',
    name:     'SMA Sunny Tripower Smart Energy 10.0 (10 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, Input B has higher current rating (25A/40A ISC), battery-backup capable',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 280,
    vmpptmax: 800,
    impptmax: 25,
    iscmppt:  40,
    datasheet: 'https://manuals.sma.de/STPxx3SE40/en-US/14416373771.html',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1855, priceSrc: 'Geizhals DE', eurPerKw: 186,
  },

  /* ─── GOODWE ───────────────────────────────────────────────── */
  {
    id:       'goodwe-gw3000-dns-30',
    brandId:   'goodwe',
    name:     'GoodWe DNS G3 3kW (3 kW)',
    note:     'Fanless, IP66, 150% DC oversizing, optional AFCI & Type II SPD vmpptmin estimated via ⌈P/16A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 188,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  23,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_DNS%20G3_Datasheet-EN.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 400, priceSrc: 'est. EU retail', eurPerKw: 133,
  },
  {
    id:       'goodwe-gw3600-dns-30',
    brandId:   'goodwe',
    name:     'GoodWe DNS G3 3.6kW (3.6 kW)',
    note:     'Fanless, IP66, 150% DC oversizing, optional AFCI & Type II SPD vmpptmin estimated via ⌈P/16A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 225,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  23,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_DNS%20G3_Datasheet-EN.pdf',
    pac: 3600,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 440, priceSrc: 'est. EU retail', eurPerKw: 122,
  },
  {
    id:       'goodwe-gw5000-dns-30',
    brandId:   'goodwe',
    name:     'GoodWe DNS G3 5kW (5 kW)',
    note:     'Fanless, IP66, 150% DC oversizing, optional AFCI & Type II SPD vmpptmin estimated via ⌈P/16A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 313,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  23,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_DNS%20G3_Datasheet-EN.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 500, priceSrc: 'est. EU retail', eurPerKw: 100,
  },
  {
    id:       'goodwe-gw6000-dns-30',
    brandId:   'goodwe',
    name:     'GoodWe DNS G3 6kW (6 kW)',
    note:     'Fanless, IP66, 150% DC oversizing, optional AFCI & Type II SPD vmpptmin estimated via ⌈P/16A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 375,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  23,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_DNS%20G3_Datasheet-EN.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 560, priceSrc: 'est. EU retail', eurPerKw: 93,
  },
  {
    id:       'goodwe-gw3k-dns-g40',
    brandId:   'goodwe',
    name:     'GoodWe DNS G4 3kW (3 kW)',
    note:     'Gen-4, 200% DC oversizing, 9.2 kg, built-in rapid shutdown, optional AFCI 3.0 vmpptmin estimated via ⌈P/20A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 150,
    vmpptmax: 560,
    impptmax: 20,
    iscmppt:  26,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_DNS-G4_Datasheet-EN.pdf',
    pac: 3000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 400, priceSrc: 'est. EU retail', eurPerKw: 133,
  },
  {
    id:       'goodwe-gw3-6k-dns-g40',
    brandId:   'goodwe',
    name:     'GoodWe DNS G4 3.6kW (3.6 kW)',
    note:     'Gen-4, 200% DC oversizing, 9.2 kg, built-in rapid shutdown, optional AFCI 3.0 vmpptmin estimated via ⌈P/20A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 180,
    vmpptmax: 560,
    impptmax: 20,
    iscmppt:  26,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_DNS-G4_Datasheet-EN.pdf',
    pac: 3600,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 440, priceSrc: 'est. EU retail', eurPerKw: 122,
  },
  {
    id:       'goodwe-gw5k-dns-g40',
    brandId:   'goodwe',
    name:     'GoodWe DNS G4 5kW (5 kW)',
    note:     'Gen-4, 200% DC oversizing, 9.2 kg, built-in rapid shutdown, optional AFCI 3.0 vmpptmin estimated via ⌈P/20A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 250,
    vmpptmax: 560,
    impptmax: 20,
    iscmppt:  26,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_DNS-G4_Datasheet-EN.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 500, priceSrc: 'est. EU retail', eurPerKw: 100,
  },
  {
    id:       'goodwe-gw6k-dns-g40',
    brandId:   'goodwe',
    name:     'GoodWe DNS G4 6kW (6 kW)',
    note:     'Gen-4, 200% DC oversizing, 9.2 kg, built-in rapid shutdown, optional AFCI 3.0 vmpptmin estimated via ⌈P/20A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 300,
    vmpptmax: 560,
    impptmax: 20,
    iscmppt:  26,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_DNS-G4_Datasheet-EN.pdf',
    pac: 6000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 560, priceSrc: 'est. EU retail', eurPerKw: 93,
  },
  {
    id:       'goodwe-gw7-5k-ms-g40',
    brandId:   'goodwe',
    name:     'GoodWe MS G4 7.5kW (3 MPPT) (7.5 kW)',
    note:     'Single-phase 7.5-10kW, 200% DC oversizing, built-in rapid shutdown, optional AFCI 3.0 vmpptmin estimated via ⌈P/20A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 375,
    vmpptmax: 560,
    impptmax: 20,
    iscmppt:  26,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_MS-G4_Datasheet-EN.pdf',
    pac: 7500,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 650, priceSrc: 'est. EU retail', eurPerKw: 87,
  },
  {
    id:       'goodwe-gw10k-ms-g40',
    brandId:   'goodwe',
    name:     'GoodWe MS G4 10kW (10 kW)',
    note:     'Single-phase 7.5-10kW, 200% DC oversizing, built-in rapid shutdown, optional AFCI 3.0 vmpptmin estimated via ⌈P/20A⌉ (datasheet only gives absolute 40 V).',
    vinvmax:  600,
    vrmppt:   300,
    vmpptmin: 500,
    vmpptmax: 560,
    impptmax: 20,
    iscmppt:  26,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_MS-G4_Datasheet-EN.pdf',
    pac: 10000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 780, priceSrc: 'est. EU retail', eurPerKw: 78,
  },
  {
    id:       'goodwe-gw5000-es-20',
    brandId:   'goodwe',
    name:     'GoodWe ES G2 5kW Hybrid LV (5 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 40-60V (48V nominal), 120A charge/discharge, UPS <10ms switchover, parallel support vmpptmin estimated via ⌈P/16A⌉ (datasheet only gives absolute 60 V).',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 313,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  23,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ES%20G2_Datasheet-EN.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 180,
  },
  {
    id:       'goodwe-gw6000-es-20',
    brandId:   'goodwe',
    name:     'GoodWe ES G2 6kW Hybrid LV (6 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 40-60V (48V nominal), 120A charge/discharge, UPS <10ms switchover, parallel support vmpptmin estimated via ⌈P/16A⌉ (datasheet only gives absolute 60 V).',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 375,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  23,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ES%20G2_Datasheet-EN.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 980, priceSrc: 'est. EU retail', eurPerKw: 163,
  },
  {
    id:       'goodwe-gw5kn-et',
    brandId:   'goodwe',
    name:     'GoodWe ET PLUS+ 5kW Hybrid 3ph (16A) (5 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 180-600V, 25A charge/discharge, 100% unbalanced output, Type II SPD DC',
    vinvmax:  1000,
    vrmppt:   525,
    vmpptmin: 200,
    vmpptmax: 850,
    impptmax: 16,
    iscmppt:  21.2,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ET%20PLUS+%20(16A)_Datasheet-EN.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 700, priceSrc: 'est. EU retail', eurPerKw: 140,
  },
  {
    id:       'goodwe-gw10kn-et',
    brandId:   'goodwe',
    name:     'GoodWe ET PLUS+ 10kW Hybrid 3ph (16A) (10 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 180-600V, 25A charge/discharge, 100% unbalanced output, Type II SPD DC',
    vinvmax:  1000,
    vrmppt:   525,
    vmpptmin: 200,
    vmpptmax: 850,
    impptmax: 16,
    iscmppt:  21.2,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ET%20PLUS+%20(16A)_Datasheet-EN.pdf',
    pac: 10000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 850, priceSrc: 'est. EU retail', eurPerKw: 85,
  },
  {
    id:       'goodwe-gw6000-et-20',
    brandId:   'goodwe',
    name:     'GoodWe ET G2 6kW Hybrid 3ph (6 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 150-720V, 30A charge/discharge, UPS <10ms, 160% DC oversizing, parallel up to 4 units',
    vinvmax:  1000,
    vrmppt:   485,
    vmpptmin: 120,
    vmpptmax: 850,
    impptmax: 16,
    iscmppt:  24,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ET-G2_Datasheet-EN.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 750, priceSrc: 'est. EU retail', eurPerKw: 125,
  },
  {
    id:       'goodwe-gw10k-et-20',
    brandId:   'goodwe',
    name:     'GoodWe ET G2 10kW Hybrid 3ph (10 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 150-720V, 40A charge/discharge, UPS <10ms, 160% DC oversizing, parallel up to 4 units',
    vinvmax:  1000,
    vrmppt:   485,
    vmpptmin: 120,
    vmpptmax: 850,
    impptmax: 16,
    iscmppt:  24,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ET-G2_Datasheet-EN.pdf',
    pac: 10000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 848, priceSrc: 'Geizhals EU', eurPerKw: 85,
  },
  {
    id:       'goodwe-gw15k-et-20',
    brandId:   'goodwe',
    name:     'GoodWe ET G2 15kW Hybrid 3ph (15 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 150-720V, 40A charge/discharge, UPS <10ms, 160% DC oversizing, parallel up to 4 units',
    vinvmax:  1000,
    vrmppt:   485,
    vmpptmin: 120,
    vmpptmax: 850,
    impptmax: 16,
    iscmppt:  24,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ET-G2_Datasheet-EN.pdf',
    pac: 15000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1450, priceSrc: 'est. EU retail', eurPerKw: 97,
  },
  {
    id:       'goodwe-gw15k-eta-g20',
    brandId:   'goodwe',
    name:     'GoodWe ESA 15kW Hybrid 3ph HV (15 kW)',
    note:     'Three-phase HV hybrid, ESA (ETA-G20) series. 4 MPPT (21A input / 26A Isc per MPPT), Vmax 1000V, MPP 120-950V, nom 750V, PV start-up 150V, up to 200% DC oversizing. HV battery 700-950V (nom 750V), 20.1/22.1A max charge/discharge, 15kVA backup.',
    vinvmax:  1000,
    vrmppt:   750,   /* Nominal Input Voltage - ESA 5-30kW datasheet */
    vmpptmin: 120,
    vmpptmax: 950,
    impptmax: 21,
    iscmppt:  26,    /* Max MPPT Short Circuit Current - ESA 5-30kW datasheet */
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ESA-5-30kW_Datasheet-EN.pdf',
    pac: 15000,
    nmppt: 4,   /* MPP trackers - ESA 5-30kW datasheet (pdfplumber-verified) */
    priceEur: 1761, priceSrc: 'photovoltaik-shop.de (DE, 0% VAT)', eurPerKw: 117,
  },
  {
    id:       'goodwe-gw15k-et',
    brandId:   'goodwe',
    name:     'GoodWe ET 15kW Hybrid 3ph HV (15 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 200-800V, 50A charge/discharge, fan-cooled, for large residential/small C&I',
    vinvmax:  1000,
    vrmppt:   525,
    vmpptmin: 200,
    vmpptmax: 850,
    impptmax: 30,
    iscmppt:  38,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ET%2015-30kW_Datasheet-EN.pdf',
    pac: 15000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1450, priceSrc: 'est. EU retail', eurPerKw: 97,
  },
  {
    id:       'goodwe-gw20k-et',
    brandId:   'goodwe',
    name:     'GoodWe ET 20kW Hybrid 3ph HV (20 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 200-800V, 50A charge/discharge, fan-cooled, for large residential/small C&I',
    vinvmax:  1000,
    vrmppt:   525,
    vmpptmin: 200,
    vmpptmax: 850,
    impptmax: 30,
    iscmppt:  38,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ET%2015-30kW_Datasheet-EN.pdf',
    pac: 20000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 2137, priceSrc: 'Geizhals DE', eurPerKw: 107,
  },
  {
    id:       'goodwe-gw10k-sdt-30',
    brandId:   'goodwe',
    name:     'GoodWe SDT G3 10kW (10 kW)',
    note:     '3-phase grid-tied 4-30kW family, fanless ≤15kW, 150% DC oversizing, optional AFCI & Type II SPD',
    vinvmax:  1100,
    vrmppt:   570,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 22,
    iscmppt:  27.5,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_SDT-G3_Datasheet-EN.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 650, priceSrc: 'est. EU retail', eurPerKw: 65,
  },
  {
    id:       'goodwe-gw15k-sdt-30',
    brandId:   'goodwe',
    name:     'GoodWe SDT G3 15kW (15 kW)',
    note:     '3-phase grid-tied, fanless, 150% DC oversizing, optional AFCI & Type II SPD, IP66',
    vinvmax:  1100,
    vrmppt:   570,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 22,
    iscmppt:  27.5,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_SDT-G3_Datasheet-EN.pdf',
    pac: 15000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 60,
  },
  {
    id:       'goodwe-gw20k-sdt-30',
    brandId:   'goodwe',
    name:     'GoodWe SDT G3 20kW (20 kW)',
    note:     '3-phase grid-tied, fan-cooled ≥17kW, 150% DC oversizing, 2 strings per MPPT on MPPT1',
    vinvmax:  1100,
    vrmppt:   570,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 40,
    iscmppt:  52.5,
    datasheet: 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_SDT-G3_Datasheet-EN.pdf',
    pac: 20000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1200, priceSrc: 'est. EU retail', eurPerKw: 60,
  },

  /* ─── SOLIS ───────────────────────────────────────────────── */
  {
    id:       'solis-s5-gr1p3k',
    brandId:   'solis',
    name:     'Solis S5-GR1P 3kW (3 kW)',
    note:     '5th-gen single-phase string inverter; LCD display; RS485 + optional Wi-Fi; IP65; EN 50530 certified',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 90,
    vmpptmax: 520,
    impptmax: 14,
    iscmppt:  22,
    datasheet: 'https://solar360australia.com.au/wp-content/uploads/2024/08/Solis-Single-Phase-Inverter-Datasheet.pdf',
    pac: 3000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 330, priceSrc: 'est. EU retail', eurPerKw: 110,
  },
  {
    id:       'solis-s5-gr1p4k',
    brandId:   'solis',
    name:     'Solis S5-GR1P 4kW (4 kW)',
    note:     '5th-gen single-phase string inverter; LCD display; RS485 + optional Wi-Fi; IP65',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 90,
    vmpptmax: 520,
    impptmax: 14,
    iscmppt:  22,
    datasheet: 'https://solar360australia.com.au/wp-content/uploads/2024/08/Solis-Single-Phase-Inverter-Datasheet.pdf',
    pac: 4000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 390, priceSrc: 'est. EU retail', eurPerKw: 98,
  },
  {
    id:       'solis-s5-gr1p5k',
    brandId:   'solis',
    name:     'Solis S5-GR1P 5kW (5 kW)',
    note:     '5th-gen single-phase string inverter; LCD display; RS485 + optional Wi-Fi; IP65; max eff 97.7%',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 90,
    vmpptmax: 520,
    impptmax: 14,
    iscmppt:  22,
    datasheet: 'https://solar360australia.com.au/wp-content/uploads/2024/08/Solis-Single-Phase-Inverter-Datasheet.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 450, priceSrc: 'est. EU retail', eurPerKw: 90,
  },
  {
    id:       'solis-s5-gr1p6k',
    brandId:   'solis',
    name:     'Solis S5-GR1P 6kW (6 kW)',
    note:     '5th-gen single-phase string inverter; LCD display; RS485 + optional Wi-Fi; IP65',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 90,
    vmpptmax: 520,
    impptmax: 14,
    iscmppt:  22,
    datasheet: 'https://solar360australia.com.au/wp-content/uploads/2024/08/Solis-Single-Phase-Inverter-Datasheet.pdf',
    pac: 6000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 520, priceSrc: 'est. EU retail', eurPerKw: 87,
  },
  {
    id:       'solis-s6-gr1p3k-s',
    brandId:   'solis',
    name:     'Solis S6-GR1P 3kW (3 kW)',
    note:     '6th-gen single-phase; LED+APP display; integrated AFCI (activation required); integrated DC switch; IP66; 16A string current',
    vinvmax:  550,
    vrmppt:   320,
    vmpptmin: 90,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  22,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S6-GR1P(2,5-6)K-S_IND_V1,2_2023_04.pdf',
    pac: 3000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 320, priceSrc: 'Geizhals DE (series)', eurPerKw: 107,
  },
  {
    id:       'solis-s6-gr1p4k-s',
    brandId:   'solis',
    name:     'Solis S6-GR1P 4kW (4 kW)',
    note:     '6th-gen single-phase; LED+APP display; integrated AFCI; integrated DC switch; IP66',
    vinvmax:  550,
    vrmppt:   320,
    vmpptmin: 90,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  22,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S6-GR1P(2,5-6)K-S_IND_V1,2_2023_04.pdf',
    pac: 4000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 380, priceSrc: 'est. EU retail', eurPerKw: 95,
  },
  {
    id:       'solis-s6-gr1p5k-s',
    brandId:   'solis',
    name:     'Solis S6-GR1P 5kW (5 kW)',
    note:     '6th-gen single-phase; LED+APP display; integrated AFCI; integrated DC switch; IP66; max eff 97.7%; compact 8.2 kg',
    vinvmax:  550,
    vrmppt:   320,
    vmpptmin: 90,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  22,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S6-GR1P(2,5-6)K-S_IND_V1,2_2023_04.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 440, priceSrc: 'est. EU retail', eurPerKw: 88,
  },
  {
    id:       'solis-s6-gr1p6k-s',
    brandId:   'solis',
    name:     'Solis S6-GR1P 6kW (6 kW)',
    note:     '6th-gen single-phase; LED+APP display; integrated AFCI; integrated DC switch; IP66',
    vinvmax:  550,
    vrmppt:   320,
    vmpptmin: 90,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  22,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S6-GR1P(2,5-6)K-S_IND_V1,2_2023_04.pdf',
    pac: 6000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 500, priceSrc: 'est. EU retail', eurPerKw: 83,
  },
  {
    id:       'solis-s5-gr3p5k',
    brandId:   'solis',
    name:     'Solis S5-GR3P 5kW (5 kW)',
    note:     '5th-gen three-phase string inverter; 2/2 string inputs; LCD; RS485; IP66; EN 50549-1 / G99 / VDE-AR-N 4105; max eff 98.5%',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S5-GR3P(3-20)K_POL.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 400, priceSrc: 'est. EU retail', eurPerKw: 80,
  },
  {
    id:       'solis-s5-gr3p8k',
    brandId:   'solis',
    name:     'Solis S5-GR3P 8kW (8 kW)',
    note:     '5th-gen three-phase; 2/2 string inputs; IP66; natural convection; AFCI (activation required)',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S5-GR3P(3-20)K_POL.pdf',
    pac: 8000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 430, priceSrc: 'ONSA Plus (EU)', eurPerKw: 54,
  },
  {
    id:       'solis-s5-gr3p10k',
    brandId:   'solis',
    name:     'Solis S5-GR3P 10kW (10 kW)',
    note:     '5th-gen three-phase; 2/2 string inputs; LCD; RS485; IP66; max eff 98.6%; G99/VDE-AR-N 4105/CEI 0-21',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S5-GR3P(3-20)K_POL.pdf',
    pac: 10000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 520, priceSrc: 'est. EU retail', eurPerKw: 52,
  },
  {
    id:       'solis-s5-gr3p15k',
    brandId:   'solis',
    name:     'Solis S5-GR3P 15kW (15 kW)',
    note:     '5th-gen three-phase; 2/4 string inputs (32A per MPPT); fan cooling; IP66; max eff 98.7%',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 32,
    iscmppt:  40,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S5-GR3P(3-20)K_POL.pdf',
    pac: 15000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1300, priceSrc: 'est. EU retail', eurPerKw: 87,
  },
  {
    id:       'solis-s5-gr3p20k',
    brandId:   'solis',
    name:     'Solis S5-GR3P 20kW (20 kW)',
    note:     '5th-gen three-phase; 2/4 string inputs (32A per MPPT); fan cooling; IP66; max eff 98.7%',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 32,
    iscmppt:  40,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_datasheet_S5-GR3P(3-20)K_POL.pdf',
    pac: 20000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1800, priceSrc: 'DE retail (~)', eurPerKw: 90,
  },
  {
    id:       'solis-s6-gr3p5k02-nv-nd',
    brandId:   'solis',
    name:     'Solis S6-GR3P 5kW (5 kW)',
    note:     '6th-gen three-phase; LED+Bluetooth+APP; dual RS485; I/V curve scan; AFCI 2.0 optional; IP66 C5; natural cooling; preliminary spec',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 21,
    iscmppt:  26.5,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_Inverter_S6-GR3P(3-10)K02-NV-ND_Datasheet_GLOBAL_V2,7_202507.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 450, priceSrc: 'est. EU retail', eurPerKw: 90,
  },
  {
    id:       'solis-s6-gr3p8k02-nv-nd',
    brandId:   'solis',
    name:     'Solis S6-GR3P 8kW (8 kW)',
    note:     '6th-gen three-phase; LED+Bluetooth+APP; dual RS485; I/V curve scan; IP66 C5; preliminary spec',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 21,
    iscmppt:  26.5,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_Inverter_S6-GR3P(3-10)K02-NV-ND_Datasheet_GLOBAL_V2,7_202507.pdf',
    pac: 8000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 560, priceSrc: 'est. EU retail', eurPerKw: 70,
  },
  {
    id:       'solis-s6-gr3p10k02-nv-nd',
    brandId:   'solis',
    name:     'Solis S6-GR3P 10kW (10 kW)',
    note:     '6th-gen three-phase; LED+Bluetooth+APP; dual RS485; I/V curve scan; IP66 C5; max eff 98.5%; preliminary spec',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 21,
    iscmppt:  26.5,
    datasheet: 'https://www.solisinverters.com/uploads/file/Solis_Inverter_S6-GR3P(3-10)K02-NV-ND_Datasheet_GLOBAL_V2,7_202507.pdf',
    pac: 10000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 650, priceSrc: 'est. EU retail', eurPerKw: 65,
  },
  {
    id:       'solis-rhi-3k-48es-5g',
    brandId:   'solis',
    name:     'Solis RHI 3kW Hybrid (3 kW)',
    note:     'Single-phase hybrid (battery-ready). Low-voltage 48V battery hybrid; Li-ion or lead-acid; 3kW backup; 7" LCD; high-freq isolation; EN50438/G98/G99/VDE N4105; IP65',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 90,
    vmpptmax: 520,
    impptmax: 11,
    iscmppt:  17.2,
    datasheet: 'https://www.ginlong.com/uploads/file/b8aab1b3860fbeee5b7e22f08338119c.pdf',
    pac: 3000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 700, priceSrc: 'est. EU retail', eurPerKw: 233,
  },
  {
    id:       'solis-rhi-5k-48es-5g',
    brandId:   'solis',
    name:     'Solis RHI 5kW Hybrid (5 kW)',
    note:     'Single-phase hybrid (battery-ready). Low-voltage 48V battery hybrid (42–58V); 5kW backup; max charge/discharge 100A; 7" LCD; max eff >97.5%; IP65',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 90,
    vmpptmax: 520,
    impptmax: 11,
    iscmppt:  17.2,
    datasheet: 'https://www.ginlong.com/uploads/file/b8aab1b3860fbeee5b7e22f08338119c.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 850, priceSrc: 'est. EU retail', eurPerKw: 170,
  },
  {
    id:       'solis-rhi-6k-48es-5g',
    brandId:   'solis',
    name:     'Solis RHI 6kW Hybrid (6 kW)',
    note:     'Single-phase hybrid (battery-ready). Low-voltage 48V battery hybrid; 5kW backup; max charge/discharge 100A; 7" LCD; IP65',
    vinvmax:  600,
    vrmppt:   305,
    vmpptmin: 90,
    vmpptmax: 520,
    impptmax: 11,
    iscmppt:  17.2,
    datasheet: 'https://www.ginlong.com/uploads/file/b8aab1b3860fbeee5b7e22f08338119c.pdf',
    pac: 6000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 950, priceSrc: 'est. EU retail', eurPerKw: 158,
  },
  {
    id:       'solis-rhi-3p5k-hves-5g',
    brandId:   'solis',
    name:     'Solis RHI-3P 5kW HV Hybrid (5 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase HV hybrid; Li-ion 160–600V battery; 5kW backup (10kVA peak/60s); AFCI; G98/G99/VDE-AR-N 4105; IP65; max eff 98.4%',
    vinvmax:  1000,
    vrmppt:   525,
    vmpptmin: 200,
    vmpptmax: 850,
    impptmax: 13,
    iscmppt:  16.5,
    datasheet: 'https://solarbulgaria.eu/wp-content/uploads/2023/05/Datasheet_RHI-3P5-10K-HVES-5G_GBR_V2.0_2023_02.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 180,
  },
  {
    id:       'solis-rhi-3p8k-hves-5g',
    brandId:   'solis',
    name:     'Solis RHI-3P 8kW HV Hybrid (8 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase HV hybrid; Li-ion 160–600V battery; 8kW backup (16kVA peak/60s); 2 MPPT / 3 string inputs (26A+13A asymmetric); IP65',
    vinvmax:  1000,
    vrmppt:   525,
    vmpptmin: 200,
    vmpptmax: 850,
    impptmax: 26,
    iscmppt:  32.5,
    datasheet: 'https://solarbulgaria.eu/wp-content/uploads/2023/05/Datasheet_RHI-3P5-10K-HVES-5G_GBR_V2.0_2023_02.pdf',
    pac: 8000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1050, priceSrc: 'est. EU retail', eurPerKw: 131,
  },
  {
    id:       'solis-rhi-3p10k-hves-5g',
    brandId:   'solis',
    name:     'Solis RHI-3P 10kW HV Hybrid (10 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase HV hybrid; Li-ion 160–600V battery; 10kW backup (16kVA peak/60s); 2 MPPT / 4 string inputs; BYD/Pylontech compatible; IP65',
    vinvmax:  1000,
    vrmppt:   525,
    vmpptmin: 200,
    vmpptmax: 850,
    impptmax: 26,
    iscmppt:  32.5,
    datasheet: 'https://solarbulgaria.eu/wp-content/uploads/2023/05/Datasheet_RHI-3P5-10K-HVES-5G_GBR_V2.0_2023_02.pdf',
    pac: 10000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1150, priceSrc: 'westech-pv.com (EU)', eurPerKw: 115,
  },

  /* ─── SUNGROW ───────────────────────────────────────────────── */
  {
    id:       'sungrow-sh3-0rs',
    brandId:   'sungrow',
    name:     'Sungrow SH3.0RS (3 kW)',
    note:     'Single-phase hybrid (battery-ready). 2 MPPT ×1 string, 40–560 V published (full-power floor ≈188 V via ⌈3000W/16A⌉ (datasheet defers to user manual)), SBR battery',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 188,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2025/06/30/DS_20240320_SH3.0_3.6_4.0_5.0_6.0RS_Datasheet_V18_EN.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 600, priceSrc: 'est. EU retail', eurPerKw: 200,
  },
  {
    id:       'sungrow-sh3-6rs',
    brandId:   'sungrow',
    name:     'Sungrow SH3.6RS (3.6 kW) (3.7 kW)',
    note:     'Single-phase hybrid (battery-ready). 2 MPPT ×1 string, SBR battery',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 230,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2025/06/30/DS_20240320_SH3.0_3.6_4.0_5.0_6.0RS_Datasheet_V18_EN.pdf',
    pac: 3680,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 650, priceSrc: 'est. EU retail', eurPerKw: 177,
  },
  {
    id:       'sungrow-sh4-0rs',
    brandId:   'sungrow',
    name:     'Sungrow SH4.0RS (4 kW)',
    note:     'Single-phase hybrid (battery-ready). 2 MPPT ×1 string, SBR battery',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 250,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2025/06/30/DS_20240320_SH3.0_3.6_4.0_5.0_6.0RS_Datasheet_V18_EN.pdf',
    pac: 4000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 700, priceSrc: 'est. EU retail', eurPerKw: 175,
  },
  {
    id:       'sungrow-sh5-0rs',
    brandId:   'sungrow',
    name:     'Sungrow SH5.0RS (5 kW)',
    note:     'Single-phase hybrid (battery-ready). 2 MPPT ×1 string, most popular RS size in EU/RO residential, SBR battery',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 313,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2025/06/30/DS_20240320_SH3.0_3.6_4.0_5.0_6.0RS_Datasheet_V18_EN.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 780, priceSrc: 'est. EU retail', eurPerKw: 156,
  },
  {
    id:       'sungrow-sh6-0rs',
    brandId:   'sungrow',
    name:     'Sungrow SH6.0RS (6 kW)',
    note:     'Single-phase hybrid (battery-ready). 2 MPPT ×1 string, 97.7% max / 97.3% EU efficiency, SBR battery',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 375,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2025/06/30/DS_20240320_SH3.0_3.6_4.0_5.0_6.0RS_Datasheet_V18_EN.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 850, priceSrc: 'est. EU retail', eurPerKw: 142,
  },
  {
    id:       'sungrow-sh8-0rs',
    brandId:   'sungrow',
    name:     'Sungrow SH8.0RS (8 kW)',
    note:     'Single-phase hybrid (battery-ready). 4 MPPT ×1 string (16 A each), 200% DC/AC ratio allowed, AFCI, SBR battery',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 500,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2025/06/30/DS_20240919_SH8.0_10RS_Datasheet_V3_EN(AU).pdf',
    pac: 8000,
    nmppt: 4,   /* MPP trackers - datasheet scrape */
    priceEur: 1000, priceSrc: 'est. EU retail', eurPerKw: 125,
  },
  {
    id:       'sungrow-sh5-0rt',
    brandId:   'sungrow',
    name:     'Sungrow SH5.0RT (5 kW)',
    note:     'Three-phase hybrid (battery-ready). 2 MPPT ×1 string, 150 V startup (lower than other RT), SBR battery',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 150,
    vmpptmax: 950,
    impptmax: 12.5,
    iscmppt:  16,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2024/01/17/DS_20240111_SH5.0_6.0_8.0_10RT_Datasheet_V22_EN.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 700, priceSrc: 'est. EU retail', eurPerKw: 140,
  },
  {
    id:       'sungrow-sh6-0rt',
    brandId:   'sungrow',
    name:     'Sungrow SH6.0RT (6 kW)',
    note:     'Three-phase hybrid (battery-ready). 2 MPPT ×1 string, 200 V startup, SBR battery',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 200,
    vmpptmax: 950,
    impptmax: 12.5,
    iscmppt:  16,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2024/01/17/DS_20240111_SH5.0_6.0_8.0_10RT_Datasheet_V22_EN.pdf',
    pac: 6000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 750, priceSrc: 'est. EU retail', eurPerKw: 125,
  },
  {
    id:       'sungrow-sh8-0rt',
    brandId:   'sungrow',
    name:     'Sungrow SH8.0RT (8 kW)',
    note:     'Three-phase hybrid (battery-ready). 2 MPPT ×1 string, 98.4% max efficiency, SBR battery',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 200,
    vmpptmax: 950,
    impptmax: 12.5,
    iscmppt:  16,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2024/01/17/DS_20240111_SH5.0_6.0_8.0_10RT_Datasheet_V22_EN.pdf',
    pac: 8000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 795, priceSrc: 'Geizhals DE', eurPerKw: 99,
  },
  {
    id:       'sungrow-sh10rt',
    brandId:   'sungrow',
    name:     'Sungrow SH10RT (10 kW)',
    note:     'Three-phase hybrid (battery-ready). 2 MPPT: MPPT1 ×1 string 12.5 A, MPPT2 ×2 strings 25 A total; SBR battery',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 200,
    vmpptmax: 950,
    impptmax: 12.5,
    iscmppt:  16,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2024/01/17/DS_20240111_SH5.0_6.0_8.0_10RT_Datasheet_V22_EN.pdf',
    pac: 10000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 859, priceSrc: 'Geizhals DE', eurPerKw: 86,
  },
  {
    id:       'sungrow-sh15rt',
    brandId:   'sungrow',
    name:     'Sungrow SH15RT (15 kW)',
    note:     'Three-phase hybrid (battery-ready). 3 MPPT (2+2+1 strings, 32/32/16 A), 63 A backup bypass, SBR 100–700 V; current model marketed as SH15T',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 150,
    vmpptmax: 950,
    impptmax: 32,
    iscmppt:  40,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2024/03/29/DS_20240328_SH15_20_25T_Datasheet_V3_EN(AU).pdf',
    pac: 15000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1400, priceSrc: 'est. EU retail', eurPerKw: 93,
  },
  {
    id:       'sungrow-sh20rt',
    brandId:   'sungrow',
    name:     'Sungrow SH20RT (20 kW)',
    note:     'Three-phase hybrid (battery-ready). 3 MPPT (2+2+1 strings, 32/32/16 A), 63 A backup bypass, SBR 100–700 V; current model marketed as SH20T',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 150,
    vmpptmax: 950,
    impptmax: 32,
    iscmppt:  40,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2024/03/29/DS_20240328_SH15_20_25T_Datasheet_V3_EN(AU).pdf',
    pac: 20000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1750, priceSrc: 'est. EU retail', eurPerKw: 88,
  },
  {
    id:       'sungrow-sg5k-d',
    brandId:   'sungrow',
    name:     'Sungrow SG5K-D (5 kW) (5.0 kW)',
    note:     '2 MPPT; full-power MPP 240–480 V (absolute 90–560 V); AFCI; string only (no battery)',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 240,
    vmpptmax: 480,
    impptmax: 12.5,
    iscmppt:  15,
    datasheet: 'https://specsolar.com.au/wp-content/uploads/Sungrow_DS_20210506_SG3K-D-SG5K-D-Premium-Datasheet_V12_EN.pdf',
    pac: 4999,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 500, priceSrc: 'est. EU retail', eurPerKw: 100,
  },
  {
    id:       'sungrow-sg10ktl-mt',
    brandId:   'sungrow',
    name:     'Sungrow SG10KTL-MT (10 kW)',
    note:     '2 MPPT ×2 strings (22 A each); full-power MPP 320–850 V; older KTL-MT platform',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 320,
    vmpptmax: 850,
    impptmax: 22,
    iscmppt:  30,
    datasheet: 'https://www.solarrun.com.au/wp-content/uploads/2022/09/SG10KTL-MT_datasheet.pdf',
    pac: 10000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 700, priceSrc: 'est. EU retail', eurPerKw: 70,
  },
  {
    id:       'sungrow-sg17rt',
    brandId:   'sungrow',
    name:     'Sungrow SG17RT (17 kW)',
    note:     '2 MPPT ×2 strings (25 A each); replaces SG17KTL-MT designation; C5 anti-corrosion, AFCI',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 180,
    vmpptmax: 1000,
    impptmax: 25,
    iscmppt:  32,
    datasheet: 'https://info-support.sungrowpower.com/application/pdf/2023/03/15/DS_20230228_SG15_17_20RT_Datasheet_V18_EN.pdf',
    pac: 17000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1100, priceSrc: 'est. EU retail', eurPerKw: 65,
  },

  /* ─── SOLAREDGE ───────────────────────────────────────────────── */
  {
    id:       'solaredge-se3000h',
    brandId:   'solaredge',
    name:     'SolarEdge SE3000H Home Hub (3 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid 3kW for EU; fixed-voltage optimizer system; SolarEdge Home Battery 400V; SetApp commissioning; backup-capable with extra HW; DS-000198-EU Aug 2023',
    vinvmax:  480,
    vrmppt:   380,
    vmpptmin: 380,
    vmpptmax: 480,
    impptmax: 9,
    iscmppt:  9,
    datasheet: 'https://cdn.enfsolar.com/z/pp/2023/5/n1x19255xy3x8y/se-home-hub-single-phase-inverter-datasheet-eu.pdf',
    pac: 3000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 700, priceSrc: 'est. EU retail', eurPerKw: 233,
  },
  {
    id:       'solaredge-se5000h',
    brandId:   'solaredge',
    name:     'SolarEdge SE5000H Home Hub (5 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid 5kW for EU; fixed-voltage optimizer system; SolarEdge Home Battery 400V; SetApp commissioning; backup-capable with extra HW; DS-000198-EU Aug 2023',
    vinvmax:  480,
    vrmppt:   380,
    vmpptmin: 380,
    vmpptmax: 480,
    impptmax: 13.5,
    iscmppt:  13.5,
    datasheet: 'https://cdn.enfsolar.com/z/pp/2023/5/n1x19255xy3x8y/se-home-hub-single-phase-inverter-datasheet-eu.pdf',
    pac: 5000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 850, priceSrc: 'est. EU retail', eurPerKw: 170,
  },
  {
    id:       'solaredge-se6000h',
    brandId:   'solaredge',
    name:     'SolarEdge SE6000H Home Hub (6 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid 6kW for EU; fixed-voltage optimizer system; SolarEdge Home Battery 400V; SetApp commissioning; backup-capable with extra HW; DS-000198-EU Aug 2023',
    vinvmax:  480,
    vrmppt:   380,
    vmpptmin: 380,
    vmpptmax: 480,
    impptmax: 16.5,
    iscmppt:  16.5,
    datasheet: 'https://cdn.enfsolar.com/z/pp/2023/5/n1x19255xy3x8y/se-home-hub-single-phase-inverter-datasheet-eu.pdf',
    pac: 6000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 950, priceSrc: 'est. EU retail', eurPerKw: 158,
  },
  {
    id:       'solaredge-se8000h',
    brandId:   'solaredge',
    name:     'SolarEdge SE8000H Home Hub (8 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid 8kW for EU; available in UK/Spain/France only; fixed-voltage optimizer system; SolarEdge Home Battery 400V; SetApp commissioning; DS-000198-EU Aug 2023',
    vinvmax:  480,
    vrmppt:   380,
    vmpptmin: 380,
    vmpptmax: 480,
    impptmax: 20.5,
    iscmppt:  20.5,
    datasheet: 'https://cdn.enfsolar.com/z/pp/2023/5/n1x19255xy3x8y/se-home-hub-single-phase-inverter-datasheet-eu.pdf',
    pac: 8000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1150, priceSrc: 'est. EU retail', eurPerKw: 144,
  },
  {
    id:       'solaredge-se10000h',
    brandId:   'solaredge',
    name:     'SolarEdge SE10000H Home Hub (10 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid 10kW for EU; available in UK/Spain/France only; fixed-voltage optimizer system; SolarEdge Home Battery 400V; SetApp commissioning; DS-000198-EU Aug 2023',
    vinvmax:  480,
    vrmppt:   380,
    vmpptmin: 380,
    vmpptmax: 480,
    impptmax: 25.5,
    iscmppt:  25.5,
    datasheet: 'https://cdn.enfsolar.com/z/pp/2023/5/n1x19255xy3x8y/se-home-hub-single-phase-inverter-datasheet-eu.pdf',
    pac: 10000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1300, priceSrc: 'est. EU retail', eurPerKw: 130,
  },
  {
    id:       'solaredge-se5k',
    brandId:   'solaredge',
    name:     'SolarEdge SE5K Home Wave 3ph (5 kW)',
    note:     'Three-phase Home Wave SetApp 5kW for EU; fixed-voltage optimizer architecture; 2 MC4 pairs; internal fan; DS-000145-EU Dec 2023',
    vinvmax:  900,
    vrmppt:   750,
    vmpptmin: 750,
    vmpptmax: 900,
    impptmax: 8.5,
    iscmppt:  null,
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/SG/PDF/SolarEdge_Datasheets/SE3K-SE10K.pdf',
    pac: 5000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 180,
  },
  {
    id:       'solaredge-se7k',
    brandId:   'solaredge',
    name:     'SolarEdge SE7K Home Wave 3ph (7 kW)',
    note:     'Three-phase Home Wave SetApp 7kW for EU; fixed-voltage optimizer architecture; 2 MC4 pairs; internal fan; DS-000145-EU Dec 2023',
    vinvmax:  900,
    vrmppt:   750,
    vmpptmin: 750,
    vmpptmax: 900,
    impptmax: 12,
    iscmppt:  null,
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/SG/PDF/SolarEdge_Datasheets/SE3K-SE10K.pdf',
    pac: 7000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1050, priceSrc: 'est. EU retail', eurPerKw: 150,
  },
  {
    id:       'solaredge-se10k',
    brandId:   'solaredge',
    name:     'SolarEdge SE10K Home Wave 3ph (10 kW)',
    note:     'Three-phase Home Wave SetApp 10kW for EU; fixed-voltage optimizer architecture; 2 MC4 pairs; internal fan; DS-000145-EU Dec 2023',
    vinvmax:  900,
    vrmppt:   750,
    vmpptmin: 750,
    vmpptmax: 900,
    impptmax: 16.5,
    iscmppt:  null,
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/SG/PDF/SolarEdge_Datasheets/SE3K-SE10K.pdf',
    pac: 10000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1199, priceSrc: 'Geizhals AT', eurPerKw: 120,
  },
  {
    id:       'solaredge-se12-5k',
    brandId:   'solaredge',
    name:     'SolarEdge SE12.5K SetApp 3ph (12.5 kW)',
    note:     'Three-phase SetApp 12.5kW for EU; fixed-voltage optimizer architecture; 2 MC4 pairs; user-replaceable fan; arc fault protection; date 12/2020',
    vinvmax:  1000,
    vrmppt:   750,
    vmpptmin: 750,
    vmpptmax: 1000,
    impptmax: 21,
    iscmppt:  null,
    datasheet: 'https://www.spiritenergy.co.uk/hubfs/Datasheets/Inverters/SolarEdge/SolarEdge%203%20phase%2012-17k.pdf',
    pac: 12500,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1400, priceSrc: 'est. EU retail', eurPerKw: 112,
  },
  {
    id:       'solaredge-se17k',
    brandId:   'solaredge',
    name:     'SolarEdge SE17K SetApp 3ph (17 kW)',
    note:     'Three-phase SetApp 17kW for EU; fixed-voltage optimizer architecture; 2 MC4 pairs; user-replaceable fan; arc fault protection; date 12/2020',
    vinvmax:  1000,
    vrmppt:   750,
    vmpptmin: 750,
    vmpptmax: 1000,
    impptmax: 23,
    iscmppt:  null,
    datasheet: 'https://www.spiritenergy.co.uk/hubfs/Datasheets/Inverters/SolarEdge/SolarEdge%203%20phase%2012-17k.pdf',
    pac: 17000,
    nmppt: 1,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1650, priceSrc: 'est. EU retail', eurPerKw: 97,
  },

  /* ─── GROWATT ───────────────────────────────────────────────── */
  {
    id:       'growatt-min-3000tl-x',
    brandId:   'growatt',
    name:     'Growatt MIN 3000TL-X (3 kW)',
    note:     'Dual MPPT, OLED+LED display, SetApp/WiFi, IP65, transformerless; CE VDE0126 EN50549',
    vinvmax:  500,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 500,
    impptmax: 12.5,
    iscmppt:  16,
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/IND/Datasheets/Growatt/Datasheet_Growatt_MIN_3-6TL-X.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 380, priceSrc: 'est. EU retail', eurPerKw: 127,
  },
  {
    id:       'growatt-min-4200tl-x',
    brandId:   'growatt',
    name:     'Growatt MIN 4200TL-X (4.2 kW)',
    note:     'Dual MPPT, OLED+LED display, IP65, natural convection cooling, Type II DC SPD',
    vinvmax:  550,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 12.5,
    iscmppt:  16,
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/IND/Datasheets/Growatt/Datasheet_Growatt_MIN_3-6TL-X.pdf',
    pac: 4200,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 430, priceSrc: 'est. EU retail', eurPerKw: 102,
  },
  {
    id:       'growatt-min-5000tl-x',
    brandId:   'growatt',
    name:     'Growatt MIN 5000TL-X (5 kW)',
    note:     'Dual MPPT, OLED+LED display, IP65, natural convection cooling, Type II DC SPD',
    vinvmax:  550,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 12.5,
    iscmppt:  16,
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/IND/Datasheets/Growatt/Datasheet_Growatt_MIN_3-6TL-X.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 480, priceSrc: 'est. EU retail', eurPerKw: 96,
  },
  {
    id:       'growatt-min-6000tl-x',
    brandId:   'growatt',
    name:     'Growatt MIN 6000TL-X (6 kW)',
    note:     'Dual MPPT, OLED+LED display, IP65, natural convection cooling, Type II DC SPD',
    vinvmax:  550,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 12.5,
    iscmppt:  16,
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/IND/Datasheets/Growatt/Datasheet_Growatt_MIN_3-6TL-X.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 540, priceSrc: 'est. EU retail', eurPerKw: 90,
  },
  {
    id:       'growatt-min-3000tl-xh',
    brandId:   'growatt',
    name:     'Growatt MIN 3000TL-XH (3 kW)',
    note:     'Single-phase hybrid (battery-ready). Battery-ready hybrid; ARK XH LFP battery (5.12–17.9 kWh); AFCI; IP65; CE EN50549 VDE-AR-N4105',
    vinvmax:  500,
    vrmppt:   360,
    vmpptmin: 70,
    vmpptmax: 500,
    impptmax: 13.5,
    iscmppt:  16.9,
    datasheet: 'https://irp.cdn-website.com/14371ca4/files/uploaded/MIN%202500%206000TL%20XH%20Datasheet.pdf',
    pac: 3000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 650, priceSrc: 'est. EU retail', eurPerKw: 217,
  },
  {
    id:       'growatt-min-5000tl-xh',
    brandId:   'growatt',
    name:     'Growatt MIN 5000TL-XH (5 kW)',
    note:     'Single-phase hybrid (battery-ready). Battery-ready hybrid; ARK XH LFP battery; AFCI; IP65; backup power requires Backup Box accessory',
    vinvmax:  550,
    vrmppt:   360,
    vmpptmin: 70,
    vmpptmax: 550,
    impptmax: 13.5,
    iscmppt:  16.9,
    datasheet: 'https://irp.cdn-website.com/14371ca4/files/uploaded/MIN%202500%206000TL%20XH%20Datasheet.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 780, priceSrc: 'est. EU retail', eurPerKw: 156,
  },
  {
    id:       'growatt-min-6000tl-xh',
    brandId:   'growatt',
    name:     'Growatt MIN 6000TL-XH (6 kW)',
    note:     'Single-phase hybrid (battery-ready). Battery-ready hybrid; ARK XH LFP battery; AFCI; IP65; backup power requires Backup Box accessory',
    vinvmax:  550,
    vrmppt:   360,
    vmpptmin: 70,
    vmpptmax: 550,
    impptmax: 13.5,
    iscmppt:  16.9,
    datasheet: 'https://irp.cdn-website.com/14371ca4/files/uploaded/MIN%202500%206000TL%20XH%20Datasheet.pdf',
    pac: 6000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 850, priceSrc: 'est. EU retail', eurPerKw: 142,
  },
  {
    id:       'growatt-sph-3000tl-bl-up',
    brandId:   'growatt',
    name:     'Growatt SPH 3000TL BL-UP (3 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 42–59 V (LFP/lead-acid); UPS <10 ms; smart load dry contact; VPP ready; IP65',
    vinvmax:  550,
    vrmppt:   370,
    vmpptmin: 120,
    vmpptmax: 550,
    impptmax: 13.5,
    iscmppt:  16.9,
    datasheet: 'https://en.growatt.com/upload/file/SPH3000~6000TL%20BL-UP_20251209.pdf',
    pac: 3000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 650, priceSrc: 'est. EU retail', eurPerKw: 217,
  },
  {
    id:       'growatt-sph-5000tl-bl-up',
    brandId:   'growatt',
    name:     'Growatt SPH 5000TL BL-UP (5 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 42–59 V (LFP/lead-acid); UPS <10 ms; smart load dry contact; VPP ready; IP65',
    vinvmax:  550,
    vrmppt:   370,
    vmpptmin: 120,
    vmpptmax: 550,
    impptmax: 13.5,
    iscmppt:  16.9,
    datasheet: 'https://en.growatt.com/upload/file/SPH3000~6000TL%20BL-UP_20251209.pdf',
    pac: 5000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 780, priceSrc: 'est. EU retail', eurPerKw: 156,
  },
  {
    id:       'growatt-sph-6000tl-bl-up',
    brandId:   'growatt',
    name:     'Growatt SPH 6000TL BL-UP (6 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 42–59 V (LFP/lead-acid); UPS <10 ms; smart load dry contact; VPP ready; IP65',
    vinvmax:  550,
    vrmppt:   370,
    vmpptmin: 120,
    vmpptmax: 550,
    impptmax: 13.5,
    iscmppt:  16.9,
    datasheet: 'https://en.growatt.com/upload/file/SPH3000~6000TL%20BL-UP_20251209.pdf',
    pac: 6000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 850, priceSrc: 'Geizhals DE (series)', eurPerKw: 142,
  },
  {
    id:       'growatt-sph-5000tl3-bh-up',
    brandId:   'growatt',
    name:     'Growatt SPH 5000TL3 BH-UP (5 kW)',
    note:     'Three-phase hybrid (battery-ready). 3-phase hybrid; wide HV battery 100–550 V; UPS <10 ms; 100% 3-ph imbalance output; IP65',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 120,
    vmpptmax: 1000,
    impptmax: 13.5,
    iscmppt:  16.9,
    datasheet: 'https://site-539722.mozfiles.com/files/539722/Datasheet_Growatt_SPH-4000-10000tl3-BH-UP_3ph_hybrid-inverter_2-mppt_2021_ENG__1_.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 180,
  },
  {
    id:       'growatt-sph-10000tl3-bh-up',
    brandId:   'growatt',
    name:     'Growatt SPH 10000TL3 BH-UP (10 kW)',
    note:     'Three-phase hybrid (battery-ready). 3-phase hybrid; wide HV battery 100–550 V; UPS <10 ms; 100% 3-ph imbalance output; IP65',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 120,
    vmpptmax: 1000,
    impptmax: 13.5,
    iscmppt:  16.9,
    datasheet: 'https://site-539722.mozfiles.com/files/539722/Datasheet_Growatt_SPH-4000-10000tl3-BH-UP_3ph_hybrid-inverter_2-mppt_2021_ENG__1_.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1300, priceSrc: 'est. EU retail', eurPerKw: 130,
  },
  {
    id:       'growatt-mod-10ktl3-x',
    brandId:   'growatt',
    name:     'Growatt MOD 10KTL3-X (10 kW)',
    note:     '3-phase string, IP66, natural convection, dual MPPT, Type II DC+AC SPD; CE EN50549 G98/G99',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 13,
    iscmppt:  16,
    datasheet: 'https://growatt.tech/wp-content/uploads/2023/02/MOD-10_15KTL3-X-Datasheet.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 90,
  },
  {
    id:       'growatt-mod-15ktl3-x',
    brandId:   'growatt',
    name:     'Growatt MOD 15KTL3-X (15 kW)',
    note:     '3-phase string, IP66, natural convection, 1 or 2 strings per MPPT (13/26 A); CE EN50549 G98/G99',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 13,
    iscmppt:  16,
    datasheet: 'https://growatt.tech/wp-content/uploads/2023/02/MOD-10_15KTL3-X-Datasheet.pdf',
    pac: 15000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1394, priceSrc: 'Geizhals DE', eurPerKw: 93,
  },
  {
    id:       'growatt-mid-15ktl3-x',
    brandId:   'growatt',
    name:     'Growatt MID 15KTL3-X (15 kW)',
    note:     '3-phase, compact 23 kg, smart cooling, dual MPPT, 2 strings/MPPT; CE EN50549 VDE-AR-N4105 G99',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 200,
    vmpptmax: 1000,
    impptmax: 25,
    iscmppt:  32,
    datasheet: 'https://midsummerwholesale.co.uk/pdfs/growatt-15-25ktl3-x-datasheet.pdf',
    pac: 15000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1000, priceSrc: 'est. EU retail', eurPerKw: 67,
  },
  {
    id:       'growatt-mid-20ktl3-x',
    brandId:   'growatt',
    name:     'Growatt MID 20KTL3-X (20 kW)',
    note:     '3-phase, compact 23 kg, smart cooling, dual MPPT, 2 strings/MPPT; CE EN50549 VDE-AR-N4105 G99',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 200,
    vmpptmax: 1000,
    impptmax: 25,
    iscmppt:  32,
    datasheet: 'https://midsummerwholesale.co.uk/pdfs/growatt-15-25ktl3-x-datasheet.pdf',
    pac: 20000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1300, priceSrc: 'est. EU retail', eurPerKw: 65,
  },
  {
    id:       'growatt-mid-25ktl3-x',
    brandId:   'growatt',
    name:     'Growatt MID 25KTL3-X (25 kW)',
    note:     '3-phase, 3 strings on MPPT2 option; compact 23 kg, smart cooling; CE EN50549 VDE-AR-N4105 G99',
    vinvmax:  1100,
    vrmppt:   580,
    vmpptmin: 200,
    vmpptmax: 1000,
    impptmax: 37.5,
    iscmppt:  48,
    datasheet: 'https://midsummerwholesale.co.uk/pdfs/growatt-15-25ktl3-x-datasheet.pdf',
    pac: 25000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1600, priceSrc: 'est. EU retail', eurPerKw: 64,
  },
  {
    id:       'growatt-mid-20ktl3-xh',
    brandId:   'growatt',
    name:     'Growatt MID 20KTL3-XH (20 kW)',
    note:     'Three-phase hybrid (battery-ready). 3-phase hybrid; APX HV battery (5–60 kWh); 2 battery ports up to 30 kW discharge; AFCI; IP66',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 160,
    vmpptmax: 1000,
    impptmax: 25,
    iscmppt:  32,
    datasheet: 'https://liriksolar.com/image/uploads/Growatt%20MID%2020KTL3-XH%20Datasheet.pdf',
    pac: 20000,
    nmppt: 2,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1900, priceSrc: 'est. EU retail', eurPerKw: 95,
  },

  /* ─── SOLAX ───────────────────────────────────────────────── */
  {
    id:       'solax-x1-boost-3k-g4',
    brandId:   'solax',
    name:     'SolaX X1-Boost 3K G4 (3 kW)',
    note:     '2x MPPT 1-string each, 200% DC oversizing, IP66 vmpptmin estimated ⌈P/I⌉ from 40 V; iscmppt not published by SolaX.',
    vinvmax:  560,
    vrmppt:   300,
    vmpptmin: 188,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-boost-g4.html',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 500, priceSrc: 'est. EU retail', eurPerKw: 167,
  },
  {
    id:       'solax-x1-boost-4k-g4',
    brandId:   'solax',
    name:     'SolaX X1-Boost 4K G4 (4 kW)',
    note:     '2x MPPT 1-string each, 200% DC oversizing, IP66 vmpptmin estimated ⌈P/I⌉ from 40 V; iscmppt not published by SolaX.',
    vinvmax:  560,
    vrmppt:   300,
    vmpptmin: 250,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-boost-g4.html',
    pac: 4000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 560, priceSrc: 'est. EU retail', eurPerKw: 140,
  },
  {
    id:       'solax-x1-boost-5k-g4',
    brandId:   'solax',
    name:     'SolaX X1-Boost 5K G4 (5 kW)',
    note:     '2x MPPT 1-string each, 200% DC oversizing, IP66 vmpptmin estimated ⌈P/I⌉ from 40 V; iscmppt not published by SolaX.',
    vinvmax:  560,
    vrmppt:   300,
    vmpptmin: 313,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-boost-g4.html',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 620, priceSrc: 'est. EU retail', eurPerKw: 124,
  },
  {
    id:       'solax-x1-boost-6k-g4',
    brandId:   'solax',
    name:     'SolaX X1-Boost 6K G4 (6 kW)',
    note:     '2x MPPT 1-string each, 200% DC oversizing, IP66 vmpptmin estimated ⌈P/I⌉ from 40 V; iscmppt not published by SolaX.',
    vinvmax:  560,
    vrmppt:   300,
    vmpptmin: 375,
    vmpptmax: 560,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-boost-g4.html',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 700, priceSrc: 'est. EU retail', eurPerKw: 117,
  },
  {
    id:       'solax-x1-mini-2-0k-g4',
    brandId:   'solax',
    name:     'SolaX X1-Mini 2K G4 (2 kW)',
    note:     'Single MPPT, compact wall-mount 290x206x120 mm, IP66 vmpptmin estimated ⌈P/I⌉ from 35 V; iscmppt not published by SolaX.',
    vinvmax:  450,
    vrmppt:   242,
    vmpptmin: 125,
    vmpptmax: 450,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-mini.html',
    pac: 2000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 380, priceSrc: 'est. EU retail', eurPerKw: 190,
  },
  {
    id:       'solax-x1-mini-3-0k-g4',
    brandId:   'solax',
    name:     'SolaX X1-Mini 3K G4 (3 kW)',
    note:     'Single MPPT, compact wall-mount, IP66 vmpptmin estimated ⌈P/I⌉ from 35 V; iscmppt not published by SolaX.',
    vinvmax:  550,
    vrmppt:   292,
    vmpptmin: 188,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-mini.html',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 450, priceSrc: 'est. EU retail', eurPerKw: 150,
  },
  {
    id:       'solax-x3-mic-5k-g2',
    brandId:   'solax',
    name:     'SolaX X3-MIC 5K G2 (5 kW)',
    note:     '2x MPPT 1-string each, up to 98.5% efficiency, 200% DC oversizing, IP66 iscmppt not published by SolaX - set to null.',
    vinvmax:  980,
    vrmppt:   550,
    vmpptmin: 120,
    vmpptmax: 980,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-mic.html',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 650, priceSrc: 'est. EU retail', eurPerKw: 130,
  },
  {
    id:       'solax-x3-mic-8k-g2',
    brandId:   'solax',
    name:     'SolaX X3-MIC 8K G2 (8 kW)',
    note:     '2x MPPT 1-string each, built-in global MPP scan, IP66 iscmppt not published by SolaX - set to null.',
    vinvmax:  980,
    vrmppt:   550,
    vmpptmin: 120,
    vmpptmax: 980,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-mic.html',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 820, priceSrc: 'est. EU retail', eurPerKw: 103,
  },
  {
    id:       'solax-x3-mic-10k-g2',
    brandId:   'solax',
    name:     'SolaX X3-MIC 10K G2 (10 kW)',
    note:     '2x MPPT 1-string each, built-in global MPP scan, IP66 iscmppt not published by SolaX - set to null.',
    vinvmax:  980,
    vrmppt:   550,
    vmpptmin: 120,
    vmpptmax: 980,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-mic.html',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 950, priceSrc: 'est. EU retail', eurPerKw: 95,
  },
  {
    id:       'solax-x3-mic-15k-g2',
    brandId:   'solax',
    name:     'SolaX X3-MIC 15K G2 (15 kW)',
    note:     '2x MPPT, MPPT1=32A / MPPT2=16A, built-in global MPP scan, IP66 iscmppt not published by SolaX - set to null.',
    vinvmax:  980,
    vrmppt:   550,
    vmpptmin: 120,
    vmpptmax: 980,
    impptmax: 32,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-mic.html',
    pac: 15000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1250, priceSrc: 'est. EU retail', eurPerKw: 83,
  },
  {
    id:       'solax-x1-hybrid-5-0-d',
    brandId:   'solax',
    name:     'SolaX X1-Hybrid G4 5kW (5 kW)',
    note:     'Single-phase hybrid (battery-ready). HV battery (Triple Power), 200% PV oversizing, EPS backup, IP65 vmpptmin estimated ⌈P/I⌉ from 70 V; iscmppt not published by SolaX.',
    vinvmax:  550,
    vrmppt:   310,
    vmpptmin: 313,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-hybrid-g4.html',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1050, priceSrc: 'est. EU retail', eurPerKw: 210,
  },
  {
    id:       'solax-x1-hybrid-6-0-d',
    brandId:   'solax',
    name:     'SolaX X1-Hybrid G4 6kW (6 kW)',
    note:     'Single-phase hybrid (battery-ready). HV battery (Triple Power), 200% PV oversizing, EPS backup, IP65 vmpptmin estimated ⌈P/I⌉ from 70 V; iscmppt not published by SolaX.',
    vinvmax:  550,
    vrmppt:   310,
    vmpptmin: 375,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-hybrid-g4.html',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1150, priceSrc: 'est. EU retail', eurPerKw: 192,
  },
  {
    id:       'solax-x1-hybrid-7-5-d',
    brandId:   'solax',
    name:     'SolaX X1-Hybrid G4 7.5kW (7.5 kW)',
    note:     'Single-phase hybrid (battery-ready). HV battery (Triple Power), 200% PV oversizing, EPS backup, IP65 vmpptmin estimated ⌈P/I⌉ from 70 V; iscmppt not published by SolaX.',
    vinvmax:  550,
    vrmppt:   310,
    vmpptmin: 469,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x1-hybrid-g4.html',
    pac: 7500,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1300, priceSrc: 'est. EU retail', eurPerKw: 173,
  },
  {
    id:       'solax-x3-hybrid-5-0-d',
    brandId:   'solax',
    name:     'SolaX X3-Hybrid G4 5kW (5 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery (Triple Power), 2x MPPT 1-string each, EPS backup, IP65 iscmppt not published by SolaX - set to null.',
    vinvmax:  950,
    vrmppt:   565,
    vmpptmin: 180,
    vmpptmax: 950,
    impptmax: 16,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-hybrid-g4.html',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1456, priceSrc: 'Geizhals AT', eurPerKw: 291,
  },
  {
    id:       'solax-x3-hybrid-10-0-d',
    brandId:   'solax',
    name:     'SolaX X3-Hybrid G4 10kW (10 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery, MPPT1=28A / MPPT2=16A, 2+1 strings, EPS backup, IP65 iscmppt not published by SolaX - set to null.',
    vinvmax:  950,
    vrmppt:   565,
    vmpptmin: 180,
    vmpptmax: 950,
    impptmax: 28,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-hybrid-g4.html',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1433, priceSrc: 'Geizhals AT', eurPerKw: 143,
  },
  {
    id:       'solax-x3-hybrid-15-0-d',
    brandId:   'solax',
    name:     'SolaX X3-Hybrid G4 15kW (15 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery, MPPT1=28A / MPPT2=16A, 2+1 strings, EPS backup, IP65 iscmppt not published by SolaX - set to null.',
    vinvmax:  950,
    vrmppt:   565,
    vmpptmin: 180,
    vmpptmax: 950,
    impptmax: 28,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-hybrid-g4.html',
    pac: 15000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1399, priceSrc: 'Geizhals DE', eurPerKw: 93,
  },
  {
    id:       'solax-x3-hyb-8-0-p',
    brandId:   'solax',
    name:     'SolaX X3-Hybrid G4 Pro 8kW (8 kW)',
    note:     'Three-phase hybrid (battery-ready). 3x MPPT 1-string each, 20A per MPPT, wider MPPT range vs G4, EPS, IP65 iscmppt not published by SolaX - set to null.',
    vinvmax:  950,
    vrmppt:   530,
    vmpptmin: 110,
    vmpptmax: 950,
    impptmax: 20,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-hyb-g4-pro.html',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1250, priceSrc: 'est. EU retail', eurPerKw: 156,
  },
  {
    id:       'solax-x3-hyb-10-0-p',
    brandId:   'solax',
    name:     'SolaX X3-Hybrid G4 Pro 10kW (10 kW)',
    note:     'Three-phase hybrid (battery-ready). 3x MPPT 1-string each, 20A per MPPT, wider MPPT range vs G4, EPS, IP65 iscmppt not published by SolaX - set to null.',
    vinvmax:  950,
    vrmppt:   530,
    vmpptmin: 110,
    vmpptmax: 950,
    impptmax: 20,
    iscmppt:  null,
    datasheet: 'https://www.solaxpower.com/our-products/x3-hyb-g4-pro.html',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1400, priceSrc: 'est. EU retail', eurPerKw: 140,
  },

  /* ─── DEYE ───────────────────────────────────────────────── */
  {
    id:       'deye-sun-3-6k-sg04lp1-eu',
    brandId:   'deye',
    name:     'Deye SUN-3.6K-SG04LP1-EU (3.6 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 48V, 2 MPPT 1+1 strings, LCD, IP65, G98/VDE-AR-N 4105 compliant',
    vinvmax:  500,
    vrmppt:   370,
    vmpptmin: 150,
    vmpptmax: 425,
    impptmax: 18,
    iscmppt:  27,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2026/04/24/BDatasheetSUN-3-6K-SG04LP120260424en-xMzy.pdf',
    pac: 3600,
    nmppt: 2,   /* 2/1+1 per SG04LP1-EU datasheet (3K variants are 1/1) */
    priceEur: 650, priceSrc: 'est. RO/EU retail', eurPerKw: 181,
  },
  {
    id:       'deye-sun-5k-sg04lp1-eu',
    brandId:   'deye',
    name:     'Deye SUN-5K-SG04LP1-EU (5 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 48V, 2 MPPT 1+1 strings, max charge/discharge 120A, LCD, IP65',
    vinvmax:  500,
    vrmppt:   370,
    vmpptmin: 150,
    vmpptmax: 425,
    impptmax: 18,
    iscmppt:  27,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2026/04/24/BDatasheetSUN-3-6K-SG04LP120260424en-xMzy.pdf',
    pac: 5000,
    nmppt: 2,   /* 2/1+1 per SG04LP1-EU datasheet (3K variants are 1/1) */
    priceEur: 750, priceSrc: 'est. RO/EU retail', eurPerKw: 150,
  },
  {
    id:       'deye-sun-6k-sg04lp1-eu',
    brandId:   'deye',
    name:     'Deye SUN-6K-SG04LP1-EU (6 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 48V, 2 MPPT 1+1 strings, max charge/discharge 135A, LCD, IP65',
    vinvmax:  500,
    vrmppt:   370,
    vmpptmin: 150,
    vmpptmax: 425,
    impptmax: 18,
    iscmppt:  27,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2026/04/24/BDatasheetSUN-3-6K-SG04LP120260424en-xMzy.pdf',
    pac: 6000,
    nmppt: 2,   /* 2/1+1 per SG04LP1-EU datasheet (3K variants are 1/1) */
    priceEur: 850, priceSrc: 'est. RO/EU retail', eurPerKw: 142,
  },
  {
    id:       'deye-sun-6k-sg04lp3-eu',
    brandId:   'deye',
    name:     'Deye SUN-6K-SG04LP3-EU (6 kW)',
    note:     'Three-phase hybrid (battery-ready). LV battery 48V 3-phase, transformer-isolated battery side, 2 MPPT 1+1 strings, LCD',
    vinvmax:  800,
    vrmppt:   550,
    vmpptmin: 200,
    vmpptmax: 650,
    impptmax: 13,
    iscmppt:  17,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2026/04/25/BDatasheetSUN-5-12K-SG04LP320260424en.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1340, priceSrc: 'solarscouts.de (DE)', eurPerKw: 223,
  },
  {
    id:       'deye-sun-8k-sg04lp3-eu',
    brandId:   'deye',
    name:     'Deye SUN-8K-SG04LP3-EU (8 kW)',
    note:     'Three-phase hybrid (battery-ready). LV battery 48V 3-phase, MPPT1: 2 strings 26A, MPPT2: 1 string 13A, LCD, IP65',
    vinvmax:  800,
    vrmppt:   550,
    vmpptmin: 200,
    vmpptmax: 650,
    impptmax: 26,
    iscmppt:  34,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2026/04/25/BDatasheetSUN-5-12K-SG04LP320260424en.pdf',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1430, priceSrc: 'Geizhals DE', eurPerKw: 179,
  },
  {
    id:       'deye-sun-10k-sg04lp3-eu',
    brandId:   'deye',
    name:     'Deye SUN-10K-SG04LP3-EU (10 kW)',
    note:     'Three-phase hybrid (battery-ready). LV battery 48V 3-phase, MPPT1: 2 strings 26A, MPPT2: 1 string 13A, max charge 210A',
    vinvmax:  800,
    vrmppt:   550,
    vmpptmin: 200,
    vmpptmax: 650,
    impptmax: 26,
    iscmppt:  34,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2026/04/25/BDatasheetSUN-5-12K-SG04LP320260424en.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1499, priceSrc: 'Geizhals EU', eurPerKw: 150,
  },
  {
    id:       'deye-sun-12k-sg04lp3-eu',
    brandId:   'deye',
    name:     'Deye SUN-12K-SG04LP3-EU (12 kW)',
    note:     'Three-phase hybrid (battery-ready). LV battery 48V 3-phase, MPPT1: 2 strings 26A, MPPT2: 1 string 13A, max charge 240A',
    vinvmax:  800,
    vrmppt:   550,
    vmpptmin: 200,
    vmpptmax: 650,
    impptmax: 26,
    iscmppt:  34,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2026/04/25/BDatasheetSUN-5-12K-SG04LP320260424en.pdf',
    pac: 12000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1462, priceSrc: 'Geizhals DE', eurPerKw: 122,
  },
  {
    id:       'deye-sun-6k-sg05lp1-eu',
    brandId:   'deye',
    name:     'Deye SUN-6K-SG05LP1-EU (6 kW)',
    note:     'Single-phase hybrid (battery-ready). LV battery 48V, 2 MPPT 1+1 strings, newer SG05 platform vs SG04, LCD, IP65',
    vinvmax:  500,
    vrmppt:   370,
    vmpptmin: 150,
    vmpptmax: 425,
    impptmax: 13,
    iscmppt:  17,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2026/01/29/%E3%80%90B%E3%80%91Datasheet_SUN-3.6-10K-SG05LP1-EU_20260129_en.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. RO/EU retail', eurPerKw: 150,
  },
  {
    id:       'deye-sun-8k-sg01hp3-eu-am2',
    brandId:   'deye',
    name:     'Deye SUN-8K-SG01HP3-EU (8 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 160-700V, 2 MPPT MPPT1: 2str/MPPT2: 1str, G98/G99/VDE-AR-N 4105',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 150,
    vmpptmax: 850,
    impptmax: 26,
    iscmppt:  39,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2025/05/29/%E3%80%90b%E3%80%91datasheet_sun-5-25k-sg01hp3-eu_30240102201075_20250520_en-1.pdf',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1218, priceSrc: 'solarscouts.de (DE)', eurPerKw: 152,
  },
  {
    id:       'deye-sun-10k-sg01hp3-eu-am2',
    brandId:   'deye',
    name:     'Deye SUN-10K-SG01HP3-EU (10 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 160-700V, 2 MPPT MPPT1: 2str/MPPT2: 1str, max charge/discharge 37A',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 150,
    vmpptmax: 850,
    impptmax: 26,
    iscmppt:  39,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2025/05/29/%E3%80%90b%E3%80%91datasheet_sun-5-25k-sg01hp3-eu_30240102201075_20250520_en-1.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1299, priceSrc: 'Geizhals DE', eurPerKw: 130,
  },
  {
    id:       'deye-sun-12k-sg01hp3-eu-am2',
    brandId:   'deye',
    name:     'Deye SUN-12K-SG01HP3-EU (12 kW)',
    note:     'Three-phase hybrid (battery-ready). HV battery 160-700V, 2 MPPT 2+2 strings, max charge/discharge 37A, IP65',
    vinvmax:  1000,
    vrmppt:   600,
    vmpptmin: 150,
    vmpptmax: 850,
    impptmax: 26,
    iscmppt:  39,
    datasheet: 'https://www.deyeinverter.com/deyeinverter/2025/05/29/%E3%80%90b%E3%80%91datasheet_sun-5-25k-sg01hp3-eu_30240102201075_20250520_en-1.pdf',
    pac: 12000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1400, priceSrc: 'est. (Geizhals series)', eurPerKw: 117,
  },

  /* ─── KOSTAL ───────────────────────────────────────────────── */
  {
    id:       'kostal-plenticore-plus-5-5',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE plus 5.5 (5.5 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery input via activation code, 3 MPPT; MPP lower limit 160 V in 3-tracker mode at rated output vmpptmax corrected 720→800 V per PLENTICORE plus datasheet.',
    vinvmax:  1000,
    vrmppt:   570,
    vmpptmin: 160,
    vmpptmax: 800,
    impptmax: 13,
    iscmppt:  16.25,
    datasheet: 'https://www.kostal-solar-electric.com/download/datenblatt/db_plenticore-plus_en.pdf',
    pac: 5500,
    nmppt: 3,   ndc: 3,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 164,
  },
  {
    id:       'kostal-plenticore-plus-7-0',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE plus 7.0 (7 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery input via activation code, 3 MPPT; MPP lower limit 195 V in 3-tracker mode vmpptmax corrected 720→800 V per PLENTICORE plus datasheet.',
    vinvmax:  1000,
    vrmppt:   570,
    vmpptmin: 195,
    vmpptmax: 800,
    impptmax: 13,
    iscmppt:  16.25,
    datasheet: 'https://www.kostal-solar-electric.com/download/datenblatt/db_plenticore-plus_en.pdf',
    pac: 7000,
    nmppt: 3,   ndc: 3,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1050, priceSrc: 'est. EU retail', eurPerKw: 150,
  },
  {
    id:       'kostal-plenticore-plus-8-5',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE plus 8.5 (8.5 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery input via activation code, 3 MPPT; MPP lower limit 230 V in 3-tracker mode vmpptmax corrected 720→800 V per PLENTICORE plus datasheet.',
    vinvmax:  1000,
    vrmppt:   570,
    vmpptmin: 230,
    vmpptmax: 800,
    impptmax: 13,
    iscmppt:  16.25,
    datasheet: 'https://www.kostal-solar-electric.com/download/datenblatt/db_plenticore-plus_en.pdf',
    pac: 8500,
    nmppt: 3,   ndc: 3,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1200, priceSrc: 'est. EU retail', eurPerKw: 141,
  },
  {
    id:       'kostal-plenticore-plus-10',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE plus 10 (10 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery input via activation code, 3 MPPT; MPP lower limit 275 V in 3-tracker mode vmpptmax corrected 720→800 V per PLENTICORE plus datasheet.',
    vinvmax:  1000,
    vrmppt:   570,
    vmpptmin: 275,
    vmpptmax: 800,
    impptmax: 13,
    iscmppt:  16.25,
    datasheet: 'https://www.kostal-solar-electric.com/download/datenblatt/db_plenticore-plus_en.pdf',
    pac: 10000,
    nmppt: 3,   ndc: 3,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 1050, priceSrc: 'Geizhals DE (G2)', eurPerKw: 105,
  },
  {
    id:       'kostal-plenticore-s-g3-4-0',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE S G3 4.0 (4 kW)',
    note:     'Three-phase hybrid (battery-ready). G3 generation, upgradeable to 5.5/7.0 kW via PLENTICOIN, backup-capable, WiFi, 2xLAN, SG Ready',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 80,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-G3_en.pdf',
    pac: 4000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 700, priceSrc: 'est. EU retail', eurPerKw: 175,
  },
  {
    id:       'kostal-plenticore-s-g3-5-5',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE S G3 5.5 (5.5 kW)',
    note:     'Three-phase hybrid (battery-ready). G3 generation power upgrade level 1 of S class, backup-capable, WiFi, 2xLAN',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 110,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-G3_en.pdf',
    pac: 5500,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 820, priceSrc: 'est. EU retail', eurPerKw: 149,
  },
  {
    id:       'kostal-plenticore-s-g3-7-0',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE S G3 7.0 (7 kW)',
    note:     'Three-phase hybrid (battery-ready). G3 generation power upgrade level 2 of S class, backup-capable, WiFi, 2xLAN',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 140,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-G3_en.pdf',
    pac: 7000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 950, priceSrc: 'est. EU retail', eurPerKw: 136,
  },
  {
    id:       'kostal-plenticore-m-g3-8-5',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE M G3 8.5 (8.5 kW)',
    note:     'Three-phase hybrid (battery-ready). G3 M class base power, upgradeable to 10/12.5 kW; DC3 input current 30 A; ISC DC3 42 A',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 170,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-G3_en.pdf',
    pac: 8500,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1200, priceSrc: 'est. EU retail', eurPerKw: 141,
  },
  {
    id:       'kostal-plenticore-m-g3-10',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE M G3 10 (10 kW)',
    note:     'Three-phase hybrid (battery-ready). G3 M class upgrade level 1; DC1/DC2 17A/23.8A ISC; DC3 30A/42A ISC; backup-capable',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 200,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-G3_en.pdf',
    pac: 10000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1350, priceSrc: 'est. EU retail', eurPerKw: 135,
  },
  {
    id:       'kostal-plenticore-m-g3-12-5',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE M G3 12.5 (12.5 kW)',
    note:     'Three-phase hybrid (battery-ready). G3 M class upgrade level 2; DC1/DC2 17A; DC3 30A input current; backup-capable',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 250,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-G3_en.pdf',
    pac: 12500,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1550, priceSrc: 'est. EU retail', eurPerKw: 124,
  },
  {
    id:       'kostal-plenticore-mp-s-g3-3-0',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE MP S G3 3.0 (3 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid G3, 2 MPPT, upgradeable to 3.6/4.0 kW, backup-capable, WiFi, EEBus',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 85,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-MP-G3_en.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 550, priceSrc: 'est. EU retail', eurPerKw: 183,
  },
  {
    id:       'kostal-plenticore-mp-m-g3-6-0',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE MP M G3 6.0 (6 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid G3 M class, 3 MPPT, upgradeable to 7.0 kW, backup-capable, WiFi, EEBus',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 95,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-MP-G3_en.pdf',
    pac: 6000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 850, priceSrc: 'est. EU retail', eurPerKw: 142,
  },
  {
    id:       'kostal-plenticore-mp-m-g3-7-0',
    brandId:   'kostal',
    name:     'Kostal PLENTICORE MP M G3 7.0 (7 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid G3 M class upgrade level 2, 3 MPPT, backup-capable, WiFi, EEBus',
    vinvmax:  1000,
    vrmppt:   650,
    vmpptmin: 145,
    vmpptmax: 800,
    impptmax: 17,
    iscmppt:  23.8,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PLENTICORE-G3/DB_PLENTICORE-MP-G3_en.pdf',
    pac: 7000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 950, priceSrc: 'est. EU retail', eurPerKw: 136,
  },
  {
    id:       'kostal-piko-10',
    brandId:   'kostal',
    name:     'Kostal PIKO 10 (10 kW)',
    note:     'Grid-only three-phase string inverter, 2 MPPT, parallel DC input supported (DC1+DC2=36A max), SUNCLIX',
    vinvmax:  1000,
    vrmppt:   680,
    vmpptmin: 290,
    vmpptmax: 800,
    impptmax: 18,
    iscmppt:  25,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PIKO-10-20/DB_PIKO-10-20_en.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1100, priceSrc: 'est. EU retail', eurPerKw: 110,
  },
  {
    id:       'kostal-piko-12',
    brandId:   'kostal',
    name:     'Kostal PIKO 12 (12 kW)',
    note:     'Grid-only three-phase string inverter, 2 MPPT, parallel DC input supported (DC1+DC2=36A max)',
    vinvmax:  1000,
    vrmppt:   680,
    vmpptmin: 345,
    vmpptmax: 800,
    impptmax: 18,
    iscmppt:  25,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PIKO-10-20/DB_PIKO-10-20_en.pdf',
    pac: 12000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1250, priceSrc: 'est. EU retail', eurPerKw: 104,
  },
  {
    id:       'kostal-piko-15',
    brandId:   'kostal',
    name:     'Kostal PIKO 15 (15 kW)',
    note:     'Grid-only three-phase string inverter, 3 MPPT, integrated Smart AC Switch, parallel DC1+DC2=40A max',
    vinvmax:  1000,
    vrmppt:   680,
    vmpptmin: 390,
    vmpptmax: 800,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PIKO-10-20/DB_PIKO-10-20_en.pdf',
    pac: 15000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1450, priceSrc: 'est. EU retail', eurPerKw: 97,
  },
  {
    id:       'kostal-piko-17',
    brandId:   'kostal',
    name:     'Kostal PIKO 17 (17 kW)',
    note:     'Grid-only three-phase string inverter, 3 MPPT, integrated Smart AC Switch',
    vinvmax:  1000,
    vrmppt:   680,
    vmpptmin: 440,
    vmpptmax: 800,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PIKO-10-20/DB_PIKO-10-20_en.pdf',
    pac: 17000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1650, priceSrc: 'est. EU retail', eurPerKw: 97,
  },
  {
    id:       'kostal-piko-20',
    brandId:   'kostal',
    name:     'Kostal PIKO 20 (20 kW)',
    note:     'Grid-only three-phase string inverter, 3 MPPT, integrated Smart AC Switch, largest PIKO residential model',
    vinvmax:  1000,
    vrmppt:   680,
    vmpptmin: 515,
    vmpptmax: 800,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.kostal-solar-electric.com/fileadmin/downloadcenter/kse/DB/PIKO-10-20/DB_PIKO-10-20_en.pdf',
    pac: 20000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1850, priceSrc: 'est. EU retail', eurPerKw: 93,
  },

  /* ─── VICTRON-ENERGY ───────────────────────────────────────────────── */
  {
    id:       'victron-energy-multiplus-ii-48-3000-smartsolar-mppt-150-70',
    brandId:   'victron-energy',
    name:     'Victron MultiPlus-II 48/3000 + SmartSolar MPPT 150/70 (2.4 kW)',
    note:     'Off-grid / hybrid inverter. Off-grid / hybrid. MPPT specs from SmartSolar 150/70; pac from MultiPlus-II 48/3000. 48 V battery bus.',
    vinvmax:  150,
    vrmppt:   99,
    vmpptmin: 53,
    vmpptmax: 145,
    impptmax: 70,
    iscmppt:  50,
    datasheet: 'https://www.victronenergy.com/upload/documents/Datasheet-SmartSolar-charge-controller-MPPT-150-35-to-150-100-EN.pdf',
    pac: 2400,
    nmppt: 1,   /* MPP trackers - datasheet scrape */
    priceEur: 1400, priceSrc: 'est. EU retail', eurPerKw: 583,
  },
  {
    id:       'victron-energy-multiplus-ii-48-5000-smartsolar-mppt-250-100',
    brandId:   'victron-energy',
    name:     'Victron MultiPlus-II 48/5000 + SmartSolar MPPT 250/100 (4 kW)',
    note:     'Off-grid / hybrid inverter. Off-grid / hybrid. Most popular Victron residential combo in EU/RO. MPPT specs from SmartSolar 250/100; pac from MultiPlus-II 48/5000. 48 V battery bus.',
    vinvmax:  250,
    vrmppt:   149,
    vmpptmin: 53,
    vmpptmax: 245,
    impptmax: 100,
    iscmppt:  70,
    datasheet: 'https://www.victronenergy.com/upload/documents/Datasheet-SmartSolar-charge-controller-MPPT-250-70-up-to-250-100-VE.Can-EN.pdf',
    pac: 4000,
    nmppt: 1,   /* MPP trackers - datasheet scrape */
    priceEur: 1800, priceSrc: 'est. EU retail', eurPerKw: 450,
  },
  {
    id:       'victron-energy-quattro-48-5000-smartsolar-mppt-250-100',
    brandId:   'victron-energy',
    name:     'Victron Quattro 48/5000 + SmartSolar MPPT 250/100 (4 kW)',
    note:     'Off-grid / hybrid inverter. Off-grid / hybrid with dual AC input (grid + generator). MPPT specs from SmartSolar 250/100; pac from Quattro 48/5000. 48 V battery bus.',
    vinvmax:  250,
    vrmppt:   149,
    vmpptmin: 53,
    vmpptmax: 245,
    impptmax: 100,
    iscmppt:  70,
    datasheet: 'https://www.victronenergy.com/upload/documents/Datasheet-SmartSolar-charge-controller-MPPT-250-70-up-to-250-100-VE.Can-EN.pdf',
    pac: 4000,
    nmppt: 1,   /* MPP trackers - datasheet scrape */
    priceEur: 2000, priceSrc: 'est. EU retail', eurPerKw: 500,
  },
  {
    id:       'victron-energy-quattro-48-8000-smartsolar-mppt-250-100',
    brandId:   'victron-energy',
    name:     'Victron Quattro 48/8000 + SmartSolar MPPT 250/100 (6.4 kW)',
    note:     'Off-grid / hybrid inverter. Off-grid / hybrid, larger install. MPPT specs from SmartSolar 250/100; pac from Quattro 48/8000. 48 V battery bus.',
    vinvmax:  250,
    vrmppt:   149,
    vmpptmin: 53,
    vmpptmax: 245,
    impptmax: 100,
    iscmppt:  70,
    datasheet: 'https://www.victronenergy.com/upload/documents/Datasheet-SmartSolar-charge-controller-MPPT-250-70-up-to-250-100-VE.Can-EN.pdf',
    pac: 6400,
    nmppt: 1,   /* MPP trackers - datasheet scrape */
    priceEur: 2600, priceSrc: 'est. EU retail', eurPerKw: 406,
  },
  {
    id:       'victron-energy-easysolar-ii-gx-48-5000-mppt-250-100',
    brandId:   'victron-energy',
    name:     'Victron EasySolar-II GX 48/5000 MPPT 250/100 (4 kW)',
    note:     'Off-grid / hybrid inverter. All-in-one: MultiPlus-II 48/5000 + SmartSolar MPPT 250/100 + GX display. iscmppt not published for integrated controller.',
    vinvmax:  250,
    vrmppt:   149,
    vmpptmin: 53,
    vmpptmax: 245,
    impptmax: 100,
    iscmppt:  null,
    datasheet: 'https://www.victronenergy.com/upload/documents/Datasheet-EasySolar-II-GX-EN.pdf',
    pac: 4000,
    nmppt: 1,   /* MPP trackers - datasheet scrape */
    priceEur: 1900, priceSrc: 'est. EU retail', eurPerKw: 475,
  },

  /* ─── FOXESS ───────────────────────────────────────────────── */
  {
    id:       'foxess-h1-3-7-e-g2',
    brandId:   'foxess',
    name:     'FoxESS H1-3.7 (3.7 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid, HV battery 80-480V LFP, 2 strings, EPS backup, SG Ready, G98/G99 certified',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/20251219/ENH1G2DatasheetV2.020251219.pdf',
    pac: 3680,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 950, priceSrc: 'est. EU retail', eurPerKw: 258,
  },
  {
    id:       'foxess-h1-5-0-e-g2',
    brandId:   'foxess',
    name:     'FoxESS H1-5.0 (5 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid, HV battery 80-480V LFP, 2 strings, EPS backup, SG Ready, G98/G99 certified',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/20251219/ENH1G2DatasheetV2.020251219.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1100, priceSrc: 'est. EU retail', eurPerKw: 220,
  },
  {
    id:       'foxess-h1-6-0-e-g2',
    brandId:   'foxess',
    name:     'FoxESS H1-6.0 (6 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid, HV battery 80-480V LFP, 2 strings, EPS backup, SG Ready, G98/G99 certified',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/20251219/ENH1G2DatasheetV2.020251219.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1200, priceSrc: 'est. EU retail', eurPerKw: 200,
  },
  {
    id:       'foxess-h1-3-0-e-g2',
    brandId:   'foxess',
    name:     'FoxESS H1-3.0 (3 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid, HV battery 80-480V LFP, EPS backup, G98/G99 certified',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/20251219/ENH1G2DatasheetV2.020251219.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 900, priceSrc: 'est. EU retail', eurPerKw: 300,
  },
  {
    id:       'foxess-h1-4-6-e-g2',
    brandId:   'foxess',
    name:     'FoxESS H1-4.6 (4.6 kW)',
    note:     'Single-phase hybrid (battery-ready). Single-phase hybrid, HV battery 80-480V LFP, EPS backup, G98/G99 certified',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 16,
    iscmppt:  20,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/20251219/ENH1G2DatasheetV2.020251219.pdf',
    pac: 4600,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1050, priceSrc: 'est. EU retail', eurPerKw: 228,
  },
  {
    id:       'foxess-h3-6-0-smart',
    brandId:   'foxess',
    name:     'FoxESS H3-6.0 Smart (6 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery 100-800V LFP, 3x MPPT 1+1+1 strings, EPS backup, EN50549',
    vinvmax:  1000,
    vrmppt:   620,
    vmpptmin: 120,
    vmpptmax: 950,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-H3-Smart-Datasheet-V1.9-20250411.pdf',
    pac: 6000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1500, priceSrc: 'est. EU retail', eurPerKw: 250,
  },
  {
    id:       'foxess-h3-8-0-smart',
    brandId:   'foxess',
    name:     'FoxESS H3-8.0 Smart (8 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery 100-800V LFP, 3x MPPT 1+1+1 strings, EPS backup, EN50549',
    vinvmax:  1000,
    vrmppt:   620,
    vmpptmin: 120,
    vmpptmax: 950,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-H3-Smart-Datasheet-V1.9-20250411.pdf',
    pac: 8000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1650, priceSrc: 'est. EU retail', eurPerKw: 206,
  },
  {
    id:       'foxess-h3-10-0-smart',
    brandId:   'foxess',
    name:     'FoxESS H3-10.0 Smart (10 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery 100-800V LFP, 3x MPPT 1+1+1 strings, EPS backup, EN50549',
    vinvmax:  1000,
    vrmppt:   620,
    vmpptmin: 120,
    vmpptmax: 950,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-H3-Smart-Datasheet-V1.9-20250411.pdf',
    pac: 10000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1800, priceSrc: 'zepto-solar.de', eurPerKw: 180,
  },
  {
    id:       'foxess-h3-12-0-smart',
    brandId:   'foxess',
    name:     'FoxESS H3-12.0 Smart (12 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery 100-800V LFP, fan cooling from 12kW, EN50549',
    vinvmax:  1000,
    vrmppt:   620,
    vmpptmin: 120,
    vmpptmax: 950,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-H3-Smart-Datasheet-V1.9-20250411.pdf',
    pac: 12000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1949, priceSrc: 'solarscouts.de', eurPerKw: 162,
  },
  {
    id:       'foxess-h3-5-0-smart',
    brandId:   'foxess',
    name:     'FoxESS H3-5.0 Smart (5 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery 100-800V LFP, 3x MPPT, EPS backup',
    vinvmax:  1000,
    vrmppt:   620,
    vmpptmin: 120,
    vmpptmax: 950,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-H3-Smart-Datasheet-V1.9-20250411.pdf',
    pac: 5000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 1400, priceSrc: 'est. EU retail', eurPerKw: 280,
  },
  {
    id:       'foxess-h3-15-0-smart',
    brandId:   'foxess',
    name:     'FoxESS H3-15.0 Smart (15 kW)',
    note:     'Three-phase hybrid (battery-ready). Three-phase hybrid, HV battery 100-800V LFP, fan cooling, EN50549',
    vinvmax:  1000,
    vrmppt:   620,
    vmpptmin: 120,
    vmpptmax: 950,
    impptmax: 20,
    iscmppt:  25,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-H3-Smart-Datasheet-V1.9-20250411.pdf',
    pac: 15000,
    nmppt: 3,   /* MPP trackers - datasheet scrape */
    priceEur: 2100, priceSrc: 'est. EU retail', eurPerKw: 140,
  },
  {
    id:       'foxess-t5-g3',
    brandId:   'foxess',
    name:     'FoxESS T5-G3 (5 kW)',
    note:     'Three-phase grid-tied, 2x MPPT 1+1 strings, natural convection, LCD display, EN50549-1',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 14,
    iscmppt:  18.2,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-T(G3)-datasheet-V2.5-20250711.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 450, priceSrc: 'est. EU retail', eurPerKw: 90,
  },
  {
    id:       'foxess-t6-g3',
    brandId:   'foxess',
    name:     'FoxESS T6-G3 (6 kW)',
    note:     'Three-phase grid-tied, 2x MPPT 1+1 strings, natural convection, EN50549-1, VDE-AR-N4105',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 14,
    iscmppt:  18.2,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-T(G3)-datasheet-V2.5-20250711.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 480, priceSrc: 'est. EU retail', eurPerKw: 80,
  },
  {
    id:       'foxess-t8-g3',
    brandId:   'foxess',
    name:     'FoxESS T8-G3 (8 kW)',
    note:     'Three-phase grid-tied, 2x MPPT 1+1 strings, natural convection, EN50549-1',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 14,
    iscmppt:  18.2,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-T(G3)-datasheet-V2.5-20250711.pdf',
    pac: 8000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 520, priceSrc: 'est. EU retail', eurPerKw: 65,
  },
  {
    id:       'foxess-t10-g3',
    brandId:   'foxess',
    name:     'FoxESS T10-G3 (10 kW)',
    note:     'Three-phase grid-tied, 2x MPPT 1+1 strings, natural convection, EN50549-1',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 14,
    iscmppt:  18.2,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-T(G3)-datasheet-V2.5-20250711.pdf',
    pac: 10000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 549, priceSrc: 'Geizhals DE', eurPerKw: 55,
  },
  {
    id:       'foxess-t12-g3',
    brandId:   'foxess',
    name:     'FoxESS T12-G3 (12 kW)',
    note:     'Three-phase grid-tied, 2x MPPT 1+1 strings, natural convection, EN50549-1',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 14,
    iscmppt:  18.2,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-T(G3)-datasheet-V2.5-20250711.pdf',
    pac: 12000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 650, priceSrc: 'est. EU retail', eurPerKw: 54,
  },
  {
    id:       'foxess-t15-g3',
    brandId:   'foxess',
    name:     'FoxESS T15-G3 (15 kW)',
    note:     'Three-phase grid-tied, 2x MPPT 2+2 strings, fan cooling, EN50549-1, VDE-AR-N4105',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 28,
    iscmppt:  36.4,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-T(G3)-datasheet-V2.5-20250711.pdf',
    pac: 15000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 780, priceSrc: 'est. EU retail', eurPerKw: 52,
  },
  {
    id:       'foxess-t20-g3',
    brandId:   'foxess',
    name:     'FoxESS T20-G3 (20 kW)',
    note:     'Three-phase grid-tied, 2x MPPT 2+2 strings, fan cooling, EN50549-1',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 28,
    iscmppt:  36.4,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-T(G3)-datasheet-V2.5-20250711.pdf',
    pac: 20000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1050, priceSrc: 'est. EU retail', eurPerKw: 53,
  },
  {
    id:       'foxess-t25-g3',
    brandId:   'foxess',
    name:     'FoxESS T25-G3 (25 kW)',
    note:     'Three-phase grid-tied, 2x MPPT 2+2 strings, fan cooling, EN50549-1',
    vinvmax:  1100,
    vrmppt:   600,
    vmpptmin: 140,
    vmpptmax: 1000,
    impptmax: 28,
    iscmppt:  36.4,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-T(G3)-datasheet-V2.5-20250711.pdf',
    pac: 25000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 1300, priceSrc: 'est. EU retail', eurPerKw: 52,
  },
  {
    id:       'foxess-f3000-g2',
    brandId:   'foxess',
    name:     'FoxESS F3000-G2 (3 kW)',
    note:     'Single-phase grid-tied, 2x MPPT 1 string each, natural convection, EN/IEC 62109, CEI 0-21',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 14,
    iscmppt:  18,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-F(G2)-Datasheet-V1.9-20250610.pdf',
    pac: 3000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 400, priceSrc: 'est. EU retail', eurPerKw: 133,
  },
  {
    id:       'foxess-f4600-g2',
    brandId:   'foxess',
    name:     'FoxESS F4600-G2 (4.6 kW)',
    note:     'Single-phase grid-tied, 2x MPPT 1 string each, natural convection, EN/IEC 62109',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 14,
    iscmppt:  18,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-F(G2)-Datasheet-V1.9-20250610.pdf',
    pac: 4600,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 480, priceSrc: 'est. EU retail', eurPerKw: 104,
  },
  {
    id:       'foxess-f5000-g2',
    brandId:   'foxess',
    name:     'FoxESS F5000-G2 (5 kW)',
    note:     'Single-phase grid-tied, 2x MPPT 1 string each, natural convection, EN/IEC 62109',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 14,
    iscmppt:  18,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-F(G2)-Datasheet-V1.9-20250610.pdf',
    pac: 5000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 520, priceSrc: 'est. EU retail', eurPerKw: 104,
  },
  {
    id:       'foxess-f6000-g2',
    brandId:   'foxess',
    name:     'FoxESS F6000-G2 (6 kW)',
    note:     'Single-phase grid-tied, 2x MPPT 1 string each, natural convection, EN/IEC 62109',
    vinvmax:  600,
    vrmppt:   360,
    vmpptmin: 80,
    vmpptmax: 550,
    impptmax: 14,
    iscmppt:  18,
    datasheet: 'https://www.fox-ess.com/Public/Uploads/uploadfile/files/Download/EN-F(G2)-Datasheet-V1.9-20250610.pdf',
    pac: 6000,
    nmppt: 2,   /* MPP trackers - datasheet scrape */
    priceEur: 580, priceSrc: 'est. EU retail', eurPerKw: 97,
  },

  /* ─── HOYMILES ───────────────────────────────────────────────── */
  {
    id:       'hoymiles-hm-300',
    brandId:   'hoymiles',
    name:     'Hoymiles HM-300 (0.3 kW)',
    note:     'Micro-inverter - one unit per module. 1-in-1 legacy generation; superseded by HMS-1T series; 2.4 GHz RF comms; EN 50549-1/VDE-AR-N 4105',
    type:     'micro',
    vinvmax:  60,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 11.5,
    iscmppt:  15,
    datasheet: 'https://www.offgridtec.com/media/product_attachements/Datasheet%20-%20HM-300-350-400%20-%20EN.pdf',
    pac: 300,
    nmppt: 1,   ndc: 1,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 70, priceSrc: 'est. EU retail', eurPerKw: 233,
  },
  {
    id:       'hoymiles-hm-400',
    brandId:   'hoymiles',
    name:     'Hoymiles HM-400 (0.4 kW)',
    note:     'Micro-inverter - one unit per module. 1-in-1 legacy generation; superseded by HMS-1T series; 2.4 GHz RF comms; EN 50549-1/VDE-AR-N 4105',
    type:     'micro',
    vinvmax:  60,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 12.5,
    iscmppt:  15,
    datasheet: 'https://www.offgridtec.com/media/product_attachements/Datasheet%20-%20HM-300-350-400%20-%20EN.pdf',
    pac: 400,
    nmppt: 1,   ndc: 1,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 80, priceSrc: 'est. EU retail', eurPerKw: 200,
  },
  {
    id:       'hoymiles-hm-600',
    brandId:   'hoymiles',
    name:     'Hoymiles HM-600 (0.6 kW)',
    note:     'Micro-inverter - one unit per module. 2-in-1 legacy; peak MPPT 29-48 V; 2.4 GHz RF; superseded by HMS-2T; EN 50549-1/VDE-AR-N 4105',
    type:     'micro',
    vinvmax:  60,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 11.5,
    iscmppt:  15,
    datasheet: 'https://vendomnia.com/media/pdf/e6/e0/b6/Datasheet_HM-600-700-800.pdf',
    pac: 600,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 100, priceSrc: 'est. EU retail', eurPerKw: 167,
  },
  {
    id:       'hoymiles-hm-800',
    brandId:   'hoymiles',
    name:     'Hoymiles HM-800 (0.8 kW)',
    note:     'Micro-inverter - one unit per module. 2-in-1 legacy; peak MPPT 34-48 V; 2.4 GHz RF; superseded by HMS-800-2T; EN 50549-1/VDE-AR-N 4105',
    type:     'micro',
    vinvmax:  60,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 12.5,
    iscmppt:  15,
    datasheet: 'https://vendomnia.com/media/pdf/e6/e0/b6/Datasheet_HM-600-700-800.pdf',
    pac: 800,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 110, priceSrc: 'est. EU retail', eurPerKw: 138,
  },
  {
    id:       'hoymiles-hm-1200',
    brandId:   'hoymiles',
    name:     'Hoymiles HM-1200 (1.2 kW)',
    note:     'Micro-inverter - one unit per module. 4-in-1 legacy; peak MPPT 29-48 V; 2.4 GHz RF; EN 50549-1/VDE-AR-N 4105; Isc not listed in datasheet',
    type:     'micro',
    vinvmax:  60,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 11.5,
    iscmppt:  null,
    datasheet: 'https://insidersystem.co.th/wp-content/uploads/2022/05/Datasheet_HM-12001500_EN_ASAF_202110.pdf',
    pac: 1200,
    nmppt: 4,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 150, priceSrc: 'est. EU retail', eurPerKw: 125,
  },
  {
    id:       'hoymiles-hm-1500',
    brandId:   'hoymiles',
    name:     'Hoymiles HM-1500 (1.5 kW)',
    note:     'Micro-inverter - one unit per module. 4-in-1 legacy; peak MPPT 36-48 V; 2.4 GHz RF; EN 50549-1/VDE-AR-N 4105; Isc not listed in datasheet',
    type:     'micro',
    vinvmax:  60,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 11.5,
    iscmppt:  null,
    datasheet: 'https://insidersystem.co.th/wp-content/uploads/2022/05/Datasheet_HM-12001500_EN_ASAF_202110.pdf',
    pac: 1500,
    nmppt: 4,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 180, priceSrc: 'est. EU retail', eurPerKw: 120,
  },
  {
    id:       'hoymiles-hms-400w-1t',
    brandId:   'hoymiles',
    name:     'Hoymiles HMS-400-1T (0.4 kW)',
    note:     'Micro-inverter - one unit per module. 1-in-1 current gen; built-in Wi-Fi; Schuko plug-and-play cable optional; EN 50549-1/VDE-AR-N 4105',
    type:     'micro',
    vinvmax:  65,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 14,
    iscmppt:  25,
    datasheet: 'https://www.eet.energy/app/uploads/2024/10/Hoymiles-Datenblatt-HMS-400W-1T-EN.pdf',
    pac: 400,
    nmppt: 1,   ndc: 1,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 80, priceSrc: 'est. EU retail', eurPerKw: 200,
  },
  {
    id:       'hoymiles-hms-800-2t',
    brandId:   'hoymiles',
    name:     'Hoymiles HMS-800-2T (0.8 kW)',
    note:     'Micro-inverter - one unit per module. 2-in-1 current gen; Sub-1G RF; isolated HF transformer; EN 50549-1/VDE-AR-N 4105/VFR2019',
    type:     'micro',
    vinvmax:  65,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 14,
    iscmppt:  25,
    datasheet: 'https://d4o2fvgnpv65m.cloudfront.net/media-library/product/2637/Datasheet_HMS-600&700&800&900&1000_EU_EN_V202302',
    pac: 800,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 94, priceSrc: 'Geizhals DE', eurPerKw: 118,
  },
  {
    id:       'hoymiles-hms-1000-2t',
    brandId:   'hoymiles',
    name:     'Hoymiles HMS-1000-2T (1 kW)',
    note:     'Micro-inverter - one unit per module. 2-in-1 current gen; Sub-1G RF; highest-output 2T; EN 50549-1/VDE-AR-N 4105/VFR2019',
    type:     'micro',
    vinvmax:  65,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 16,
    iscmppt:  25,
    datasheet: 'https://d4o2fvgnpv65m.cloudfront.net/media-library/product/2637/Datasheet_HMS-600&700&800&900&1000_EU_EN_V202302',
    pac: 1000,
    nmppt: 2,   ndc: 2,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 130, priceSrc: 'est. EU retail', eurPerKw: 130,
  },
  {
    id:       'hoymiles-hms-2000-4t',
    brandId:   'hoymiles',
    name:     'Hoymiles HMS-2000-4T (2 kW)',
    note:     'Micro-inverter - one unit per module. 4-in-1 single-phase current gen; Sub-1G RF; EN 50549-1/VDE-AR-N 4105/VFR2019',
    type:     'micro',
    vinvmax:  65,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 16,
    iscmppt:  25,
    datasheet: 'https://d4o2fvgnpv65m.cloudfront.net/media-library/product/2638/Datasheet_HMS-1600&1800&2000_EU_EN_V202301',
    pac: 2000,
    nmppt: 4,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 205, priceSrc: 'Geizhals DE', eurPerKw: 103,
  },
  {
    id:       'hoymiles-hmt-1800-4t',
    brandId:   'hoymiles',
    name:     'Hoymiles HMT-1800-4T (1.8 kW)',
    note:     'Micro-inverter - one unit per module. 4-in-1 three-phase micro; 230/400 V 3W+N+PE; 2 MPPT x 2 inputs each; Sub-1G; EN 50549-1/VDE-AR-N 4105 Three-phase aggregator (4 micro-inverter inputs); still 1:1 module topology.',
    type:     'micro',
    vinvmax:  65,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 15,
    iscmppt:  25,
    datasheet: 'https://d4o2fvgnpv65m.cloudfront.net/media-library/product/2661/Datasheet_HMT-1600&1800&2000_EMEA&APAC_EN_V202308',
    pac: 1800,
    nmppt: 4,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 200, priceSrc: 'est. EU retail', eurPerKw: 111,
  },
  {
    id:       'hoymiles-hmt-2000-4t',
    brandId:   'hoymiles',
    name:     'Hoymiles HMT-2000-4T (2 kW)',
    note:     'Micro-inverter - one unit per module. 4-in-1 three-phase micro; 230/400 V 3W+N+PE; 2 MPPT x 2 inputs each; Sub-1G; EN 50549-1/VDE-AR-N 4105 Three-phase aggregator (4 micro-inverter inputs); still 1:1 module topology.',
    type:     'micro',
    vinvmax:  65,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 16,
    iscmppt:  25,
    datasheet: 'https://d4o2fvgnpv65m.cloudfront.net/media-library/product/2661/Datasheet_HMT-1600&1800&2000_EMEA&APAC_EN_V202308',
    pac: 2000,
    nmppt: 4,   ndc: 4,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 220, priceSrc: 'est. EU retail', eurPerKw: 110,
  },

  /* ─── ENPHASE ───────────────────────────────────────────────── */
  {
    id:       'enphase-iq8mc',
    brandId:   'enphase',
    name:     'Enphase IQ8MC (0.3 kW)',
    note:     'Micro-inverter - one unit per module. 60-cell module optimised; Envoy/IQ Gateway required; Ensemble off-grid capable; CE/EN 50549; split-phase 240V AC or EU 230V single-phase',
    type:     'micro',
    vinvmax:  48,
    vrmppt:   27,
    vmpptmin: 16,
    vmpptmax: 48,
    impptmax: 14,
    iscmppt:  18,
    datasheet: 'https://enphase.com/download/iq8mc-microinverter-datasheet',
    pac: 330,
    nmppt: 1,   ndc: 1,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 150, priceSrc: 'est. EU retail', eurPerKw: 455,
  },
  {
    id:       'enphase-iq8ac',
    brandId:   'enphase',
    name:     'Enphase IQ8AC (0.4 kW)',
    note:     'Micro-inverter - one unit per module. 72-cell / 60-cell high-power module; Envoy/IQ Gateway required; Ensemble off-grid capable; CE/EN 50549',
    type:     'micro',
    vinvmax:  58,
    vrmppt:   27,
    vmpptmin: 16,
    vmpptmax: 58,
    impptmax: 15,
    iscmppt:  20,
    datasheet: 'https://enphase.com/download/iq8ac-microinverter-datasheet',
    pac: 366,
    nmppt: 1,   ndc: 1,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 160, priceSrc: 'est. EU retail', eurPerKw: 437,
  },
  {
    id:       'enphase-iq8hc',
    brandId:   'enphase',
    name:     'Enphase IQ8HC (0.4 kW)',
    note:     'Micro-inverter - one unit per module. High-current input for large-format modules (≥400 Wp); 20 A DC ISC; Envoy/IQ Gateway required; CE/EN 50549',
    type:     'micro',
    vinvmax:  58,
    vrmppt:   35,
    vmpptmin: 16,
    vmpptmax: 58,
    impptmax: 15,
    iscmppt:  20,
    datasheet: 'https://enphase.com/download/iq8hc-microinverter-datasheet',
    pac: 384,
    nmppt: 1,   ndc: 1,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 170, priceSrc: 'est. EU retail', eurPerKw: 443,
  },
  {
    id:       'enphase-iq8p',
    brandId:   'enphase',
    name:     'Enphase IQ8P (0.5 kW)',
    note:     'Micro-inverter - one unit per module. Highest-output IQ8 EU variant (480 W AC); for premium bifacial modules; Envoy/IQ Gateway required; CE/EN 50549; less common than HC in EU residential',
    type:     'micro',
    vinvmax:  60,
    vrmppt:   38,
    vmpptmin: 16,
    vmpptmax: 60,
    impptmax: 15,
    iscmppt:  20,
    datasheet: 'https://enphase.com/download/iq8p-microinverter-datasheet',
    pac: 480,
    nmppt: 1,   ndc: 1,   /* MPP trackers / total DC string inputs - datasheet scrape */
    priceEur: 200, priceSrc: 'est. EU retail', eurPerKw: 417,
  },
];

/* Battery registry (BATTERY_BRANDS + BATTERY_LIST) moved to js/battery-list.js
   (loaded BEFORE string-ui.js) - see that file for the schema. */

function populateInverterSelect() {
  const sel = document.getElementById('ss-inverter');
  if (!sel) return;
  /* Group by brand using INVERTER_BRANDS order */
  INVERTER_BRANDS.forEach(brand => {
    const models = INVERTER_LIST.filter(inv => inv.brandId === brand.id);
    if (!models.length) return;
    const grp = document.createElement('optgroup');
    grp.label = brand.name;
    models.forEach(inv => {
      const opt = document.createElement('option');
      opt.value       = inv.id;
      opt.textContent = inv.name;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });
}

function loadInverterTemplate(id) {
  if (!id) return;
  const inv = INVERTER_LIST.find(i => i.id === id);
  if (!inv) return;

  document.getElementById('ss-vinvmax').value  = inv.vinvmax;
  document.getElementById('ss-vrmppt').value   = inv.vrmppt;
  document.getElementById('ss-vmpptmin').value = inv.vmpptmin;
  document.getElementById('ss-vmpptmax').value = inv.vmpptmax;
  document.getElementById('ss-impptmax').value = inv.impptmax;
  document.getElementById('ss-iscmppt').value  = inv.iscmppt;

  const noteEl = document.getElementById('ss-inverter-note');
  if (noteEl) {
    var noteHtml = inv.note ? inv.note.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    if (inv.datasheet) {
      noteHtml += (noteHtml ? ' ' : '') +
        '<a href="' + inv.datasheet + '" target="_blank" rel="noopener" style="color:var(--link)">' +
        '&#128196; Datasheet</a>';
    }
    noteEl.innerHTML = noteHtml;
  }

  /* Micro-inverter: §11 string sizing doesn't apply - show the note in the results area now. */
  if (inv.type === 'micro') showMicroNote();
}

/* ── Module brand registry ───────────────────────────────────────────────────
   Top-15 PV module manufacturers - cross-referenced: PV*SOL DB × EU market × RO stores.
   id  : kebab-case key referenced by MODULE_LIST[].brandId
   name: display name */

/* ── Module brand registry ───────────────────────────────────────────────────
   Top-15 PV module manufacturers - cross-referenced: PV*SOL DB × EU market × RO stores.
   id       : kebab-case key referenced by MODULE_LIST[].brandId
   name     : display name
   highlight: one-liner shown when this brand is selected in the UI */

const MODULE_BRANDS = [
  { id: 'jinko-solar',    name: 'Jinko Solar',            highlight: 'Tiger Neo N-type - most installed in RO' },
  { id: 'ja-solar',       name: 'JA Solar',               highlight: '368 models in PV*SOL, huge EU distribution' },
  { id: 'longi-solar',    name: 'LONGi Solar',            highlight: 'Hi-MO 6/7, fastest growing Tier-1' },
  { id: 'trina-solar',    name: 'Trina Solar',            highlight: 'Vertex S+ NEG9' },
  { id: 'canadian-solar', name: 'Canadian Solar',         highlight: '799 models in PV*SOL - widest DB coverage' },
  { id: 'hanwha-qcells',  name: 'Hanwha Q.CELLS',         highlight: 'Premium, German HQ, 25yr warranty' },
  { id: 'risen-energy',   name: 'Risen Energy',           highlight: 'Common in CEE/RO residential' },
  { id: 'aiko',           name: 'Aiko',                   highlight: 'ABC back-contact N-type, >24% eff.' },
  { id: 'solarwatt',      name: 'SOLARWATT',              highlight: 'DE #1 premium, 30yr glass-glass' },
  { id: 'axitec',         name: 'AXITEC',                 highlight: 'German, strong HU/BG/RO network' },
  { id: 'astronergy',     name: 'ASTROnergy (Chint)',     highlight: 'Chint Group, budget N-type, active RO/CEE' },
  { id: 'ae-solar',       name: 'AE Solar',               highlight: 'Meteor TOPCon, 353 installs in RO market' },
  { id: 'futurasun',      name: 'FuturaSun',              highlight: 'Italian, strong in IT/RO/FR' },
  { id: 'dah-solar',      name: 'DAH Solar',              highlight: 'Full-screen bifacial, growing RO' },
  { id: 'huasun',         name: 'Huasun',                 highlight: 'HJT Himalaya >23% - not in PV*SOL DB' },
  { id: 'ege',            name: 'Eco Green Energy (EGE)', highlight: 'French HJT manufacturer, active EU distribution' },
];

/* ── Module template registry ──────────────────────────────────────────────
   To add a module: copy an existing entry, fill in the datasheet values, append to the array.

   Fields:
     id        : unique kebab-case string (used as <option value>)
     brandId   : matches a MODULE_BRANDS[].id (null for brands not in the top-15 list)
     name      : display name shown in the dropdown
     note      : one-line description shown below the dropdown after selection
     voc       : Open-circuit voltage at STC (V)
     vmp       : MPP voltage at STC (V)
     isc       : Short-circuit current at STC (A)
     imp       : MPP current at STC (A)
     lv        : Voc temperature coefficient (%/°C) - typically negative
     li        : Isc temperature coefficient (%/°C) - typically small positive
     nmot      : Nominal Module Operating Temperature (°C)
                 (NMOT/NOCT - measured at 800 W/m², 20°C ambient, 1 m/s wind)
     pmax      : nominal max power Pmax at STC (W)
     length, width : physical module dimensions (mm) - used by mounting/placement
     gamma     : Pmpp temperature coefficient (%/°C, negative) - per-module power derating
     efficiency: datasheet STC module efficiency (%) - shown verbatim on modules.html (else computed from area)
     datasheet : official datasheet PDF URL (shown + linked on modules.html)
     priceEur/priceSrc/eurPerWp : INDICATIVE panel price = round(pmax × brand EUR/Wp) + its source + the
                per-brand EUR/Wp rate (the modules.html €/Wp value-sort key). Panels price by €/Wp tier, so a
                brand-level rate is applied to every model (Jinko ~0.10 RO-anchored, Aiko ABC ~0.17 UK-anchored,
                SolarWatt glass-glass ~0.28; rest tier estimates - `est.` in priceSrc). Volatile; verify at purchase. */

const MODULE_LIST = [
  /* ─── JINKO SOLAR ─── */
  {
    id:      'jinko-solar-jkm640n-66hl4m-bdv',
    brandId:  'jinko-solar',
    name:    'JinkoSolar Tiger Neo JKM640N-66HL4M-BDV (640 W)',
    note:    'N-type TOPCon mono-Si bifacial dual-glass, 132 half-cells (66×2), 23.69% eff, 2382×1134×30 mm, 32.4 kg, 1500V max. NMOT 45°C. Source: comparepv.com / JKM625-650N-66HL4M-BDV-Z1-EU datasheet.',
    voc:  49.88,
    vmp:  41.3,
    isc:  16.32,
    imp:  15.5,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 640, length: 2382, width: 1134,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23.69,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     32.4,   /* kg */
    datasheet: 'https://jinkosolar.eu/wp-content/uploads/2024/10/JKM625-650N-66HL4M-BDV-Z1-EU.pdf',
    cpv: 1,
  },
  {
    id:      'jinko-solar-jkm455n-48hl4m-dv',
    brandId:  'jinko-solar',
    name:    'JinkoSolar Tiger Neo JKM455N-48HL4M-DV (455 W)',
    note:    'N-type TOPCon mono-Si, 96 cells (48×2), 22.77% eff, 1762×1134×30 mm, 24.0 kg, IP68, 1500V max. NMOT 45±2°C. Source: JKM450-475N-48HL4M-DV-Z2-EU datasheet.',
    voc:  36.05,
    vmp:  30.28,
    isc:  15.88,
    imp:  15.03,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 455, length: 1762, width: 1134,
    priceEur: 46, priceSrc: 'RO retail (~205 lei/440W)', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.77,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24,   /* kg */
    datasheet: 'https://jinkosolar.eu/wp-content/uploads/2025/01/JKM450-475N-48HL4M-DV-Z2-EU.pdf',
  },
  {
    id:      'jinko-solar-jkm425n-54hl4-b',
    brandId:  'jinko-solar',
    name:    'JinkoSolar Tiger Neo JKM425N-54HL4-B All-Black (425 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: high). 108 half-cells, 1000V, all-black frame (Eagle G6R variant).',
    voc:  38.95,
    vmp:  32.37,
    isc:  13.58,
    imp:  13.13,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 425, length: 1722, width: 1134,
    priceEur: 43, priceSrc: 'RO retail (~205 lei/440W)', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.76,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://jinkosolarcdn.shwebspace.com/uploads/639a8f70/JKM410-430N-54HL4-(V)-F3-EN.pdf',
    cpv: 1,
  },
  {
    id:      'jinko-solar-jkm430n-54hl4',
    brandId:  'jinko-solar',
    name:    'JinkoSolar Tiger Neo JKM430N-54HL4 (430 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: high). 108 half-cells, 1000V, silver frame.',
    voc:  38.49,
    vmp:  31.88,
    isc:  14.23,
    imp:  13.49,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 43, priceSrc: 'RO retail (~205 lei/440W)', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.02,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://jinkosolarcdn.shwebspace.com/uploads/639a8f70/JKM410-430N-54HL4-(V)-F3-EN.pdf',
    cpv: 1,
  },
  {
    id:      'jinko-solar-jkm440n-54hl4-b',
    brandId:  'jinko-solar',
    name:    'JinkoSolar Tiger Neo JKM440N-54HL4-B All-Black (440 W)',
    note:    '108 half-cells, Eagle 54 G6R all-black, 1000V.',
    voc:  39.57,
    vmp:  32.99,
    isc:  13.8,
    imp:  13.34,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 44, priceSrc: 'RO retail (~205 lei/440W)', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.02,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://jinkosolar.us/wp-content/uploads/2023/08/EAGLE-54-G6R-JKM420-440N-54HL4-B-F2-US-2.pdf',
    cpv: 1,
  },
  {
    id:      'jinko-solar-jkm450n-54hl4r-v',
    brandId:  'jinko-solar',
    name:    'JinkoSolar Tiger Neo JKM450N-54HL4R-V (450 W)',
    note:    '108 half-cells, HOT 2.0 technology, EU variant (1762×1134mm), 1000V.',
    voc:  39.97,
    vmp:  33.21,
    isc:  13.86,
    imp:  13.55,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 450, length: 1762, width: 1134,
    priceEur: 45, priceSrc: 'RO retail (~205 lei/440W)', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.52,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://jinkosolar.eu/wp-content/uploads/JKM425-450N-54HL4R-V-F2C1-EN-BF-2.pdf',
    cpv: 1,
  },
  {
    id:      'jinko-solar-jkm460n-54hl4r-v',
    brandId:  'jinko-solar',
    name:    'JinkoSolar Tiger Neo JKM460N-54HL4R-(V) (460 W)',
    note:    '108 half-cells, 1762x1134x30 mm, 1000V/1500V, silver or black frame variants. Source: comparepv.com.',
    voc:  40.17,
    vmp:  33.6,
    isc:  14.14,
    imp:  13.69,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 460, length: 1762, width: 1134,
    priceEur: 46, priceSrc: 'RO retail (~205 lei/440W)', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23.02,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/JKM435-460N-54HL4R-V-F8-EN-9ffe21749d5b.pdf',
    cpv: 1,
  },
  /* ─── JA SOLAR ─── */
  {
    id:      'ja-solar-jam54d41-430-lb',
    brandId:  'ja-solar',
    name:    'JA Solar JAM54D41-430/LB (430 W)',
    note:    'Bifacial double-glass 1.6/1.6mm; bifaciality 80%±10%; full-black frame; 108 half-cells 182mm Bycium+; 25yr product / 30yr linear warranty.',
    voc:  38.5,
    vmp:  32.12,
    isc:  14.14,
    imp:  13.39,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 430, length: 1762, width: 1134,
    priceEur: 43, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://portal.segensolar.de/reseller/docs/JAM54D41%20430-455%20LB%20Global_EN_20250303A.pdf',
    cpv: 1,
  },
  {
    id:      'ja-solar-jam54d41-435-lb',
    brandId:  'ja-solar',
    name:    'JA Solar JAM54D41-435/LB (435 W)',
    note:    'Bifacial double-glass; full-black frame.',
    voc:  38.7,
    vmp:  32.29,
    isc:  14.23,
    imp:  13.47,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 435, length: 1762, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://portal.segensolar.de/reseller/docs/JAM54D41%20430-455%20LB%20Global_EN_20250303A.pdf',
    cpv: 1,
  },
  {
    id:      'ja-solar-jam54d41-440-lb',
    brandId:  'ja-solar',
    name:    'JA Solar JAM54D41-440/LB (440 W)',
    note:    'Bifacial double-glass; full-black frame.',
    voc:  38.9,
    vmp:  32.47,
    isc:  14.31,
    imp:  13.55,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 440, length: 1762, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://portal.segensolar.de/reseller/docs/JAM54D41%20430-455%20LB%20Global_EN_20250303A.pdf',
    cpv: 1,
  },
  {
    id:      'ja-solar-jam54d41-445-lb',
    brandId:  'ja-solar',
    name:    'JA Solar JAM54D41-445/LB (445 W)',
    note:    'Bifacial double-glass; full-black frame.',
    voc:  39.1,
    vmp:  32.65,
    isc:  14.4,
    imp:  13.63,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 445, length: 1762, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://portal.segensolar.de/reseller/docs/JAM54D41%20430-455%20LB%20Global_EN_20250303A.pdf',
    cpv: 1,
  },
  {
    id:      'ja-solar-jam54d41-450-lb',
    brandId:  'ja-solar',
    name:    'JA Solar JAM54D41-450/LB (450 W)',
    note:    'Bifacial double-glass; full-black frame. ⚠ Voc=40.30V — unusually large +1.2V jump vs 445W (39.10V); verify against datasheet (possible different cell pitch at top of range).',
    voc:  40.3,
    vmp:  32.99,
    isc:  14.41,
    imp:  13.64,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 450, length: 1762, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://portal.segensolar.de/reseller/docs/JAM54D41%20430-455%20LB%20Global_EN_20250303A.pdf',
    cpv: 1,
  },
  {
    id:      'ja-solar-jat54s40-485-lr',
    brandId:  'ja-solar',
    name:    'JA Solar JAT54S40-485/LR (485 W)',
    note:    '108 half-cells, ultra-light 19.3 kg, 1762x1134mm. Source: comparepv.com.',
    voc:  41.17,
    vmp:  35.13,
    isc:  15.02,
    imp:  13.81,
    lv:   -0.22,
    li:    0.05,
    nmot:  44,
    pmax: 485, length: 1762, width: 1134,
    priceEur: 49, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 24.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     19.3,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/284b8300e8d933e-22f6664dd59e.pdf',
    cpv: 1,
  },
  {
    id:      'ja-solar-jat54s40-480-lr',
    brandId:  'ja-solar',
    name:    'JA Solar JAT54S40-480/LR (480 W)',
    note:    '108 half-cells, ultra-light 19.3 kg, 1762x1134mm. Source: comparepv.com.',
    voc:  41.1,
    vmp:  35,
    isc:  14.96,
    imp:  13.72,
    lv:   -0.22,
    li:    0.05,
    nmot:  44,
    pmax: 480, length: 1762, width: 1134,
    priceEur: 48, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 24,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     19.3,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/284b8300e8d933e-22f6664dd59e.pdf',
    cpv: 1,
  },
  {
    id:      'ja-solar-jam54d40-475-lr',
    brandId:  'ja-solar',
    name:    'JA Solar JAM54D40-475/LR (475 W)',
    note:    '108 half-cells, 1762x1134mm, glass-foil frame. Source: comparepv.com.',
    voc:  40.55,
    vmp:  34.18,
    isc:  14.67,
    imp:  13.9,
    lv:   -0.25,
    li:    0.045,
    nmot:  44,
    pmax: 475, length: 1762, width: 1134,
    priceEur: 48, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/cf64c1ba049abeb-b2830a444ff5.pdf',
    cpv: 1,
  },
  /* ─── LONGI SOLAR ─── */
  {
    id:      'longi-lr5-54hth-415m',
    brandId:  'longi-solar',
    name:    'LONGi Hi-MO 6 LR5-54HTH-415M (415 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: high). Hi-MO 6 Explorer. HPBC cell (lv=-0.23%/°C, better than TOPCon). Single glass 3.2mm. 108 cells (6×18) 182mm. 25yr product / 25yr linear power. 1.5%yr1 then 0.4%/yr.',
    voc:  38.53,
    vmp:  32.24,
    isc:  13.92,
    imp:  12.88,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.23,
    li:    0.05,
    nmot:  45,
    pmax: 415, length: 1722, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.3,   /* datasheet STC module efficiency % */
    cellType:   'HPBC',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.zonpiek.nl/wp-content/uploads/2023/10/Longi-Solar-lr5-54hth-415-435m.pdf',
    cpv: 1,
  },
  {
    id:      'longi-lr5-54hth-425m',
    brandId:  'longi-solar',
    name:    'LONGi Hi-MO 6 LR5-54HTH-425M (425 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: high). Hi-MO 6 Explorer. HPBC cell.',
    voc:  38.93,
    vmp:  32.64,
    isc:  14.07,
    imp:  13.03,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.23,
    li:    0.05,
    nmot:  45,
    pmax: 425, length: 1722, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.8,   /* datasheet STC module efficiency % */
    cellType:   'HPBC',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.zonpiek.nl/wp-content/uploads/2023/10/Longi-Solar-lr5-54hth-415-435m.pdf',
    cpv: 1,
  },
  {
    id:      'longi-lr5-54hth-430m',
    brandId:  'longi-solar',
    name:    'LONGi Hi-MO 6 LR5-54HTH-430M (430 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: high). Hi-MO 6 Explorer. HPBC cell.',
    voc:  39.13,
    vmp:  32.84,
    isc:  14.15,
    imp:  13.1,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.23,
    li:    0.05,
    nmot:  45,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'HPBC',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.zonpiek.nl/wp-content/uploads/2023/10/Longi-Solar-lr5-54hth-415-435m.pdf',
    cpv: 1,
  },
  {
    id:      'longi-lr5-54hth-440m',
    brandId:  'longi-solar',
    name:    'LONGi Hi-MO 6 LR5-54HTH-440M (440 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: high). Hi-MO 6 Explorer. Top of Explorer range.',
    voc:  39.53,
    vmp:  33.24,
    isc:  14.3,
    imp:  13.24,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.23,
    li:    0.05,
    nmot:  45,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 46, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.5,   /* datasheet STC module efficiency % */
    cellType:   'HPBC',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.solarmarkt.ch/herstimg/10-Solarmodule/Longi_Solar/DB_EN_LONGi_HiMO6_E_LR5-54HTH-420-440M.pdf',
    cpv: 1,
  },
  {
    id:      'longi-lr5-54hth-450m',
    brandId:  'longi-solar',
    name:    'LONGi Hi-MO 6 LR5-54HTH-450M (450 W)',
    note:    'Hi-MO 6 Scientist (higher-tier sub-series, HPBC+). 23.0% — highest in Hi-MO 6 54-cell lineup. 25yr product / 25yr linear power.',
    voc:  39.93,
    vmp:  33.64,
    isc:  14.45,
    imp:  13.38,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.23,
    li:    0.05,
    nmot:  45,
    pmax: 450, length: 1722, width: 1134,
    priceEur: 47, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23,   /* datasheet STC module efficiency % */
    cellType:   'HPBC',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.solarmarkt.ch/herstimg/10-Solarmodule/Longi_Solar/DB_EN_LONGi_HiMO6_S_LR5-54HTH-445-450M.pdf',
    cpv: 1,
  },
  {
    id:      'longi-lr7-54hvh-500m',
    brandId:  'longi-solar',
    name:    'LONGi Hi-MO X LR7-54HVH-500M (500 W)',
    note:    '108 half-cells HPBC (Hi-MO X), 1800x1134mm, 21.6 kg. Replaces LR5-54HTH series. Source: comparepv.com.',
    voc:  40.75,
    vmp:  33.73,
    isc:  15.53,
    imp:  14.83,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.2,
    li:    0.05,
    nmot:  43,
    pmax: 500, length: 1800, width: 1134,
    priceEur: 53, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 24.5,   /* datasheet STC module efficiency % */
    cellType:   'HPBC',
    weight:     21.6,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/lr-7-54-hvh-480-500-m-30-30-and-15-frame-anti-glare-bgv-03-2-6bcbf0202ee3.pdf',
    cpv: 1,
  },
  {
    id:      'longi-lr7-54hjbb-505m',
    brandId:  'longi-solar',
    name:    'LONGi Hi-MO X6 LR7-54HJBB-505M (505 W)',
    note:    '108 half-cells HPBC back-contact bifacial, 1800x1134mm, 23.5 kg. Source: comparepv.com.',
    voc:  41.55,
    vmp:  34.37,
    isc:  15.37,
    imp:  14.69,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.21,
    li:    0.05,
    nmot:  43,
    pmax: 505, length: 1800, width: 1134,
    priceEur: 53, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.24,   /* Pmpp temp coeff %/°C */
    efficiency: 24.7,   /* datasheet STC module efficiency % */
    cellType:   'HPBC',
    weight:     23.5,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/lr-7-54-hjbb-490-505-m-30-30-and-15-frame-bgv-02-20250905-en-54c21b111570.pdf',
    cpv: 1,
  },
  /* ─── TRINA SOLAR ─── */
  {
    id:      'trina-solar-tsm-430-neg9r-28',
    brandId:  'trina-solar',
    name:    'Trina Vertex S+ TSM-430NEG9R.28 (430 W)',
    note:    'Dual-glass framed. Datasheet TSM_EN_2024_C (Aug 2024).',
    voc:  51.4,
    vmp:  43.2,
    isc:  10.59,
    imp:  9.96,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 430, length: 1762, width: 1134,
    priceEur: 43, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    cpv: 1,
  },
  {
    id:      'trina-solar-tsm-435-neg9r-28',
    brandId:  'trina-solar',
    name:    'Trina Vertex S+ TSM-435NEG9R.28 (435 W)',
    note:    'Dual-glass framed.',
    voc:  51.8,
    vmp:  43.6,
    isc:  10.64,
    imp:  9.99,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 435, length: 1762, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    cpv: 1,
  },
  {
    id:      'trina-solar-tsm-440neg9r-28',
    brandId:  'trina-solar',
    name:    'Trina Vertex S+ TSM-440NEG9R.28 (440 W)',
    note:    'Dual-glass framed.',
    voc:  52.2,
    vmp:  44,
    isc:  10.67,
    imp:  10.01,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 440, length: 1762, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    cpv: 1,
  },
  {
    id:      'trina-solar-tsm-445neg9r-28',
    brandId:  'trina-solar',
    name:    'Trina Vertex S+ TSM-445NEG9R.28 (445 W)',
    note:    'Dual-glass framed.',
    voc:  52.6,
    vmp:  44.3,
    isc:  10.71,
    imp:  10.05,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 445, length: 1762, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    cpv: 1,
  },
  {
    id:      'trina-solar-tsm-450neg9r-28',
    brandId:  'trina-solar',
    name:    'Trina Vertex S+ TSM-450NEG9R.28 (450 W)',
    note:    'Dual-glass framed.',
    voc:  52.9,
    vmp:  44.6,
    isc:  10.74,
    imp:  10.09,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 450, length: 1762, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    cpv: 1,
  },
  {
    id:      'trina-solar-tsm-455neg9r-28',
    brandId:  'trina-solar',
    name:    'Trina Vertex S+ TSM-455NEG9R.28 (455 W)',
    note:    '108 half-cells N-type TOPCon, 1762x1134x30 mm. Source: comparepv.com.',
    voc:  53.4,
    vmp:  45,
    isc:  10.77,
    imp:  10.11,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 455, length: 1762, width: 1134,
    priceEur: 46, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/Datasheet_-_Vertex_S_NEG9R28_425-460_EN_2024_Aus_C_web-c64fac22102f.pdf',
    cpv: 1,
  },
  {
    id:      'trina-solar-tsm-460-neg9r-28',
    brandId:  'trina-solar',
    name:    'Trina Vertex S+ TSM-460NEG9R.28 (460 W)',
    note:    '108 half-cells N-type TOPCon, 1762x1134x30 mm. Source: comparepv.com.',
    voc:  53.8,
    vmp:  45.4,
    isc:  10.81,
    imp:  10.14,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 460, length: 1762, width: 1134,
    priceEur: 46, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/Datasheet_Vertex_S_NEG9R28_EN_2024_C_web-7de48f181210.pdf',
    cpv: 1,
  },
  /* ─── CANADIAN SOLAR ─── */
  {
    id:      'canadian-solar-cs3w-450ms',
    brandId:  'canadian-solar',
    name:    'Canadian Solar HiKu CS3W-450MS (450 W)',
    note:    'Mono-Si PERC, 144 cells (2×12×6), 2108×1048×40 mm, 24.9 kg. NMOT 42±3°C. Source: CS3W-430-455MS datasheet (HiKu_CS3W-MS_EN).',
    voc:  49.1,
    vmp:  41.1,
    isc:  11.6,
    imp:  10.96,
    lv:   -0.27,
    li:    0.05,
    nmot:  42,
    pmax: 450, length: 2108, width: 1048,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.35,   /* Pmpp temp coeff %/°C */
    efficiency: 20.4,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     24.9,   /* kg */
    datasheet: 'https://www.canadiansolar.com/wp-content/uploads/2019/12/Canadian_Solar-Datasheet-HiKu_CS3W-MS_EN.pdf',
  },
  {
    id:      'canadian-solar-cs3w-430ms',
    brandId:  'canadian-solar',
    name:    'Canadian Solar HiKu CS3W-430MS (430 W)',
    note:    '144 half-cells, 1500V. Same family as CS3W-450MS.',
    voc:  48.3,
    vmp:  40.3,
    isc:  11.37,
    imp:  10.68,
    lv:   -0.27,
    li:    0.05,
    nmot:  42,
    pmax: 430, length: 2108, width: 1048,
    priceEur: 43, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.35,   /* Pmpp temp coeff %/°C */
    efficiency: 19.5,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     24.9,   /* kg */
    datasheet: 'https://www.canadiansolar.com/wp-content/uploads/2019/12/Canadian_Solar-Datasheet-HiKu_CS3W-MS_EN.pdf',
  },
  {
    id:      'canadian-solar-cs3n-415ms',
    brandId:  'canadian-solar',
    name:    'Canadian Solar HiKu CS3N-415MS (415 W)',
    note:    '120 half-cells, 1500V. Compact HiKu high-density format.',
    voc:  45.1,
    vmp:  37.8,
    isc:  11.68,
    imp:  10.98,
    lv:   -0.26,
    li:    0.05,
    nmot:  41,
    pmax: 415, length: 1940, width: 1048,
    priceEur: 42, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.34,   /* Pmpp temp coeff %/°C */
    efficiency: 20.4,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     22.5,   /* kg */
    datasheet: 'https://natec.com/wp-content/uploads/2021/04/1121-0505_CSI-Datasheet-HiKu_CS3N-MS_v2.6_EN_400-425.pdf',
  },
  {
    id:      'canadian-solar-cs3n-425ms',
    brandId:  'canadian-solar',
    name:    'Canadian Solar HiKu CS3N-425MS (425 W)',
    note:    '120 half-cells, 1500V. Compact HiKu format.',
    voc:  45.5,
    vmp:  38.2,
    isc:  11.8,
    imp:  11.13,
    lv:   -0.26,
    li:    0.05,
    nmot:  41,
    pmax: 425, length: 1940, width: 1048,
    priceEur: 43, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.34,   /* Pmpp temp coeff %/°C */
    efficiency: 20.9,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     22.5,   /* kg */
    datasheet: 'https://natec.com/wp-content/uploads/2021/04/1121-0505_CSI-Datasheet-HiKu_CS3N-MS_v2.6_EN_400-425.pdf',
  },
  {
    id:      'csi-solar-co-ltd-canadian-solar-cs6-2-48td-460',
    brandId:  'canadian-solar',
    name:    'Canadian Solar TOPCon CS6.2-48TD-460 (460 W)',
    note:    '96 half-cells N-type TOPCon, 1762x1134mm, 24.6 kg. Source: comparepv.com.',
    voc:  53.3,
    vmp:  45.2,
    isc:  10.82,
    imp:  10.18,
    lv:   -0.25,
    li:    0.045,
    nmot:  44,
    pmax: 460, length: 1762, width: 1134,
    priceEur: 46, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24.6,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/1671737436893527184c9d-43228ee23a31.pdf',
    cpv: 1,
  },
  {
    id:      'csi-solar-co-ltd-canadian-solar-cs6-2-48td-470',
    brandId:  'canadian-solar',
    name:    'Canadian Solar TOPCon CS6.2-48TD-470 (470 W)',
    note:    '96 half-cells N-type TOPCon, 1762x1134mm, 24.6 kg. Source: comparepv.com.',
    voc:  53.7,
    vmp:  45.6,
    isc:  10.96,
    imp:  10.32,
    lv:   -0.25,
    li:    0.045,
    nmot:  44,
    pmax: 470, length: 1762, width: 1134,
    priceEur: 47, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24.6,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/1671737436893527184c9d-43228ee23a31.pdf',
    cpv: 1,
  },
  {
    id:      'csi-solar-co-ltd-canadian-solar-cs6r-445h-ag',
    brandId:  'canadian-solar',
    name:    'Canadian Solar HJT CS6R-445H-AG (445 W)',
    note:    '108 half-cells HJT, 1722x1134mm, 23 kg. Canadian Solar HiHero series. Source: comparepv.com.',
    voc:  40.6,
    vmp:  34,
    isc:  13.53,
    imp:  13.11,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 445, length: 1722, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.8,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     23,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/CS-Datasheet-HiHero-CS6R-H-AG-v26-EN-15y-product-warranty-d6d6d9b734d4.pdf',
    cpv: 1,
  },
  /* ─── HANWHA QCELLS ─── */
  {
    id:      'hanwha-q-cells-q-tron-blk-m-g2-415',
    brandId:  'hanwha-qcells',
    name:    'Hanwha Q.CELLS Q.TRON BLK M-G2+ 415W',
    note:    'EU 2023-09 Rev01 EN datasheet. gamma -0.30%/K per EU datasheet (NA Rev02 lists -0.29 — EU value used).',
    voc:  38.47,
    vmp:  32.34,
    isc:  13.49,
    imp:  12.83,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 415, length: 1722, width: 1134,
    priceEur: 62, priceSrc: 'est. Q-Cells premium EUR/Wp', eurPerWp: 0.15,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 21.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.2,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/qcells-data-sheet-q-tron-blk-m-g2-series-415-440-2024-08-rev-19c70b7f31ff.pdf',
    cpv: 1,
  },
  {
    id:      'hanwha-q-cells-q-tron-blk-m-g2-420',
    brandId:  'hanwha-qcells',
    name:    'Hanwha Q.CELLS Q.TRON BLK M-G2+ 420W',
    note:    'EU datasheet gamma -0.30%/K.',
    voc:  38.75,
    vmp:  32.54,
    isc:  13.58,
    imp:  12.91,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 420, length: 1722, width: 1134,
    priceEur: 63, priceSrc: 'est. Q-Cells premium EUR/Wp', eurPerWp: 0.15,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 21.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.2,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/qcells-data-sheet-q-tron-blk-m-g2-series-415-440-2024-08-rev-19c70b7f31ff.pdf',
    cpv: 1,
  },
  {
    id:      'hanwha-q-cells-q-tron-blk-m-g2-425',
    brandId:  'hanwha-qcells',
    name:    'Hanwha Q.CELLS Q.TRON BLK M-G2+ 425W',
    note:    'EU datasheet gamma -0.30%/K.',
    voc:  39.03,
    vmp:  32.74,
    isc:  13.66,
    imp:  12.98,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 425, length: 1722, width: 1134,
    priceEur: 64, priceSrc: 'est. Q-Cells premium EUR/Wp', eurPerWp: 0.15,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 21.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.2,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/qcells-data-sheet-q-tron-blk-m-g2-series-415-440-2024-08-rev-19c70b7f31ff.pdf',
    cpv: 1,
  },
  {
    id:      'hanwha-q-cells-q-tron-blk-m-g2-430',
    brandId:  'hanwha-qcells',
    name:    'Hanwha Q.CELLS Q.TRON BLK M-G2+ 430W',
    note:    'EU datasheet gamma -0.30%/K.',
    voc:  39.32,
    vmp:  32.94,
    isc:  13.74,
    imp:  13.05,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 65, priceSrc: 'est. Q-Cells premium EUR/Wp', eurPerWp: 0.15,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.2,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/qcells-data-sheet-q-tron-blk-m-g2-series-415-440-2024-08-rev-19c70b7f31ff.pdf',
    cpv: 1,
  },
  {
    id:      'q-cells-q-tron-blk-m-g2-435',
    brandId:  'hanwha-qcells',
    name:    'Hanwha Q.CELLS Q.TRON BLK M-G2+ 435W',
    note:    'EU datasheet gamma -0.30%/K. Top of EU residential range.',
    voc:  39.6,
    vmp:  33.14,
    isc:  13.82,
    imp:  13.13,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 435, length: 1722, width: 1134,
    priceEur: 65, priceSrc: 'est. Q-Cells premium EUR/Wp', eurPerWp: 0.15,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 22.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.2,   /* kg */
    datasheet: 'https://media.qcells.com/v/1FhTENgd/',
  },
  {
    id:      'hanwha-q-cells-q-tron-blk-m-g2-440',
    brandId:  'hanwha-qcells',
    name:    'Hanwha Q.TRON BLK M-G2+ 440 (440 W)',
    note:    '108 half-cells N-type TOPCon, all-black, 1722x1134mm. Direct continuation of Q.TRON BLK M-G2+ line. Source: comparepv.com.',
    voc:  39.88,
    vmp:  33.33,
    isc:  13.9,
    imp:  13.2,
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 66, priceSrc: 'est. Q-Cells premium EUR/Wp', eurPerWp: 0.15,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 22.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.2,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/qcells-data-sheet-q-tron-blk-m-g2-series-415-440-2024-08-rev-19c70b7f31ff.pdf',
    cpv: 1,
  },
  {
    id:      'q-cells-q-tron-blk-s-g3r-12-bfg-445wp',
    brandId:  'hanwha-qcells',
    name:    'Hanwha Q.TRON BLK S-G3R.12+ BFG 445 (445 W)',
    note:    '96 half-cells G12R rectangular-cell format, all-black, 1762x1134mm, 20.9 kg. Lower Voc (~35V) vs standard 108-cell. Source: comparepv.com.',
    voc:  34.85,
    vmp:  29.9,
    isc:  16,
    imp:  14.89,
    lv:   -0.25,
    li:    0.04,
    nmot:  44,
    pmax: 445, length: 1762, width: 1134,
    priceEur: 67, priceSrc: 'est. Q-Cells premium EUR/Wp', eurPerWp: 0.15,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 22.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     20.9,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/19e4563803abac121b585b52.pdf',
    cpv: 1,
  },
  /* ─── RISEN ENERGY ─── */
  {
    id:      'risen-rsm108-9-415n',
    brandId:  'risen-energy',
    name:    'Risen Energy RSM108-9-415N (415 W)',
    note:    '108-cell (6×9×2). NMOT 44±2°C. 30yr linear performance warranty.',
    voc:  38.67,
    vmp:  32.37,
    isc:  13.7,
    imp:  12.84,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.046,
    nmot:  44,
    pmax: 415, length: 1722, width: 1134,
    priceEur: 39, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.095,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 21.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://risenenergy.com.au/wp-content/uploads/RSM108-9-415-440N-IEC1500V-30mm-2023H1-1-EN-Black-frame-AU.pdf',
  },
  {
    id:      'risen-rsm108-9-420n',
    brandId:  'risen-energy',
    name:    'Risen Energy RSM108-9-420N (420 W)',
    note:    '108-cell. NMOT 44±2°C.',
    voc:  38.87,
    vmp:  32.56,
    isc:  13.78,
    imp:  12.92,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.046,
    nmot:  44,
    pmax: 420, length: 1722, width: 1134,
    priceEur: 40, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.095,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 21.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://risenenergy.com.au/wp-content/uploads/RSM108-9-415-440N-IEC1500V-30mm-2023H1-1-EN-Black-frame-AU.pdf',
  },
  {
    id:      'risen-rsm108-9-425n',
    brandId:  'risen-energy',
    name:    'Risen Energy RSM108-9-425N (425 W)',
    note:    '108-cell. NMOT 44±2°C.',
    voc:  39.07,
    vmp:  32.75,
    isc:  13.86,
    imp:  13,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.046,
    nmot:  44,
    pmax: 425, length: 1722, width: 1134,
    priceEur: 40, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.095,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 21.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://risenenergy.com.au/wp-content/uploads/RSM108-9-415-440N-IEC1500V-30mm-2023H1-1-EN-Black-frame-AU.pdf',
  },
  {
    id:      'risen-rsm108-9-430n',
    brandId:  'risen-energy',
    name:    'Risen Energy RSM108-9-430N (430 W)',
    note:    '108-cell. NMOT 44±2°C.',
    voc:  39.27,
    vmp:  32.95,
    isc:  13.94,
    imp:  13.07,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.046,
    nmot:  44,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 41, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.095,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://risenenergy.com.au/wp-content/uploads/RSM108-9-415-440N-IEC1500V-30mm-2023H1-1-EN-Black-frame-AU.pdf',
  },
  {
    id:      'risen-rsm108-9-435n',
    brandId:  'risen-energy',
    name:    'Risen Energy RSM108-9-435N (435 W)',
    note:    '108-cell. NMOT 44±2°C.',
    voc:  39.47,
    vmp:  33.15,
    isc:  14,
    imp:  13.13,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.046,
    nmot:  44,
    pmax: 435, length: 1722, width: 1134,
    priceEur: 41, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.095,
    gamma: -0.3,   /* Pmpp temp coeff %/°C */
    efficiency: 22.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     22,   /* kg */
    datasheet: 'https://risenenergy.com.au/wp-content/uploads/RSM108-9-415-440N-IEC1500V-30mm-2023H1-1-EN-Black-frame-AU.pdf',
  },
  {
    id:      'risen-energy-co-ltd-rsm96-11-460bndg',
    brandId:  'risen-energy',
    name:    'Risen RSM96-11-460BNDG (460 W)',
    note:    '96 half-cells G12R format N-type TOPCon, 1762x1134mm, 21.5 kg. Successor to RSM108-9 series. Source: comparepv.com.',
    voc:  35.79,
    vmp:  30.28,
    isc:  16.3,
    imp:  15.22,
    maxfuse: 35,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.046,
    nmot:  44,
    pmax: 460, length: 1762, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.095,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.5,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/rsm96-11-440-460bndg-iec1500v-30mm-2025h1-3-en-black-frame-30cb5162959a.pdf',
    cpv: 1,
  },
  {
    id:      'risen-energy-co-ltd-rsm96-11-455bndg',
    brandId:  'risen-energy',
    name:    'Risen RSM96-11-455BNDG (455 W)',
    note:    '96 half-cells G12R format N-type TOPCon, 1762x1134mm, 21.5 kg. Source: comparepv.com.',
    voc:  35.59,
    vmp:  30.1,
    isc:  16.22,
    imp:  15.12,
    maxfuse: 35,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.046,
    nmot:  44,
    pmax: 455, length: 1762, width: 1134,
    priceEur: 43, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.095,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.5,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/rsm96-11-440-460bndg-iec1500v-30mm-2025h1-3-en-black-frame-30cb5162959a.pdf',
    cpv: 1,
  },
  {
    id:      'risen-rsm108-10-465ndg',
    brandId:  'risen-energy',
    name:    'Risen RSM108-10-465NDG (465 W)',
    note:    '108 half-cells N-type TOPCon, 1800x1134mm, 25 kg (larger format). Source: comparepv.com.',
    voc:  39.68,
    vmp:  33.04,
    isc:  14.86,
    imp:  14.08,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.25,
    li:    0.046,
    nmot:  44,
    pmax: 465, length: 1800, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.095,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     25,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/RSM108-10-440-465NDG_IEC1500V-30mm_2024H1-3-EN-3f27e9572b6a.pdf',
    cpv: 1,
  },
  /* ─── AIKO ─── */
  {
    id:      'aiko-shenzhen-aiko-digital-energy-technology-co-ltd-aiko-a450-mah54mb-1',
    brandId:  'aiko',
    name:    'Aiko NEOSTAR 2S 450W All-Black (450 W)',
    note:    'ABC back-contact N-type. Datasheet gives NOCT-condition output but not NMOT°C; 45°C used (est. from NOCT data). 25yr product / 30yr linear warranty.',
    voc:  40.94,
    vmp:  34.5,
    isc:  14.12,
    imp:  13.05,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 450, length: 1757, width: 1134,
    priceEur: 77, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.6,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     20.6,   /* kg */
    datasheet: 'https://samonolithportalprodcdn.blob.core.windows.net/assets/general_product_documents/6325206034f65136425ead4b0131772337862260_Neostar_2S_188_AIKO_A_MAH54Mb_440_470W_1757x1134x30mm_DS_EN_2407_V1.3.pdf',
    cpv: 1,
  },
  {
    id:      'aiko-shenzhen-aiko-digital-energy-technology-co-ltd-aiko-a455-mah54mb-1',
    brandId:  'aiko',
    name:    'Aiko NEOSTAR 2S 455W All-Black (455 W)',
    note:    'ABC back-contact. nmot_c 45°C estimated from NOCT-condition data.',
    voc:  41,
    vmp:  34.56,
    isc:  14.22,
    imp:  13.17,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 455, length: 1757, width: 1134,
    priceEur: 77, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.8,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     20.6,   /* kg */
    datasheet: 'https://samonolithportalprodcdn.blob.core.windows.net/assets/general_product_documents/6325206034f65136425ead4b0131772337862260_Neostar_2S_188_AIKO_A_MAH54Mb_440_470W_1757x1134x30mm_DS_EN_2407_V1.3.pdf',
    cpv: 1,
  },
  {
    id:      'aiko-shenzhen-aiko-digital-energy-technology-co-ltd-aiko-a460-mah54mb-1',
    brandId:  'aiko',
    name:    'Aiko NEOSTAR 2S 460W All-Black (460 W)',
    note:    'ABC back-contact. nmot_c 45°C estimated from NOCT-condition data.',
    voc:  41.06,
    vmp:  34.62,
    isc:  14.25,
    imp:  13.29,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 460, length: 1757, width: 1134,
    priceEur: 78, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 23.1,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     20.6,   /* kg */
    datasheet: 'https://samonolithportalprodcdn.blob.core.windows.net/assets/general_product_documents/6325206034f65136425ead4b0131772337862260_Neostar_2S_188_AIKO_A_MAH54Mb_440_470W_1757x1134x30mm_DS_EN_2407_V1.3.pdf',
    cpv: 1,
  },
  {
    id:      'aiko-aiko-a465-mah54mb',
    brandId:  'aiko',
    name:    'Aiko NEOSTAR 2S 465W All-Black (465 W)',
    note:    'ABC back-contact. nmot_c 45°C estimated from NOCT-condition data.',
    voc:  41.12,
    vmp:  34.68,
    isc:  14.29,
    imp:  13.41,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 465, length: 1757, width: 1134,
    priceEur: 79, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 23.3,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     20.6,   /* kg */
    datasheet: 'https://samonolithportalprodcdn.blob.core.windows.net/assets/general_product_documents/6325206034f65136425ead4b0131772337862260_Neostar_2S_188_AIKO_A_MAH54Mb_440_470W_1757x1134x30mm_DS_EN_2407_V1.3.pdf',
    cpv: 1,
  },
  {
    id:      'aiko-aiko-a470-mah54mb',
    brandId:  'aiko',
    name:    'Aiko NEOSTAR 2S 470W All-Black (470 W)',
    note:    'ABC back-contact. nmot_c 45°C estimated. Highest efficiency in family (23.6%).',
    voc:  41.18,
    vmp:  34.74,
    isc:  14.32,
    imp:  13.54,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 470, length: 1757, width: 1134,
    priceEur: 80, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 23.6,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     20.6,   /* kg */
    datasheet: 'https://samonolithportalprodcdn.blob.core.windows.net/assets/general_product_documents/6325206034f65136425ead4b0131772337862260_Neostar_2S_188_AIKO_A_MAH54Mb_440_470W_1757x1134x30mm_DS_EN_2407_V1.3.pdf',
    cpv: 1,
  },
  {
    id:      'aiko-aiko-a475-mah54mw',
    brandId:  'aiko',
    name:    'Aiko NEOSTAR 2P A475-MAH54Mw (475 W)',
    note:    'ABC back-contact N-type, 108 half-cells (6x18), white backsheet (Mw), mono-glass. Datasheet gives NOCT-condition output (358 W) but not NMOT°C; 45°C used (est., as the 2S family). Source: official Neostar 2P datasheet DS_EN_2405_V1.1.',
    voc:  41.24,
    vmp:  34.8,
    isc:  14.35,
    imp:  13.66,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 475, length: 1757, width: 1134,
    priceEur: 81, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 23.8,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     21.5,   /* kg */
    datasheet: 'https://www.solargain.com.au/sites/default/files/2024-09/Aiko-Neostar-475w.pdf',
    cpv: 1,
  },
  {
    id:      'aiko-aiko-a485-mah54mw',
    brandId:  'aiko',
    name:    'AIKO ABC A485-MAH54Mw (485 W)',
    note:    '108 half-cells ABC back-contact, white frame, 1757x1134mm, 21.5 kg. Source: comparepv.com.',
    voc:  41.36,
    vmp:  34.92,
    isc:  14.41,
    imp:  13.9,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 485, length: 1757, width: 1134,
    priceEur: 82, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 24.3,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     21.5,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/neostar-2p-188-aiko-a-mah54mw-450-485w-1757x1134x30mm-dsdr-e-d1c93d62c6fa.pdf',
    cpv: 1,
  },
  {
    id:      'aiko-aiko-a485-mce54mb',
    brandId:  'aiko',
    name:    'AIKO ABC A485-MCE54Mb (485 W)',
    note:    '108 half-cells ABC back-contact, black frame, 1762x1134mm, 21 kg. Source: comparepv.com.',
    voc:  40.9,
    vmp:  34.3,
    isc:  14.88,
    imp:  14.15,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 485, length: 1762, width: 1134,
    priceEur: 82, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 24.3,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     21,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/neostar-3s54-aiko-a-mce54mb-460w-485w-8fa2a595eff0.pdf',
    cpv: 1,
  },
  {
    id:      'aiko-aiko-a495-mce54mw',
    brandId:  'aiko',
    name:    'AIKO ABC A495-MCE54Mw (495 W)',
    note:    '108 half-cells ABC back-contact, 1762x1134mm, 21 kg, 24.8% eff. Source: comparepv.com.',
    voc:  41.1,
    vmp:  34.5,
    isc:  15,
    imp:  14.35,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.05,
    nmot:  45,
    pmax: 495, length: 1762, width: 1134,
    priceEur: 84, priceSrc: 'UK retail (~68 GBP/450W)', eurPerWp: 0.17,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 24.8,   /* datasheet STC module efficiency % */
    cellType:   'ABC',
    weight:     21,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/neostar-3n54-aiko-a-mce54mw-470w-495w-63788c431933.pdf',
    cpv: 1,
  },
  /* ─── SOLARWATT ─── */
  {
    id:      'solarwatt-panel-vision-am-4-0-style-405-wp',
    brandId:  'solarwatt',
    name:    'SOLARWATT Panel vision AM 4.0 style 405 Wp',
    note:    'Glass-glass, 108 cells 182×91mm, 35mm Al frame, 25.4kg, 1500V. AM 4.0 = PERC (not TOPCon). Datasheet Rev.1 2023-06-20.',
    voc:  37.2,
    vmp:  30.9,
    isc:  14,
    imp:  13.1,
    lv:   -0.25,
    li:    0.05,
    nmot:  44,
    pmax: 405, length: 1722, width: 1134,
    priceEur: 113, priceSrc: 'est. DE glass-glass premium EUR/Wp', eurPerWp: 0.28,
    gamma: -0.33,   /* Pmpp temp coeff %/°C */
    efficiency: 20.8,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     25.4,   /* kg */
    datasheet: 'https://www.solarwatt.com/canto/download/r9oqv2la7h2lv6759b9tfktq71',
  },
  {
    id:      'solarwatt-panel-vision-am-4-5-style-420-wp',
    brandId:  'solarwatt',
    name:    'SOLARWATT Panel vision AM 4.5 style 420 Wp',
    note:    'Glass-glass, 108 cells, POE encapsulant. AM 4.5 = TOPCon upgrade. Datasheet Rev.4 2025-03-24.',
    voc:  38.4,
    vmp:  32,
    isc:  13.8,
    imp:  13.1,
    lv:   -0.25,
    li:    0.04,
    nmot:  42,
    pmax: 420, length: 1722, width: 1134,
    priceEur: 118, priceSrc: 'est. DE glass-glass premium EUR/Wp', eurPerWp: 0.28,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24,   /* kg */
    datasheet: 'https://www.solarwatt.com/canto/download/u3e43g3ar51th82b317kfol16n',
  },
  {
    id:      'solarwatt-panel-vision-am-4-5-style-430-wp',
    brandId:  'solarwatt',
    name:    'SOLARWATT Panel vision AM 4.5 style 430 Wp',
    note:    'Glass-glass. 30yr product + 30yr performance warranty.',
    voc:  38.8,
    vmp:  32.4,
    isc:  13.9,
    imp:  13.3,
    lv:   -0.25,
    li:    0.04,
    nmot:  42,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 120, priceSrc: 'est. DE glass-glass premium EUR/Wp', eurPerWp: 0.28,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24,   /* kg */
    datasheet: 'https://www.solarwatt.com/canto/download/u3e43g3ar51th82b317kfol16n',
  },
  {
    id:      'solarwatt-solarwatt-panel-vision-m-5-0-445-wp',
    brandId:  'solarwatt',
    name:    'SOLARWATT Panel vision M 5.0 445 Wp',
    note:    '⚠ Series discontinued per comparepv.com (confidence: medium). Glass-glass. M 5.0 = 1762mm (larger than AM 4.x at 1722mm), 182×93mm cells. Datasheet Rev.13 2024-12-13.',
    voc:  39.6,
    vmp:  33,
    isc:  14,
    imp:  13.5,
    lv:   -0.25,
    li:    0.05,
    nmot:  42,
    pmax: 445, length: 1762, width: 1134,
    priceEur: 125, priceSrc: 'est. DE glass-glass premium EUR/Wp', eurPerWp: 0.28,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24.8,   /* kg */
    datasheet: 'https://www.oxfordsolarpv.co.uk/files/data-sheet-solarwatt-panel-vision-m-5.0-en.pdf',
    cpv: 1,
  },
  {
    id:      'solarwatt-vision-m-5-0-450-wp',
    brandId:  'solarwatt',
    name:    'SOLARWATT Panel vision M 5.0 450 Wp',
    note:    '⚠ Series discontinued per comparepv.com (confidence: medium). Glass-glass. 30yr product + 30yr performance warranty.',
    voc:  39.8,
    vmp:  33.2,
    isc:  14,
    imp:  13.5,
    lv:   -0.25,
    li:    0.05,
    nmot:  42,
    pmax: 450, length: 1762, width: 1134,
    priceEur: 126, priceSrc: 'est. DE glass-glass premium EUR/Wp', eurPerWp: 0.28,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24.8,   /* kg */
    datasheet: 'https://www.oxfordsolarpv.co.uk/files/data-sheet-solarwatt-panel-vision-m-5.0-en.pdf',
    cpv: 1,
  },
  {
    id:      'solarwatt-vision-m-5-0-440-wp',
    brandId:  'solarwatt',
    name:    'Solarwatt Panel vision M 5.0 440 Wp (440 W)',
    note:    'Glass-glass double-glazed N-type TOPCon, 1762x1134mm. Current (non-discontinued) M 5.0 variant. Source: comparepv.com.',
    voc:  39.4,
    vmp:  32.8,
    isc:  13.9,
    imp:  13.4,
    lv:   -0.25,
    li:    0.05,
    nmot:  44,
    pmax: 440, length: 1762, width: 1134,
    priceEur: 123, priceSrc: 'est. DE glass-glass premium EUR/Wp', eurPerWp: 0.28,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24.8,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/Data_sheet_SOLARWATT_Panel_vision_M_50_en-610d0a212187.pdf',
    cpv: 1,
  },
  /* ─── AXITEC ─── */
  {
    id:      'axitec-ac-415tfm-108wb',
    brandId:  'axitec',
    name:    'AXITEC AXIperfect FXXL WB 415 Wp',
    note:    'Glass-foil (white backsheet), monofacial. 30mm black Al frame, 21.8kg, 1500V. Extracted from PDF via pdfminer.',
    voc:  37.92,
    vmp:  31.32,
    isc:  13.99,
    imp:  13.26,
    lv:   -0.26,
    li:    0.047,
    nmot:  45,
    pmax: 415, length: 1722, width: 1134,
    priceEur: 50, priceSrc: 'est. EUR/Wp', eurPerWp: 0.12,
    gamma: -0.31,   /* Pmpp temp coeff %/°C */
    efficiency: 21.25,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.8,   /* kg */
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/global/datasheets/Axitec/Axitec_AXIperfect_FXXL_WB__MiA_415-435Wp_EN.pdf',
  },
  {
    id:      'axitec-ac-420tfm-108wb',
    brandId:  'axitec',
    name:    'AXITEC AXIperfect FXXL WB 420 Wp',
    note:    'Glass-foil, monofacial.',
    voc:  38.11,
    vmp:  31.51,
    isc:  14.07,
    imp:  13.33,
    lv:   -0.26,
    li:    0.047,
    nmot:  45,
    pmax: 420, length: 1722, width: 1134,
    priceEur: 50, priceSrc: 'est. EUR/Wp', eurPerWp: 0.12,
    gamma: -0.31,   /* Pmpp temp coeff %/°C */
    efficiency: 21.51,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.8,   /* kg */
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/global/datasheets/Axitec/Axitec_AXIperfect_FXXL_WB__MiA_415-435Wp_EN.pdf',
  },
  {
    id:      'axitec-ac-430tfm-108wb',
    brandId:  'axitec',
    name:    'AXITEC AXIperfect FXXL WB 430 Wp',
    note:    'Glass-foil, monofacial.',
    voc:  38.49,
    vmp:  31.88,
    isc:  14.23,
    imp:  13.49,
    lv:   -0.26,
    li:    0.047,
    nmot:  45,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 52, priceSrc: 'est. EUR/Wp', eurPerWp: 0.12,
    gamma: -0.31,   /* Pmpp temp coeff %/°C */
    efficiency: 22.02,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.8,   /* kg */
    datasheet: 'https://krannich-solar.com/fileadmin/user_upload/global/datasheets/Axitec/Axitec_AXIperfect_FXXL_WB__MiA_415-435Wp_EN.pdf',
  },
  {
    id:      'axitec-ac-440tgb-108bb',
    brandId:  'axitec',
    name:    'AXITEC AXIblackbiperfect GL 440 Wp',
    note:    'Glass-glass bifacial full-black. lv=-0.28%/K (differs from FXXL WB -0.26). 23.8kg, 1500V.',
    voc:  39.84,
    vmp:  33.24,
    isc:  14.02,
    imp:  13.24,
    lv:   -0.28,
    li:    0.046,
    nmot:  45,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 53, priceSrc: 'est. EUR/Wp', eurPerWp: 0.12,
    gamma: -0.31,   /* Pmpp temp coeff %/°C */
    efficiency: 22.53,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     23.8,   /* kg */
    datasheet: 'https://sunwatts.com/content/specs/Axitec_AXIblackbiperfect_440-450W_DataSheet.pdf',
  },
  {
    id:      'axitec-ac-450tgb-108bb',
    brandId:  'axitec',
    name:    'AXITEC AXIblackbiperfect GL 450 Wp',
    note:    'Glass-glass bifacial full-black. lv=-0.28%/K.',
    voc:  40.24,
    vmp:  33.66,
    isc:  14.16,
    imp:  13.38,
    lv:   -0.28,
    li:    0.046,
    nmot:  45,
    pmax: 450, length: 1722, width: 1134,
    priceEur: 54, priceSrc: 'est. EUR/Wp', eurPerWp: 0.12,
    gamma: -0.31,   /* Pmpp temp coeff %/°C */
    efficiency: 23.04,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     23.8,   /* kg */
    datasheet: 'https://sunwatts.com/content/specs/Axitec_AXIblackbiperfect_440-450W_DataSheet.pdf',
  },
  {
    id:      'axitec-ac-450tgbl-108wb',
    brandId:  'axitec',
    name:    'Axitec AXIblackpremium X AC-450TGBL/108WB (450 W)',
    note:    '108 half-cells N-type TOPCon, glass-glass black frame, 1762x1134mm, 25 kg. Replaces AC-TFM/TGB series. Source: comparepv.com.',
    voc:  39.98,
    vmp:  33.24,
    isc:  14.25,
    imp:  13.54,
    lv:   -0.26,
    li:    0.046,
    nmot:  44,
    pmax: 450, length: 1762, width: 1134,
    priceEur: 54, priceSrc: 'est. EUR/Wp', eurPerWp: 0.12,
    gamma: -0.31,   /* Pmpp temp coeff %/°C */
    efficiency: 22.52,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     25,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/DB_108zlg_biperfect_GL_WB_MiA_EN-7333d8a0fd04.pdf',
    cpv: 1,
  },
  {
    id:      'axitec-ac-460tgbl-108wb',
    brandId:  'axitec',
    name:    'Axitec AXIblackpremium X AC-460TGBL/108WB (460 W)',
    note:    '108 half-cells N-type TOPCon, glass-glass black frame, 1762x1134mm, 25 kg. Source: comparepv.com.',
    voc:  40.56,
    vmp:  33.61,
    isc:  14.36,
    imp:  13.69,
    lv:   -0.26,
    li:    0.046,
    nmot:  44,
    pmax: 460, length: 1762, width: 1134,
    priceEur: 55, priceSrc: 'est. EUR/Wp', eurPerWp: 0.12,
    gamma: -0.31,   /* Pmpp temp coeff %/°C */
    efficiency: 23.02,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     25,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/DB_108zlg_blackbiperfect_GL_MiA_EN_2mm-1c4e7498860f.pdf',
    cpv: 1,
  },
  {
    id:      'axitec-ac-465tgbl-108wb',
    brandId:  'axitec',
    name:    'Axitec AXIblackpremium X AC-465TGBL/108WB (465 W)',
    note:    '108 half-cells N-type TOPCon, glass-glass black frame, 1762x1134mm, 25 kg. Source: comparepv.com.',
    voc:  40.84,
    vmp:  33.86,
    isc:  14.42,
    imp:  13.74,
    lv:   -0.26,
    li:    0.046,
    nmot:  44,
    pmax: 465, length: 1762, width: 1134,
    priceEur: 56, priceSrc: 'est. EUR/Wp', eurPerWp: 0.12,
    gamma: -0.31,   /* Pmpp temp coeff %/°C */
    efficiency: 23.27,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     25,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/DB_108zlg_biperfect_GL_WB_MiA_EN-7333d8a0fd04.pdf',
    cpv: 1,
  },
  /* ─── ASTRONERGY ─── */
  {
    id:      'astronergy-astro-n5s-chsm54n-hc-425w',
    brandId:  'astronergy',
    name:    'ASTROnergy ASTRO N5s CHSM54N-HC-425 (425 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: medium). ASTRO N5s monofacial, 108-cell half-cut N-type TOPCon, 182 mm cells, 1500 V system voltage, glass-foil construction.',
    voc:  38.2,
    vmp:  32.1,
    isc:  13.98,
    imp:  13.24,
    lv:   -0.25,
    li:    0.043,
    nmot:  41,
    pmax: 425, length: 1722, width: 1134,
    priceEur: 43, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.astronergy.com/wp-content/uploads/2023/08/425445ASTRO-N5s_CHSM54N-HC_1722x1134x30_EN_20240105.pdf',
    cpv: 1,
  },
  {
    id:      'astronergy-chint-new-energy-technology-co-ltd-chsm54n-hc-430',
    brandId:  'astronergy',
    name:    'ASTROnergy ASTRO N5s CHSM54N-HC-430 (430 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: medium). ASTRO N5s monofacial, 108-cell half-cut N-type TOPCon, 182 mm cells, 1500 V system voltage. Isc confirmed via pvxchange.com product listing.',
    voc:  38.4,
    vmp:  32.27,
    isc:  14.09,
    imp:  13.33,
    lv:   -0.25,
    li:    0.043,
    nmot:  41,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 43, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.astronergy.com/wp-content/uploads/2023/08/425445ASTRO-N5s_CHSM54N-HC_1722x1134x30_EN_20240105.pdf',
    cpv: 1,
  },
  {
    id:      'astronergy-chint-new-energy-technology-co-ltd-chsm54n-hc-435w',
    brandId:  'astronergy',
    name:    'ASTROnergy ASTRO N5s CHSM54N-HC-435 (435 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: medium). ASTRO N5s monofacial, 108-cell half-cut N-type TOPCon, 182 mm cells, 1500 V system voltage. Specs cross-confirmed via comparepv.com and synapsun.com.',
    voc:  38.6,
    vmp:  32.44,
    isc:  14.19,
    imp:  13.41,
    lv:   -0.25,
    li:    0.043,
    nmot:  41,
    pmax: 435, length: 1722, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.3,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.astronergy.com/wp-content/uploads/2023/08/425445ASTRO-N5s_CHSM54N-HC_1722x1134x30_EN_20240105.pdf',
    cpv: 1,
  },
  {
    id:      'astronergy-chint-new-energy-technology-co-ltd-chsm54n-hc-440',
    brandId:  'astronergy',
    name:    'ASTROnergy ASTRO N5s CHSM54N-HC-440 (440 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: medium). ASTRO N5s monofacial, 108-cell half-cut N-type TOPCon, 182 mm cells, 1500 V system voltage. Specs cross-confirmed via solarproof.com.au and synapsun.com.',
    voc:  38.8,
    vmp:  32.61,
    isc:  14.3,
    imp:  13.49,
    lv:   -0.25,
    li:    0.043,
    nmot:  41,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.astronergy.com/wp-content/uploads/2023/08/425445ASTRO-N5s_CHSM54N-HC_1722x1134x30_EN_20240105.pdf',
    cpv: 1,
  },
  {
    id:      'astronergy-chint-new-energy-technology-co-ltd-chsm54n-hc-445',
    brandId:  'astronergy',
    name:    'ASTROnergy ASTRO N5s CHSM54N-HC-445 (445 W)',
    note:    '⚠ Series discontinued per comparepv.com (confidence: medium). ASTRO N5s monofacial, 108-cell half-cut N-type TOPCon, 182 mm cells, 1500 V system voltage. Specs cross-confirmed via comparepv.com and synapsun.com.',
    voc:  39,
    vmp:  32.77,
    isc:  14.41,
    imp:  13.58,
    lv:   -0.25,
    li:    0.043,
    nmot:  41,
    pmax: 445, length: 1722, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.astronergy.com/wp-content/uploads/2023/08/425445ASTRO-N5s_CHSM54N-HC_1722x1134x30_EN_20240105.pdf',
    cpv: 1,
  },
  {
    id:      'astronergy-chint-new-energy-technology-co-ltd-chsm48rn-dg-f-bh-470',
    brandId:  'astronergy',
    name:    'Astronergy ASTRO N6 CHSM48RN(DG)/F-BH-470 (470 W)',
    note:    '96 half-cells N-type TOPCon, double-glass bifacial, 1762x1134mm, 24.5 kg. ASTRO N6 replaces discontinued CHSM54N-HC line. Source: comparepv.com.',
    voc:  36.92,
    vmp:  30.75,
    isc:  15.99,
    imp:  15.28,
    lv:   -0.25,
    li:    0.043,
    nmot:  44,
    pmax: 470, length: 1762, width: 1134,
    priceEur: 47, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24.5,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/450475astro-n7s-2-0-chsm48rndgf-bh-1762-1134-30-2-0-glass-en-cd75a4fbe0f0.pdf',
    cpv: 1,
  },
  {
    id:      'astronergy-chint-new-energy-technology-co-ltd-chsm48rn-dg-f-bh-475',
    brandId:  'astronergy',
    name:    'Astronergy ASTRO N6 CHSM48RN(DG)/F-BH-475 (475 W)',
    note:    '96 half-cells N-type TOPCon, double-glass bifacial, 1762x1134mm, 24.5 kg. Source: comparepv.com.',
    voc:  36.95,
    vmp:  30.78,
    isc:  16.15,
    imp:  15.43,
    lv:   -0.25,
    li:    0.043,
    nmot:  44,
    pmax: 475, length: 1762, width: 1134,
    priceEur: 48, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     24.5,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/450475astro-n7s-2-0-chsm48rndgf-bh-1762-1134-30-2-0-glass-en-cd75a4fbe0f0.pdf',
    cpv: 1,
  },
  /* ─── AE SOLAR ─── */
  {
    id:      'ae-solar-ae-cmd-108e-415',
    brandId:  'ae-solar',
    name:    'AE Solar Meteor CMD-108E 415W',
    note:    'Meteor series, N-type TOPCon, 108 half-cells, mono-facial all-black, EVA encapsulation, white backsheet.',
    voc:  37.67,
    vmp:  31.81,
    isc:  13.95,
    imp:  13.05,
    lv:   -0.25,
    li:    0.046,
    nmot:  42,
    pmax: 415, length: 1721, width: 1133,
    priceEur: 46, priceSrc: 'est. EUR/Wp', eurPerWp: 0.11,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.28,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     20.3,   /* kg */
    datasheet: 'https://ae-solar.com/documents/solar_panels/Meteor/AE_CMD-108E_415W-435W_Ver24.5.1.pdf',
    cpv: 1,
  },
  {
    id:      'ae-solar-ae-cmd-108e-425',
    brandId:  'ae-solar',
    name:    'AE Solar Meteor CMD-108E 425W',
    note:    'Meteor series, N-type TOPCon, 108 half-cells, mono-facial all-black, EVA encapsulation, white backsheet.',
    voc:  38.08,
    vmp:  32.25,
    isc:  14.1,
    imp:  13.18,
    lv:   -0.25,
    li:    0.046,
    nmot:  42,
    pmax: 425, length: 1721, width: 1133,
    priceEur: 47, priceSrc: 'est. EUR/Wp', eurPerWp: 0.11,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     20.3,   /* kg */
    datasheet: 'https://ae-solar.com/documents/solar_panels/Meteor/AE_CMD-108E_415W-435W_Ver24.5.1.pdf',
    cpv: 1,
  },
  {
    id:      'ae-solar-ae-cmer-96bds-435w',
    brandId:  'ae-solar',
    name:    'AE Solar Meteor CMER-96BDS 435W',
    note:    'Meteor series, N-type TOPCon, 96 half-cells, bifacial double-glass, POE encapsulation, bifaciality 80±5%.',
    voc:  34.77,
    vmp:  29.22,
    isc:  15.76,
    imp:  14.89,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 435, length: 1762, width: 1133,
    priceEur: 48, priceSrc: 'est. EUR/Wp', eurPerWp: 0.11,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.79,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     23,   /* kg */
    datasheet: 'https://ae-solar.com/documents/solar_panels/Meteor/AE_CMER-96BDS_435W-455W_Ver24.6.21.pdf',
  },
  {
    id:      'ae-solar-ae-cmer-96bds-445',
    brandId:  'ae-solar',
    name:    'AE Solar Meteor CMER-96BDS 445W',
    note:    'Meteor series, N-type TOPCon, 96 half-cells, bifacial double-glass, POE encapsulation, bifaciality 80±5%.',
    voc:  35.33,
    vmp:  29.78,
    isc:  15.93,
    imp:  14.95,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 445, length: 1762, width: 1133,
    priceEur: 49, priceSrc: 'est. EUR/Wp', eurPerWp: 0.11,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.29,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     23,   /* kg */
    datasheet: 'https://ae-solar.com/documents/solar_panels/Meteor/AE_CMER-96BDS_435W-455W_Ver24.6.21.pdf',
    cpv: 1,
  },
  {
    id:      'ae-solar-ae-cmer-96bds-455',
    brandId:  'ae-solar',
    name:    'AE Solar Meteor CMER-96BDS 455W',
    note:    'Meteor series, N-type TOPCon, 96 half-cells, bifacial double-glass, POE encapsulation, bifaciality 80±5%.',
    voc:  35.89,
    vmp:  30.34,
    isc:  15.99,
    imp:  15.01,
    lv:   -0.24,
    li:    0.04,
    nmot:  43,
    pmax: 455, length: 1762, width: 1133,
    priceEur: 50, priceSrc: 'est. EUR/Wp', eurPerWp: 0.11,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.79,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     23,   /* kg */
    datasheet: 'https://ae-solar.com/documents/solar_panels/Meteor/AE_CMER-96BDS_435W-455W_Ver24.6.21.pdf',
    cpv: 1,
  },
  {
    id:      'ae-solar-ae-icmd-108bde-485',
    brandId:  'ae-solar',
    name:    'AE Solar ICMD-108BDE 485 (485 W)',
    note:    '108 half-cells IBC back-contact, 1800x1134mm, 23.5 kg. Source: comparepv.com.',
    voc:  40.64,
    vmp:  33.62,
    isc:  15.08,
    imp:  14.43,
    lv:   -0.2,
    li:    0.05,
    nmot:  43,
    pmax: 485, length: 1800, width: 1134,
    priceEur: 53, priceSrc: 'est. EUR/Wp', eurPerWp: 0.11,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 23.8,   /* datasheet STC module efficiency % */
    cellType:   'IBC',
    weight:     23.5,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/ae-icmd-108bde-470w-490w-ver25-12-1-ac7e84ac116a.pdf',
    cpv: 1,
  },
  {
    id:      'ae-solar-ae-icmd-108bde-490',
    brandId:  'ae-solar',
    name:    'AE Solar ICMD-108BDE 490 (490 W)',
    note:    '108 half-cells IBC back-contact, 1800x1134mm, 23.5 kg, 24% eff. Source: comparepv.com.',
    voc:  40.75,
    vmp:  33.73,
    isc:  15.18,
    imp:  14.53,
    lv:   -0.2,
    li:    0.05,
    nmot:  43,
    pmax: 490, length: 1800, width: 1134,
    priceEur: 54, priceSrc: 'est. EUR/Wp', eurPerWp: 0.11,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 24,   /* datasheet STC module efficiency % */
    cellType:   'IBC',
    weight:     23.5,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/ae-icmd-108bde-470w-490w-ver25-12-1-ac7e84ac116a.pdf',
    cpv: 1,
  },
  /* ─── FUTURASUN ─── */
  {
    id:      'futurasun-fu-420-m',
    brandId:  'futurasun',
    name:    'FuturaSun Silk Nova All Black 420 W (108-cell)',
    note:    'All-Black variant (black frame, black backsheet). Silk Nova All Black 108-cell series. Verified from official FuturaSun datasheet EN_01.',
    voc:  38.06,
    vmp:  31.49,
    isc:  14.09,
    imp:  13.34,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 420, length: 1722, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.futurasun.com/wp-content/uploads/2024/04/FuturaSun_108_420-430W_Silk-Nova-All-Black_EN.pdf',
  },
  {
    id:      'futurasun-fu-425-m',
    brandId:  'futurasun',
    name:    'FuturaSun Silk Nova All Black 425 W (108-cell)',
    note:    'All-Black variant. Verified from official FuturaSun datasheet EN_01.',
    voc:  38.25,
    vmp:  31.67,
    isc:  14.17,
    imp:  13.42,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 425, length: 1722, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 21.8,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.futurasun.com/wp-content/uploads/2024/04/FuturaSun_108_420-430W_Silk-Nova-All-Black_EN.pdf',
  },
  {
    id:      'futurasun-fu-430-m',
    brandId:  'futurasun',
    name:    'FuturaSun Silk Nova 430 W (108-cell)',
    note:    'Standard white-backsheet variant. Silk Nova 108-cell series. Verified from official FuturaSun datasheet EN_02.',
    voc:  38.44,
    vmp:  31.86,
    isc:  14.25,
    imp:  13.5,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.futurasun.com/wp-content/uploads/2024/05/FuturaSun_108_430-440W_Silk-Nova_EN.pdf',
  },
  {
    id:      'futurasun-fu-440-m',
    brandId:  'futurasun',
    name:    'FuturaSun Silk Nova 440 W (108-cell)',
    note:    'Top of range for 108-cell 1722×1134 format. Verified from official FuturaSun datasheet EN_02.',
    voc:  38.82,
    vmp:  32.24,
    isc:  14.41,
    imp:  13.66,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 46, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.53,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     20.8,   /* kg */
    datasheet: 'https://www.futurasun.com/wp-content/uploads/2024/05/FuturaSun_108_430-440W_Silk-Nova_EN.pdf',
  },
  {
    id:      'futurasun-fu-445-m',
    brandId:  'futurasun',
    name:    'FuturaSun Silk Nova 445 W (96-cell)',
    note:    '96-cell G12R format, larger 1762×1134 mm footprint. Higher Isc due to larger cell. Verified from official FuturaSun datasheet EN_02 Rev.02.',
    voc:  35.3,
    vmp:  29.81,
    isc:  15.91,
    imp:  14.93,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 445, length: 1762, width: 1134,
    priceEur: 47, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.27,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.futurasun.com/wp-content/uploads/2023/04/FuturaSun_96_445-460W_Silk-Nova_EN_Rev.02.pdf',
  },
  {
    id:      'futurasun-fu-450-m',
    brandId:  'futurasun',
    name:    'FuturaSun Silk Nova 450 W (96-cell)',
    note:    'Also available as All-Black variant (FU 450 M All Black, same electrical specs). Verified from official FuturaSun datasheet EN_02 Rev.02.',
    voc:  35.47,
    vmp:  30.01,
    isc:  15.97,
    imp:  15,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 450, length: 1762, width: 1134,
    priceEur: 47, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.52,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.futurasun.com/wp-content/uploads/2023/04/FuturaSun_96_445-460W_Silk-Nova_EN_Rev.02.pdf',
  },
  {
    id:      'futurasun-fu-455-m',
    brandId:  'futurasun',
    name:    'FuturaSun Silk Nova 455 W (96-cell)',
    note:    '96-cell G12R format. Also available as Duetto bifacial variant with same front-side electrical specs. Verified from official datasheet EN_02 Rev.02.',
    voc:  35.63,
    vmp:  30.17,
    isc:  16.02,
    imp:  15.08,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 455, length: 1762, width: 1134,
    priceEur: 48, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.77,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.futurasun.com/wp-content/uploads/2023/04/FuturaSun_96_445-460W_Silk-Nova_EN_Rev.02.pdf',
  },
  {
    id:      'futurasun-fu-460-m',
    brandId:  'futurasun',
    name:    'FuturaSun Silk Nova 460 W (96-cell)',
    note:    'Top of 96-cell Silk Nova range. Also available as Silk Nova Duetto bifacial (glass-glass, same front STC specs, 30-year linear warranty). Verified from official datasheet.',
    voc:  35.84,
    vmp:  30.43,
    isc:  16.1,
    imp:  15.13,
    lv:   -0.25,
    li:    0.045,
    nmot:  45,
    pmax: 460, length: 1762, width: 1134,
    priceEur: 48, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.105,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 23.02,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     21.3,   /* kg */
    datasheet: 'https://www.futurasun.com/wp-content/uploads/2023/04/FuturaSun_96_445-460W_Silk-Nova_EN_Rev.02.pdf',
  },
  /* ─── DAH SOLAR ─── */
  {
    id:      'dah-solar-dhn-60x16-dg-bw-475w',
    brandId:  'dah-solar',
    name:    'DAH Solar DHN-60X16/DG(BW) 475 W',
    note:    'Framed bifacial double-glass (BW variant); 120 cells 6×20, 182×91mm half-cells; bifaciality 80±5%; 15yr product / 30yr linear power; 1500V DC. Datasheet from dahsolar.com.',
    voc:  42.6,
    vmp:  36.2,
    isc:  13.96,
    imp:  13.12,
    lv:   -0.25,
    li:    0.046,
    nmot:  45,
    pmax: 475, length: 1903, width: 1134,
    priceEur: 48, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     26.5,   /* kg */
    datasheet: 'https://www.dahsolar.com',
  },
  {
    id:      'dah-solar-dhn-60x16-dg-bw-480w',
    brandId:  'dah-solar',
    name:    'DAH Solar DHN-60X16/DG(BW) 480 W',
    note:    'Framed bifacial double-glass (BW variant).',
    voc:  42.8,
    vmp:  36.4,
    isc:  14.02,
    imp:  13.19,
    lv:   -0.25,
    li:    0.046,
    nmot:  45,
    pmax: 480, length: 1903, width: 1134,
    priceEur: 48, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.2,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     26.5,   /* kg */
    datasheet: 'https://www.dahsolar.com',
  },
  {
    id:      'dah-solar-dhn-60x16-dg-bw-490w',
    brandId:  'dah-solar',
    name:    'DAH Solar DHN-60X16/DG(BW) 490 W',
    note:    'Framed bifacial double-glass (BW variant).',
    voc:  43.2,
    vmp:  36.8,
    isc:  14.14,
    imp:  13.32,
    lv:   -0.25,
    li:    0.046,
    nmot:  45,
    pmax: 490, length: 1903, width: 1134,
    priceEur: 49, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.7,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     26.5,   /* kg */
    datasheet: 'https://www.dahsolar.com',
  },
  {
    id:      'dah-solar-dhn-60x16-dg-fs-bb-485w',
    brandId:  'dah-solar',
    name:    'DAH Solar DHN-60X16/DG/FS(BB) 485 W',
    note:    'Full-Screen (FS) frameless bifacial double-glass (BB variant) — DAH\'s patented full-screen design; 22.47% eff; 28mm thick, 26.5kg. Identical electrical specs to framed BW.',
    voc:  43,
    vmp:  36.6,
    isc:  14.08,
    imp:  13.25,
    lv:   -0.25,
    li:    0.046,
    nmot:  45,
    pmax: 485, length: 1903, width: 1134,
    priceEur: 49, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.5,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     26.5,   /* kg */
    datasheet: 'https://omo-oss-file110.thefastfile.com/portal-saas/ngc202312290002/cms/file/cn-dhn-60x16-dg-fs(bb)-475~495w(1).pdf',
  },
  {
    id:      'dah-solar-dhn-60x16-dg-fs-bb-495w',
    brandId:  'dah-solar',
    name:    'DAH Solar DHN-60X16/DG/FS(BB) 495 W',
    note:    'Full-Screen (FS) frameless bifacial — top of range at 22.94% eff.',
    voc:  43.4,
    vmp:  37,
    isc:  14.2,
    imp:  13.38,
    lv:   -0.25,
    li:    0.046,
    nmot:  45,
    pmax: 495, length: 1903, width: 1134,
    priceEur: 50, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.29,   /* Pmpp temp coeff %/°C */
    efficiency: 22.9,   /* datasheet STC module efficiency % */
    cellType:   'TOPCon',
    weight:     26.5,   /* kg */
    datasheet: 'https://omo-oss-file110.thefastfile.com/portal-saas/ngc202312290002/cms/file/cn-dhn-60x16-dg-fs(bb)-475~495w(1).pdf',
  },
  /* ─── HUASUN ─── */
  {
    id:      'huasun-hs-182-b108-ds430',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 430 W (bifacial, silver frame)',
    note:    'Bifacial double-glass, silver anodised aluminium frame. Up to 90% bifaciality. BSTC (front 1000 + back 135 W/m²) Pmax: 475 W. HJT 3.0 technology with SMBB. Verified from ProSun/Huasun official datasheet dated 02.10.23.',
    voc:  40.3,
    vmp:  33.49,
    isc:  13.3,
    imp:  12.84,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 60, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.02,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-ds435',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 435 W (bifacial, silver frame)',
    note:    'Verified from ProSun/Huasun official datasheet. BSTC Pmax: 480 W.',
    voc:  40.56,
    vmp:  33.75,
    isc:  13.35,
    imp:  12.89,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 435, length: 1722, width: 1134,
    priceEur: 61, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.28,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-ds440',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 440 W (bifacial, silver frame)',
    note:    'Verified from ProSun/Huasun official datasheet. BSTC Pmax: 485 W.',
    voc:  40.83,
    vmp:  34.01,
    isc:  13.4,
    imp:  12.94,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 62, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.53,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-ds445',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 445 W (bifacial, silver frame)',
    note:    'Verified from ProSun/Huasun official datasheet. BSTC Pmax: 490 W.',
    voc:  41.09,
    vmp:  34.26,
    isc:  13.45,
    imp:  12.99,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 445, length: 1722, width: 1134,
    priceEur: 62, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.79,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-ds450',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 450 W (bifacial, silver frame)',
    note:    'Top of DS (silver frame) range. BSTC Pmax: 495 W. Verified from ProSun/Huasun official datasheet.',
    voc:  41.34,
    vmp:  34.51,
    isc:  13.5,
    imp:  13.04,
    maxfuse: 25,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 450, length: 1722, width: 1134,
    priceEur: 63, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 23.04,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-dsn430',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 Black 430 W (bifacial, black frame)',
    note:    'Black-frame variant (\'Black Series\'). Up to 95% bifaciality. Same cell technology as DS series but different Voc/Vmp/Isc/Imp values due to different cell binning. BSTC Pmax: 480 W. Verified from Huasun official DSN datasheet.',
    voc:  41.37,
    vmp:  34.6,
    isc:  12.95,
    imp:  12.43,
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 430, length: 1722, width: 1134,
    priceEur: 60, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.02,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSNxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-dsn435',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 Black 435 W (bifacial, black frame)',
    note:    'Cross-verified against Synapsun distributor product page (Vmp 34.86 V, Imp 12.48 A, Voc 41.64 V, Isc 13.00 A confirmed). BSTC Pmax: 485 W.',
    voc:  41.64,
    vmp:  34.86,
    isc:  13,
    imp:  12.48,
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 435, length: 1722, width: 1134,
    priceEur: 61, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.28,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSNxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-dsn440',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 Black 440 W (bifacial, black frame)',
    note:    'Verified from Huasun official DSN datasheet. BSTC Pmax: 490 W.',
    voc:  41.91,
    vmp:  35.12,
    isc:  13.05,
    imp:  12.53,
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 62, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.53,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSNxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-dsn445',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 Black 445 W (bifacial, black frame)',
    note:    'Verified from Huasun official DSN datasheet. BSTC Pmax: 495 W.',
    voc:  42.18,
    vmp:  35.38,
    isc:  13.1,
    imp:  12.58,
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 445, length: 1722, width: 1134,
    priceEur: 62, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 22.79,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSNxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hs-182-b108-dsn450',
    brandId:  'huasun',
    name:    'Huasun Himalaya G10 Black 450 W (bifacial, black frame)',
    note:    'Top of DSN (black frame) range. BSTC Pmax: 500 W. Verified from Huasun official DSN datasheet.',
    voc:  42.44,
    vmp:  35.63,
    isc:  13.15,
    imp:  12.63,
    lv:   -0.24,
    li:    0.04,
    nmot:  44,
    pmax: 450, length: 1722, width: 1134,
    priceEur: 63, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.26,   /* Pmpp temp coeff %/°C */
    efficiency: 23.04,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     22,   /* kg */
    datasheet: 'https://www.prosunsolar.com.au/wp-content/uploads/2023/10/Datasheet-HS-182-B108DSNxxx-02.10.23.pdf',
  },
  {
    id:      'huasun-hsn-210r-s96dsb460',
    brandId:  'huasun',
    name:    'Huasun Himalaya HSN-210R-S96DSB460 (460 W)',
    note:    '96 half-cells HJT 210mm cells, 1762x1134mm, 21.6 kg. Residential successor to HS-182-B108 series. Source: comparepv.com.',
    voc:  36.92,
    vmp:  31.05,
    isc:  15.75,
    imp:  14.82,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.04,
    nmot:  43,
    pmax: 460, length: 1762, width: 1134,
    priceEur: 64, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.24,   /* Pmpp temp coeff %/°C */
    efficiency: 23,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     21.6,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/hsn-210r-s96dsb-445-470-en-20250814-0cfd271e7f7a.pdf',
    cpv: 1,
  },
  {
    id:      'huasun-hsn-210r-s96dsb465',
    brandId:  'huasun',
    name:    'Huasun Himalaya HSN-210R-S96DSB465 (465 W)',
    note:    '96 half-cells HJT 210mm cells, 1762x1134mm, 21.6 kg. Source: comparepv.com.',
    voc:  37.02,
    vmp:  31.16,
    isc:  15.86,
    imp:  14.93,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.04,
    nmot:  43,
    pmax: 465, length: 1762, width: 1134,
    priceEur: 65, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.24,   /* Pmpp temp coeff %/°C */
    efficiency: 23.3,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     21.6,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/hsn-210r-s96dsb-445-470-en-20250814-0cfd271e7f7a.pdf',
    cpv: 1,
  },
  {
    id:      'huasun-hsn-210r-s96dsb470',
    brandId:  'huasun',
    name:    'Huasun Himalaya HSN-210R-S96DSB470 (470 W)',
    note:    '96 half-cells HJT 210mm cells, 1762x1134mm, 21.6 kg. Source: comparepv.com.',
    voc:  37.12,
    vmp:  31.27,
    isc:  15.97,
    imp:  15.04,
    maxfuse: 30,   /* A - max series fuse (Iprod,FV), datasheet */
    lv:   -0.22,
    li:    0.04,
    nmot:  43,
    pmax: 470, length: 1762, width: 1134,
    priceEur: 66, priceSrc: 'est. HJT premium EUR/Wp', eurPerWp: 0.14,
    gamma: -0.24,   /* Pmpp temp coeff %/°C */
    efficiency: 23.5,   /* datasheet STC module efficiency % */
    cellType:   'HJT',
    weight:     21.6,   /* kg */
    datasheet: 'https://comparepv.com/datasheets/hsn-210r-s96dsb-445-470-en-20250814-0cfd271e7f7a.pdf',
    cpv: 1,
  },
  /* ─── EGE ─── */
  {
    id:      'ege-ege-450w-144m-m6',
    brandId:  'ege',
    name:    'Helios EGE-450W-144M M6 (450 W)',
    note:    'Mono-Si PERC, 144 cells (166×83 mm), 2102×1040×35 mm, 24.5 kg. NMOT 41±3°C (⚠ newer EGE datasheets list 43°C; verify). Source: Eco Green Energy Helios Plus EGE-450W-144M(M6) datasheet (2024).',
    voc:  49.28,
    vmp:  40.96,
    isc:  11.57,
    imp:  10.99,
    lv:   -0.3,
    li:    0.05,
    nmot:  41,
    pmax: 450, length: 2102, width: 1040,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.35,   /* Pmpp temp coeff %/°C */
    efficiency: 20.58,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     24.5,   /* kg */
    datasheet: 'https://eco-greenenergy.com/wp-content/uploads/2024/05/HELIOS-PLUS-445-455M-144-M6-MONO-9BB-English-Full-black.pdf',
  },
  {
    id:      'ege-ege-445w-144m-m6',
    brandId:  'ege',
    name:    'Helios Plus EGE-445W-144M M6 (445 W)',
    note:    '144 half-cells, M6 166mm, 9BB. TÜV certified. ⚠ Existing 450W entry has nmot=41 — verify against datasheet.',
    voc:  49.14,
    vmp:  40.84,
    isc:  11.48,
    imp:  10.9,
    lv:   -0.3,
    li:    0.05,
    nmot:  43,
    pmax: 445, length: 2094, width: 1038,
    priceEur: 45, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.35,   /* Pmpp temp coeff %/°C */
    efficiency: 20.36,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     24.5,   /* kg */
    datasheet: 'https://eco-greenenergy.com/wp-content/uploads/2024/05/HELIOS-PLUS-445-455M-144-M6-MONO-9BB-English-Full-black.pdf',
  },
  {
    id:      'ege-ege-455w-144m-m6',
    brandId:  'ege',
    name:    'Helios Plus EGE-455W-144M M6 (455 W)',
    note:    '144 half-cells, M6 166mm, 9BB. TÜV certified.',
    voc:  49.41,
    vmp:  41.06,
    isc:  11.66,
    imp:  11.08,
    lv:   -0.3,
    li:    0.05,
    nmot:  43,
    pmax: 455, length: 2094, width: 1038,
    priceEur: 46, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.35,   /* Pmpp temp coeff %/°C */
    efficiency: 20.81,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     24.5,   /* kg */
    datasheet: 'https://eco-greenenergy.com/wp-content/uploads/2024/05/HELIOS-PLUS-445-455M-144-M6-MONO-9BB-English-Full-black.pdf',
  },
  {
    id:      'ege-ege-440w-120m-m10',
    brandId:  'ege',
    name:    'Atlas EGE-440W-120M M10 (440 W)',
    note:    '120 half-cells, M10 182mm cells. Atlas series (compact format vs Helios 2108mm).',
    voc:  41,
    vmp:  34.1,
    isc:  13.67,
    imp:  12.91,
    lv:   -0.27,
    li:    0.048,
    nmot:  43,
    pmax: 440, length: 1722, width: 1134,
    priceEur: 44, priceSrc: 'est. tier-1 EUR/Wp', eurPerWp: 0.1,
    gamma: -0.35,   /* Pmpp temp coeff %/°C */
    efficiency: 20.31,   /* datasheet STC module efficiency % */
    cellType:   'PERC',
    weight:     27.5,   /* kg */
    datasheet: 'https://eco-greenenergy.com/wp-content/uploads/2024/05/EGE-440-460W-120MGM10-EN.pdf',
  },
];

function populateModuleSelect() {
  const sel = document.getElementById('ss-module');
  if (!sel) return;
  /* Group by brand using MODULE_BRANDS order */
  MODULE_BRANDS.forEach(brand => {
    const models = MODULE_LIST.filter(mod => mod.brandId === brand.id);
    if (!models.length) return;
    const grp = document.createElement('optgroup');
    grp.label = brand.name;
    models.forEach(mod => {
      const opt = document.createElement('option');
      opt.value       = mod.id;
      opt.textContent = mod.name;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });
}

function loadModuleTemplate(id) {
  if (!id) return;
  const mod = MODULE_LIST.find(m => m.id === id);
  if (!mod) return;

  document.getElementById('ss-voc').value  = mod.voc;
  document.getElementById('ss-vmp').value  = mod.vmp;
  document.getElementById('ss-isc').value  = mod.isc;
  document.getElementById('ss-imp').value  = mod.imp;
  document.getElementById('ss-lv').value   = mod.lv;
  document.getElementById('ss-li').value   = mod.li;
  document.getElementById('ss-nmot').value = mod.nmot;

  const noteEl = document.getElementById('ss-module-note');
  if (noteEl) {
    var noteHtml = mod.note ? mod.note.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    if (mod.datasheet) {
      noteHtml += (noteHtml ? ' ' : '') +
        '<a href="' + mod.datasheet + '" target="_blank" rel="noopener" style="color:var(--link)">' +
        '&#128196; Datasheet</a>';
    }
    noteEl.innerHTML = noteHtml;
  }
}

/* Micro-inverters use a 1:1 (one module per inverter) topology, so the §11 series/parallel
   string-sizing math does not apply. When one is selected, show an explanatory note instead. */
function isMicroInverter(id) {
  if (typeof INVERTER_LIST === 'undefined') return false;
  var inv = INVERTER_LIST.find(function (i) { return i.id === id; });
  return !!(inv && inv.type === 'micro');
}
function showMicroNote() {
  var msg = (typeof t === 'function') ? t('ss.micro')
    : 'Micro-inverter - 1:1 module topology; series string sizing (§11) does not apply.';
  var m = document.getElementById('ss-metrics'); if (m) m.innerHTML = '<div class="hint-box" style="grid-column:1/-1">' + msg + '</div>';
  var iv = document.getElementById('ss-intermediate'); if (iv) { iv.style.display = 'none'; }
  var tw = document.getElementById('ss-table-wrap'); if (tw) { tw.style.display = 'none'; tw.innerHTML = ''; }
  var w  = document.getElementById('ss-warnings'); if (w) w.innerHTML = '';
}

function calcString() {
  var ssSel = document.getElementById('ss-inverter');
  if (ssSel && isMicroInverter(ssSel.value)) { showMicroNote(); return; }
  const voc      = parseFloat(document.getElementById('ss-voc').value);
  const vmp      = parseFloat(document.getElementById('ss-vmp').value);
  const isc      = parseFloat(document.getElementById('ss-isc').value);
  const imp      = parseFloat(document.getElementById('ss-imp').value);
  const lv       = parseFloat(document.getElementById('ss-lv').value);
  const li       = parseFloat(document.getElementById('ss-li').value);
  const nmot     = parseFloat(document.getElementById('ss-nmot').value);
  const vinvmax  = parseFloat(document.getElementById('ss-vinvmax').value);
  const vrmppt   = parseFloat(document.getElementById('ss-vrmppt').value);
  const vmpptmin = parseFloat(document.getElementById('ss-vmpptmin').value);
  const vmpptmax = parseFloat(document.getElementById('ss-vmpptmax').value);
  const impptmax = parseFloat(document.getElementById('ss-impptmax').value);
  const iscmppt  = parseFloat(document.getElementById('ss-iscmppt').value);
  const tamin    = parseFloat(document.getElementById('ss-tamin').value);
  const tamax    = parseFloat(document.getElementById('ss-tamax').value);
  const gmin     = parseFloat(document.getElementById('ss-gmin').value);
  const gmax     = parseFloat(document.getElementById('ss-gmax').value);

  const nmot_lo = nmot * (1 - 0.03);                              // NMOT −3% tolerance → coldest module (Neamț §11, eq.4 note)
  const nmot_hi = nmot * (1 + 0.03);                              // NMOT +3% tolerance → hottest module
  const tmin    = tamin + (nmot_lo - 20) * gmin / 800;           // cell temp: cold site, low irr, NMOT−3%
  const tmax    = tamax + (nmot_hi - 20) * gmax / 800;           // cell temp: hot site, peak irr, NMOT+3%
  const voc_max = voc * (1 + lv / 100 * (tmin - 25)); // V_OC rises as cell cools
  const voc_min = voc * (1 + lv / 100 * (tmax - 25)); // V_OC falls as cell heats
  const vmp_min = vmp * (1 + lv / 100 * (tmax - 25)); // V_mp at hottest
  const vmp_max = vmp * (1 + lv / 100 * (tmin - 25)); // V_mp at coldest
  const isc_max = isc * (1 + li / 100 * (tmax - 25)) * gmax / 1000; // I_SC peaks: hot + Gmax
  const isc_min = isc * (1 + li / 100 * (tmin - 25)) * gmin / 1000; // I_SC lowest: cold + Gmin
  const imp_max = imp * (1 + li / 100 * (tmax - 25)) * gmax / 1000; // I_mp operating: hot + Gmax
  const imp_min = imp * (1 + li / 100 * (tmin - 25)) * gmin / 1000; // I_mp operating: cold + Gmin

  const ns_max  = Math.floor(vinvmax / voc_max);
  const ns_min  = Math.ceil(vmpptmin / vmp_min);
  const nopt    = Math.floor(vrmppt / vmp);
  // Np limited by inverter's short-circuit current tolerance (fault protection) - eq.10: Isc,MPPT / Isc,max
  const np_sc   = Math.floor(iscmppt / isc_max);
  // Np additionally limited by MPPT's max continuous operating current (Np × Imp,max ≤ Imax,MPPT) - eq.9
  const np_op   = Math.floor(impptmax / imp_max);
  const np_max  = Math.min(np_sc, np_op);
  // Single-string current checks (one string per MPPT input) - eq.13 & eq.14
  const ok13    = imp_max <= impptmax;   // Imp,max ≤ Imax,MPPT
  const ok14    = isc_max <= iscmppt;    // Isc,max ≤ Isc,MPPT

  const inp = { voc, vmp, isc, imp, lv, li, nmot, nmot_lo, nmot_hi, vinvmax, vrmppt, vmpptmin, vmpptmax, impptmax, iscmppt, tamin, tamax, gmin, gmax };
  const res = { tmin, tmax, voc_max, voc_min, vmp_max, vmp_min, isc_max, isc_min, imp_max, imp_min, ns_max, ns_min, nopt, np_max, np_sc, np_op, ok13, ok14 };
  renderStringResults(inp, res);

  /* Persist the §11 headline results so the project report (step 24) can show them.
     No-op in read-only/shared view (Project.patch guards), so the shared snapshot is preserved. */
  if (typeof Project !== 'undefined') {
    const recNs = (ns_min <= nopt && nopt <= ns_max) ? nopt : Math.min(ns_max, Math.max(ns_min, nopt));
    const valid = ns_min <= ns_max && np_max >= 1 && ok13 && ok14;
    Project.patch('stringSizing', {
      nsMin: ns_min, nsMax: ns_max, nopt: nopt, npMax: np_max, recNs: recNs,
      vocMax: voc_max, vmpMin: vmp_min, tmin: tmin, tmax: tmax, vinvmax: vinvmax,
      /* site design inputs - exported with the project, shown in reports, reused by
         Connections (Voc at T_a,min, ampacity derating at T_a,max) + the Teorie (Anexa 1)
         page (theory.html reads these to substitute live values into the formulas) */
      tamin: tamin, tamax: tamax, gmin: gmin, gmax: gmax,
      nmot: nmot, voc: voc, vmp: vmp, lv: lv,
      isc: isc, imp: imp, li: li,
      stringVocCold: recNs * voc_max, valid: valid,
    });
  }
}

function renderStringResults(inp, res) {
  const { tmin, tmax, voc_max, voc_min, vmp_max, vmp_min, isc_max, isc_min, imp_max, imp_min, ns_max, ns_min, nopt, np_max, np_sc, np_op, ok13, ok14 } = res;
  const np_eff = np_max;

  const okBadge = ok =>
    `<span class="badge ${ok ? 'badge-ok' : 'badge-fail'}" style="font-size:10px;margin-left:5px">${ok ? 'OK' : 'FAIL'}</span>`;
  const metricHtml = (val, lbl, sub, ok) => `
    <div class="metric">
      <div class="metric-val">${val}${ok != null ? okBadge(ok) : ''}</div>
      <div class="metric-lbl">${lbl}</div>
      <div class="metric-sub">${sub}</div>
    </div>`;

  document.getElementById('ss-metrics').innerHTML =
    metricHtml(ns_max, 'N<sub>s,max</sub>', t('ss.ns_max_sub'), ns_max >= ns_min && ns_max >= 1) +
    metricHtml(ns_min, 'N<sub>s,min</sub>', t('ss.ns_min_sub'), ns_min <= ns_max && ns_min >= 1) +
    metricHtml(
      ns_min <= nopt && nopt <= ns_max ? nopt : `${nopt}*`,
      'N<sub>opt</sub>', t('ss.nopt_sub'), ns_min <= nopt && nopt <= ns_max,
    ) +
    metricHtml(np_eff, 'N<sub>p,max</sub>', t('ss.np_max_sub'), np_eff >= 1);

  /* ── "Mod explicativ" working: plain-language Explain.block cards (same style as
        consumption/yield) - each shows the formula, the live substitution, and a one-line
        description of what the quantity means and why it matters. ── */
  const iv = document.getElementById('ss-intermediate');
  if (typeof Explain !== 'undefined') {
    let xp = '';
    xp += Explain.block(
      'T<sub>c,min</sub> = T<sub>a,min</sub> + (N<sub>MOT</sub>−20)·G<sub>min</sub>/800',
      `${inp.tamin} + (${inp.nmot_lo.toFixed(1)}−20)·${inp.gmin}/800 = <b>${tmin.toFixed(1)} °C</b>`,
      'ss.xpl.tmin');
    xp += Explain.block(
      'T<sub>c,max</sub> = T<sub>a,max</sub> + (N<sub>MOT</sub>−20)·G<sub>max</sub>/800',
      `${inp.tamax} + (${inp.nmot_hi.toFixed(1)}−20)·${inp.gmax}/800 = <b>${tmax.toFixed(1)} °C</b>`,
      'ss.xpl.tmax');
    xp += Explain.block(
      'V<sub>OC,max</sub> = V<sub>OC,STC</sub> · [1 + λ<sub>V</sub>/100·(T<sub>c,min</sub>−25)]',
      `${inp.voc} · [1 + ${inp.lv}/100·(${tmin.toFixed(1)}−25)] = <b>${voc_max.toFixed(1)} V</b>`,
      'ss.xpl.vocmax');
    xp += Explain.block(
      'V<sub>mp,min</sub> = V<sub>mp,STC</sub> · [1 + λ<sub>V</sub>/100·(T<sub>c,max</sub>−25)]',
      `${inp.vmp} · [1 + ${inp.lv}/100·(${tmax.toFixed(1)}−25)] = <b>${vmp_min.toFixed(1)} V</b>`,
      'ss.xpl.vmpmin');
    xp += Explain.block(
      'I<sub>SC,max</sub> = I<sub>SC,STC</sub> · [1 + λ<sub>I</sub>/100·(T<sub>c,max</sub>−25)] · G<sub>max</sub>/1000',
      `${inp.isc} · [1 + ${inp.li}/100·(${tmax.toFixed(1)}−25)] · ${inp.gmax}/1000 = <b>${isc_max.toFixed(2)} A</b>`,
      'ss.xpl.currents');
    xp += Explain.block(
      'N<sub>s,max</sub> = ⌊V<sub>max,inv</sub> / V<sub>OC,max</sub>⌋',
      `⌊${inp.vinvmax} / ${voc_max.toFixed(1)}⌋ = <b>${ns_max}</b>`,
      'ss.xpl.nsmax');
    xp += Explain.block(
      'N<sub>s,min</sub> = ⌈V<sub>min,MPPT</sub> / V<sub>mp,min</sub>⌉',
      `⌈${inp.vmpptmin} / ${vmp_min.toFixed(1)}⌉ = <b>${ns_min}</b>`,
      'ss.xpl.nsmin');
    xp += Explain.block(
      'N<sub>opt</sub> = ⌊V<sub>r,MPPT</sub> / V<sub>mp,STC</sub>⌋',
      `⌊${inp.vrmppt} / ${inp.vmp}⌋ = <b>${nopt}</b>`,
      'ss.xpl.nopt');
    xp += Explain.block(
      'N<sub>p,max</sub> = ⌊min(I<sub>max,MPPT</sub>/I<sub>mp,max</sub>, I<sub>sc,MPPT</sub>/I<sub>SC,max</sub>)⌋',
      `⌊min(${inp.impptmax}/${imp_max.toFixed(2)}, ${inp.iscmppt}/${isc_max.toFixed(2)})⌋ = <b>${np_max}</b>`,
      'ss.xpl.npmax');
    iv.innerHTML = `<div style="font-weight:500;margin-bottom:.5rem">${t('ss.intermediate')}</div>${xp}`;
  }

  const tw = document.getElementById('ss-table-wrap');
  tw.style.display = '';
  if (ns_max < ns_min || ns_max < 1) {
    tw.innerHTML = `<div style="font-size:12px;font-weight:500;color:var(--text);margin-bottom:.6rem">${t('ss.configs')}</div>
      <div style="font-size:12px;color:var(--text3)">${t('ss.no_valid')}</div>`;
  } else {
    let rows = '';
    for (let ns = ns_min; ns <= ns_max; ns++) {
      const voc_str = (ns * voc_max).toFixed(1);
      const vmp_hot = (ns * vmp_min).toFixed(1);
      const vmp_stc = (ns * inp.vmp).toFixed(1);
      const inMppt  = (ns * vmp_min) >= inp.vmpptmin && (ns * inp.vmp) <= inp.vmpptmax;
      const isOpt   = ns === nopt;
      rows += `<tr${isOpt ? ' class="opt-row"' : ''}>
        <td>${ns}${isOpt ? ` <span class="badge badge-ok">opt</span>` : ''}</td>
        <td>${voc_str} V</td><td>${vmp_hot} V</td><td>${vmp_stc} V</td>
        <td><span class="badge ${inMppt ? 'badge-ok' : 'badge-fail'}">${inMppt ? '&#x2713; Yes' : '&#x2717; No'}</span></td>
        <td>1&ndash;${np_eff}</td>
      </tr>`;
    }
    tw.innerHTML = `<div style="font-size:12px;font-weight:500;color:var(--text);margin-bottom:.6rem">${t('ss.configs')} &mdash; N<sub>s</sub>: ${ns_min}&ndash;${ns_max}</div>
      <table class="ss-table">
        <thead><tr><th>N<sub>s</sub></th><th>V<sub>OC</sub> (V) · cold</th><th>V<sub>mp</sub> (V) · hot</th><th>V<sub>mp</sub> (V) · STC</th><th>${t('ss.in_mppt')}</th><th>N<sub>p</sub></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="font-size:10px;color:var(--text3);margin-top:.4rem">MPPT check: V<sub>mp,hot</sub> &ge; V<sub>min,MPPT</sub> (${inp.vmpptmin}&nbsp;V) &amp;&amp; V<sub>mp,STC</sub> &le; V<sub>max,MPPT</sub> (${inp.vmpptmax}&nbsp;V) &middot; N<sub>p</sub> (eq.10): floor(I<sub>sc,MPPT</sub>&nbsp;/&nbsp;I<sub>SC,max</sub>) = floor(${inp.iscmppt}&nbsp;/&nbsp;${isc_max.toFixed(2)}) = ${np_sc}, further limited (eq.9) by I<sub>max,MPPT</sub>&nbsp;/&nbsp;I<sub>mp,max</sub> = floor(${inp.impptmax}&nbsp;/&nbsp;${imp_max.toFixed(2)}) = ${np_op}</div>`;
  }

  const warns = [];
  if (ns_min > ns_max)
    warns.push({ cls: 'warn-box', msg: `No valid series count: N<sub>s,min</sub>&nbsp;(${ns_min}) &gt; N<sub>s,max</sub>&nbsp;(${ns_max}). Inverter voltage window and module voltages are incompatible.` });
  if (nopt < ns_min && ns_min <= ns_max)
    warns.push({ cls: 'hint-box', msg: `N<sub>opt</sub>&nbsp;(${nopt}) is below N<sub>s,min</sub>&nbsp;(${ns_min}) &mdash; use N<sub>s</sub>&nbsp;=&nbsp;${ns_min} as practical minimum instead.` });
  if (nopt > ns_max && ns_min <= ns_max)
    warns.push({ cls: 'hint-box', msg: `N<sub>opt</sub>&nbsp;(${nopt}) exceeds N<sub>s,max</sub>&nbsp;(${ns_max}) &mdash; use N<sub>s</sub>&nbsp;=&nbsp;${ns_max} as practical maximum instead.` });
  if (!ok14)
    warns.push({ cls: 'warn-box', msg: `Single-string check fails (eq.14): I<sub>SC,max</sub>&nbsp;(${isc_max.toFixed(2)}&nbsp;A) &gt; I<sub>sc,MPPT</sub>&nbsp;(${inp.iscmppt}&nbsp;A) &mdash; inverter cannot handle even one string's fault current.` });
  else if (!ok13)
    warns.push({ cls: 'warn-box', msg: `Single-string check fails (eq.13): I<sub>mp,max</sub>&nbsp;(${imp_max.toFixed(2)}&nbsp;A) &gt; I<sub>max,MPPT</sub>&nbsp;(${inp.impptmax}&nbsp;A) &mdash; one string already exceeds the MPPT operating current.` });
  if (np_op < np_sc && np_sc >= 1)
    warns.push({ cls: 'hint-box', msg: `N<sub>p</sub> limited to ${np_op} by max operating current I<sub>max,MPPT</sub>&nbsp;(${inp.impptmax}&nbsp;A): ${np_op}&nbsp;&times;&nbsp;I<sub>mp,max</sub>&nbsp;(${imp_max.toFixed(2)}&nbsp;A)&nbsp;=&nbsp;${(np_op * imp_max).toFixed(1)}&nbsp;A &le; ${inp.impptmax}&nbsp;A.` });
  if (!warns.length && ns_min <= ns_max && np_eff >= 1) {
    const rec = ns_min <= nopt && nopt <= ns_max ? nopt : Math.min(ns_max, Math.max(ns_min, nopt));
    warns.push({ cls: 'ok-box', msg: `Configuration valid. Recommended: <b>N<sub>s</sub>&nbsp;=&nbsp;${rec}</b>, <b>N<sub>p</sub>&nbsp;=&nbsp;1&ndash;${np_eff}</b>. String V<sub>OC</sub> at coldest: ${(rec * voc_max).toFixed(0)}&nbsp;V &le; ${inp.vinvmax}&nbsp;V inverter limit.` });
  }
  document.getElementById('ss-warnings').innerHTML = warns.map(w => `<div class="${w.cls}">${w.msg}</div>`).join('');
}

/* ── Shared multi-inverter helpers (pt 8) ────────────────────────────────────────
   resolveInverterUnits(components) -> the chosen inverter UNITS = the components.inverters
   list (I1, I2, …) resolved against INVERTER_LIST, falling back to the legacy single
   components.inverterId. assignStringsToInverters(strings, components) distributes strings
   across the units by each unit's nmppt capacity (greedy, overflow to the last) - the SAME
   rule schema.html draws, so every page groups strings per inverter identically. */
function resolveInverterUnits(components) {
  components = components || {};
  var byId = function (id) { return (typeof INVERTER_LIST !== 'undefined' && id) ? INVERTER_LIST.find(function (i) { return i.id === id; }) : null; };
  var list = Array.isArray(components.inverters) ? components.inverters : [];
  var units = list.map(function (v) { return byId(v.inverterId); }).filter(Boolean);
  if (!units.length && components.inverterId) { var u = byId(components.inverterId); if (u) units = [u]; }
  return units;
}
function assignStringsToInverters(strings, components) {
  var units = resolveInverterUnits(components);
  strings = strings || [];
  if (!units.length) return { units: [], assign: strings.map(function () { return -1; }) };
  var caps = units.map(function (u) { return (u.type !== 'micro' && u.nmppt) ? u.nmppt : Infinity; });
  var assign = [], ui = 0, used = 0;
  strings.forEach(function () { while (ui < units.length - 1 && used >= caps[ui]) { ui++; used = 0; } assign.push(ui); used++; });
  return { units: units, assign: assign };
}
