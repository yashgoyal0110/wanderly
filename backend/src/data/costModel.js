// Rough travel cost model used to seed the CostProfile collection.
// All values are USD. A cost index of 1.0 ≈ a mid-priced Western European city.

const SUBREGION_INDEX = {
  'Northern Europe': 1.45,
  'Western Europe': 1.35,
  'Southern Europe': 1.0,
  'Central Europe': 0.8,
  'Eastern Europe': 0.62,
  'Southeast Europe': 0.65,
  'North America': 1.45,
  'Central America': 0.62,
  Caribbean: 1.05,
  'South America': 0.6,
  'Eastern Asia': 0.9,
  'South-Eastern Asia': 0.45,
  'Southern Asia': 0.35,
  'Central Asia': 0.45,
  'Western Asia': 0.8,
  'Northern Africa': 0.5,
  'Western Africa': 0.6,
  'Eastern Africa': 0.62,
  'Middle Africa': 0.7,
  'Southern Africa': 0.6,
  'Australia and New Zealand': 1.4,
  Melanesia: 0.95,
  Micronesia: 1.05,
  Polynesia: 1.25,
};

const COUNTRY_INDEX = {
  CHE: 2.0, NOR: 1.8, ISL: 1.9, DNK: 1.65, SWE: 1.45, FIN: 1.4, IRL: 1.5, GBR: 1.5, LUX: 1.6, MCO: 2.3, LIE: 1.9,
  NLD: 1.4, BEL: 1.3, AUT: 1.3, FRA: 1.35, DEU: 1.25, ITA: 1.2, ESP: 1.0, PRT: 0.9, GRC: 0.95, MLT: 1.0, CYP: 1.0,
  HRV: 0.95, SVN: 0.9, CZE: 0.8, POL: 0.7, HUN: 0.7, SVK: 0.75, ROU: 0.6, BGR: 0.55, SRB: 0.55, ALB: 0.5, MKD: 0.5,
  BIH: 0.5, MNE: 0.65, UKR: 0.45, RUS: 0.6, GEO: 0.5, ARM: 0.5, AZE: 0.55, TUR: 0.55, EST: 0.85, LVA: 0.75, LTU: 0.72,
  USA: 1.5, CAN: 1.35, MEX: 0.65, CRI: 0.85, PAN: 0.8, GTM: 0.55, BLZ: 0.85, CUB: 0.7, JAM: 0.9, BHS: 1.6, BRB: 1.4,
  DOM: 0.7, HTI: 0.7, PRI: 1.2, BRA: 0.7, ARG: 0.55, CHL: 0.8, PER: 0.55, COL: 0.5, ECU: 0.55, BOL: 0.42, URY: 0.85,
  PRY: 0.45, VEN: 0.6,
  JPN: 1.1, KOR: 0.95, CHN: 0.7, TWN: 0.75, HKG: 1.35, MAC: 1.2, MNG: 0.5, SGP: 1.5, MYS: 0.5, THA: 0.5, VNM: 0.4,
  KHM: 0.4, LAO: 0.35, MMR: 0.4, IDN: 0.45, PHL: 0.45, BRN: 0.85, TLS: 0.6,
  IND: 0.3, NPL: 0.3, LKA: 0.4, BGD: 0.3, PAK: 0.3, BTN: 1.6, MDV: 1.8, AFG: 0.5,
  ARE: 1.3, QAT: 1.3, SAU: 1.1, KWT: 1.1, BHR: 1.05, OMN: 1.0, ISR: 1.5, JOR: 0.75, LBN: 0.75, IRN: 0.35, IRQ: 0.6,
  EGY: 0.4, MAR: 0.5, TUN: 0.45, DZA: 0.5, ZAF: 0.6, KEN: 0.65, TZA: 0.75, UGA: 0.55, RWA: 0.65, ETH: 0.5, NAM: 0.7,
  BWA: 0.9, ZWE: 0.75, ZMB: 0.7, MOZ: 0.6, MDG: 0.5, MUS: 0.9, SYC: 1.6, CPV: 0.7, SEN: 0.65, GHA: 0.6, NGA: 0.65,
  AUS: 1.4, NZL: 1.35, FJI: 0.95, PYF: 1.6,
};

// Daily per-person costs at index 1.0. Accommodation is per room (sleeps two).
export const BASE_TIERS = {
  budget: { accommodation: 35, food: 20, transport: 8, activities: 12 },
  mid: { accommodation: 110, food: 45, transport: 18, activities: 30 },
  luxury: { accommodation: 380, food: 130, transport: 65, activities: 110 },
};

const REGION_FLIGHT = { Europe: 550, Americas: 650, Asia: 800, Africa: 900, Oceania: 1300, Antarctic: 3000 };

const round = (n) => Math.max(1, Math.round(n));

export function costIndexFor(country) {
  return COUNTRY_INDEX[country.cca3] ?? SUBREGION_INDEX[country.subregion] ?? 0.8;
}

export function buildCostProfile(country) {
  const index = costIndexFor(country);
  // Cheap countries still have a floor for international-standard hotels.
  const accFactor = (tier) => (tier === 'luxury' ? Math.max(index, 0.55) : index);
  const daily = {};
  for (const [tier, items] of Object.entries(BASE_TIERS)) {
    daily[tier] = {
      accommodation: round(items.accommodation * accFactor(tier)),
      food: round(items.food * index),
      transport: round(items.transport * index),
      activities: round(items.activities * index),
    };
  }
  const economy = REGION_FLIGHT[country.region] ?? 800;
  return {
    cca3: country.cca3,
    name: country.name,
    region: country.region,
    subregion: country.subregion,
    currency: 'USD',
    costIndex: index,
    daily,
    flight: { budget: round(economy * 0.8), mid: round(economy), luxury: round(economy * 3.5) },
  };
}
