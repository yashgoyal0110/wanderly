// Builds src/data/countries.json by merging several open datasets.
// Run with: npm run build:countries
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const worldCountries = require('world-countries');
const capitals = require('capitals-coordinates').rawData;
const cj = (f) => require(`country-json/src/country-by-${f}.json`);

const isoByName = new Map(cj('iso-numeric').map((r) => [r.country, String(r.iso).padStart(3, '0')]));
const byIso = (file, key) => {
  const m = new Map();
  for (const r of cj(file)) {
    const iso = isoByName.get(r.country);
    if (iso && r[key] != null) m.set(iso, r[key]);
  }
  return m;
};
const population = byIso('population', 'population');
const dish = byIso('national-dish', 'dish');
const government = byIso('government-type', 'government');
const temperature = byIso('yearly-average-temperature', 'temperature');

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
const capByCity = new Map(capitals.map((c) => [norm(c.properties.capital), c.geometry.coordinates]));
const capByCountry = new Map(capitals.map((c) => [norm(c.properties.country), c.geometry.coordinates]));

const out = worldCountries
  .filter((c) => c.cca3 !== 'ATA')
  .map((c) => {
    const capital = c.capital?.[0] || null;
    const coords = capByCity.get(norm(capital)) || capByCountry.get(norm(c.name.common)) || null;
    return {
      cca3: c.cca3,
      cca2: c.cca2,
      ccn3: c.ccn3 || null,
      name: c.name.common,
      officialName: c.name.official,
      flag: c.flag,
      capital,
      capitalLatLng: coords ? [coords[1], coords[0]] : null,
      region: c.region,
      subregion: c.subregion || c.region,
      latlng: c.latlng,
      area: c.area,
      landlocked: c.landlocked,
      borders: c.borders || [],
      languages: Object.values(c.languages || {}),
      currencies: Object.entries(c.currencies || {}).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol })),
      population: population.get(c.ccn3) ?? null,
      nationalDish: dish.get(c.ccn3) ?? null,
      government: government.get(c.ccn3) ?? null,
      avgTemperatureC: temperature.get(c.ccn3) ?? null,
      altSpellings: c.altSpellings || [],
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const dest = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/countries.json');
writeFileSync(dest, JSON.stringify(out));
console.log(`Wrote ${out.length} countries (${out.filter((c) => c.capitalLatLng).length} with capital coords) to ${dest}`);
