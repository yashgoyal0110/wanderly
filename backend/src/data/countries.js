import { createRequire } from 'module';

const require = createRequire(import.meta.url);
export const countries = require('./countries.json');
export const countryByCode = new Map(countries.map((c) => [c.cca3, c]));
