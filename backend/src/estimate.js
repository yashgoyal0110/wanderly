import { countryByCode } from './data/countries.js';
import { buildCostProfile } from './data/costModel.js';
import { toUSD, fromUSD } from './data/currency.js';

const TIERS = ['budget', 'mid', 'luxury'];
const CATEGORIES = ['accommodation', 'food', 'transport', 'activities'];

export function distanceKm([lat1, lon1], [lat2, lon2]) {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

function flightCosts(profile, country, origin) {
  if (!origin) return { ...profile.flight, source: 'regional average' };
  if (origin.cca3 === country.cca3) return { budget: 40, mid: 90, luxury: 250, source: 'domestic' };
  const km = distanceKm(origin.capitalLatLng || origin.latlng, country.capitalLatLng || country.latlng);
  const economy = Math.round(120 + km * 0.075);
  return { budget: Math.round(economy * 0.8), mid: economy, luxury: Math.round(economy * 3.5), distanceKm: Math.round(km), source: `from ${origin.name}` };
}

export function computeTiers(profile, country, { days, travelers, origin }) {
  const rooms = Math.ceil(travelers / 2);
  const flights = flightCosts(profile, country, origin);
  const tiers = {};
  for (const tier of TIERS) {
    const d = profile.daily[tier];
    const breakdown = {
      accommodation: d.accommodation * rooms * days,
      food: d.food * travelers * days,
      transport: d.transport * travelers * days,
      activities: d.activities * travelers * days,
      flights: flights[tier] * travelers,
    };
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const groundPerDay = d.accommodation * rooms + (d.food + d.transport + d.activities) * travelers;
    tiers[tier] = { breakdown, total, groundPerDay, perPersonPerDay: Math.round(groundPerDay / travelers) };
  }
  return { tiers, flights };
}

function itinerary(country, tier, days) {
  const cap = country.capital || 'the main city';
  const dish = country.nationalDish ? `try ${country.nationalDish}` : 'sample the local specialties';
  const style = {
    budget: { stay: 'hostel or guesthouse', eat: 'street food and local markets', move: 'public transport and walking', extra: 'free walking tour' },
    mid: { stay: 'well-rated 3–4★ hotel', eat: 'popular local restaurants', move: 'trains, metro and the occasional taxi', extra: 'guided museum or day tour' },
    luxury: { stay: '5★ hotel or boutique resort', eat: 'chef-led tasting menus', move: 'private transfers and first-class rail', extra: 'private guide and exclusive experiences' },
  }[tier];
  const plan = [{ day: 1, title: `Arrive in ${cap}`, detail: `Check into a ${style.stay}; evening stroll and ${dish}.` }];
  const middle = [
    { title: `Discover ${cap}`, detail: `Landmarks, old town and a ${style.extra}.` },
    { title: 'Food & culture day', detail: `Markets, ${style.eat}, and a cultural show or museum.` },
    { title: `Day trip beyond ${cap}`, detail: `Explore nature or a nearby town using ${style.move}.` },
    { title: 'Regional highlight', detail: `Head to another ${country.subregion} highlight within ${country.name}.` },
    { title: 'Slow day', detail: tier === 'luxury' ? 'Spa, fine dining and a sunset experience.' : 'Parks, cafés and souvenir hunting.' },
  ];
  for (let i = 2; i < days; i++) plan.push({ day: i, ...middle[(i - 2) % middle.length] });
  if (days > 1) plan.push({ day: days, title: 'Departure', detail: 'Last breakfast, pick up souvenirs and head to the airport.' });
  return plan;
}

function convertDeep(obj, currency) {
  if (typeof obj === 'number') return Math.round(fromUSD(obj, currency));
  if (Array.isArray(obj)) return obj.map((v) => convertDeep(v, currency));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, k === 'distanceKm' ? v : convertDeep(v, currency)]));
  }
  return obj;
}

export async function estimateTrip(input, repo) {
  const days = Math.min(Math.max(parseInt(input.days, 10) || 7, 1), 90);
  const travelers = Math.min(Math.max(parseInt(input.travelers, 10) || 1, 1), 20);
  const currency = (input.currency || 'USD').toUpperCase();
  const country = countryByCode.get(input.cca3);
  if (!country) throw Object.assign(new Error('Unknown country'), { status: 400 });
  const budgetUSD = toUSD(Number(input.budget) || 0, currency);
  if (!(budgetUSD > 0)) throw Object.assign(new Error('Budget must be a positive number'), { status: 400 });
  const origin = input.originCca3 ? countryByCode.get(input.originCca3) : null;

  const profile = (await repo.getCost(country.cca3)) || buildCostProfile(country);
  const { tiers, flights } = computeTiers(profile, country, { days, travelers, origin });

  let verdict;
  if (budgetUSD < tiers.budget.total) verdict = 'insufficient';
  else if (budgetUSD < tiers.mid.total) verdict = 'basic';
  else if (budgetUSD < tiers.luxury.total) verdict = 'comfortable';
  else verdict = 'luxury';

  const planTier = { insufficient: 'budget', basic: 'budget', comfortable: 'mid', luxury: 'luxury' }[verdict];
  const result = {
    country: { cca3: country.cca3, name: country.name, flag: country.flag, capital: country.capital },
    input: { budget: Number(input.budget), currency, days, travelers, originCca3: origin?.cca3 || null, income: input.income ? Number(input.income) : null },
    verdict,
    planTier,
    costIndex: profile.costIndex,
    flightSource: flights.source,
    flightDistanceKm: flights.distanceKm ?? null,
  };

  const money = {
    budget: budgetUSD,
    tiers,
  };

  if (verdict === 'insufficient') {
    money.shortfall = tiers.budget.total - budgetUSD;
    const afterFlights = budgetUSD - tiers.budget.breakdown.flights;
    result.affordableDays = afterFlights > 0 ? Math.floor(afterFlights / tiers.budget.groundPerDay) : 0;
    result.alternatives = await cheaperAlternatives(country, { budgetUSD, days, travelers, origin, currency }, repo);
  } else {
    const base = tiers[planTier];
    const leftover = budgetUSD - base.total;
    const contingency = Math.min(leftover, budgetUSD * 0.1);
    const upgrades = leftover - contingency;
    const allocation = {};
    // Spread the surplus over ground categories so the plan uses the whole budget sensibly.
    const groundTotal = CATEGORIES.reduce((s, c) => s + base.breakdown[c], 0);
    for (const c of CATEGORIES) allocation[c] = base.breakdown[c] + (upgrades * base.breakdown[c]) / groundTotal;
    allocation.flights = base.breakdown.flights;
    allocation.contingency = contingency;
    money.allocation = allocation;
    money.leftover = leftover;
    money.dailySpend = (budgetUSD - base.breakdown.flights - contingency) / days;
    result.itinerary = itinerary(country, planTier, days);
    result.tips = tipsFor(verdict, country);
  }

  if (result.input.income) {
    const incomeUSD = toUSD(result.input.income, currency);
    const months = budgetUSD / incomeUSD;
    result.incomeInsight = {
      monthsOfIncome: Math.round(months * 10) / 10,
      advice:
        months > 3
          ? 'This trip costs more than 3 months of income — consider a shorter trip or saving over a longer period.'
          : months > 1
            ? 'This trip is over a month of income; set aside savings in advance and keep an emergency fund.'
            : 'This budget is comfortably within one month of income.',
    };
  }

  result.money = convertDeep(money, currency);
  return result;
}

function tipsFor(verdict, country) {
  const base = [`Carry some local currency (${country.currencies?.[0]?.code || 'local'}) for small vendors.`];
  if (verdict === 'luxury') return [...base, 'Book signature experiences and top restaurants weeks ahead.', 'Consider business-class flights or a private driver for long transfers.'];
  if (verdict === 'comfortable') return [...base, 'Mix mid-range hotels with one splurge night.', 'Pre-book popular attractions to skip queues.'];
  return [...base, 'Travel in shoulder season for lower prices.', 'Use city passes, public transport and set-menu lunches to stretch your budget.'];
}

async function cheaperAlternatives(country, { budgetUSD, days, travelers, origin, currency }, repo) {
  const all = await repo.allCosts();
  const candidates = [];
  for (const profile of all) {
    const c = countryByCode.get(profile.cca3);
    if (!c || c.cca3 === country.cca3 || c.region === 'Antarctic') continue;
    const { tiers } = computeTiers(profile, c, { days, travelers, origin });
    const km = distanceKm(country.latlng, c.latlng);
    candidates.push({ c, total: tiers.budget.total, km, sameRegion: c.region === country.region, fits: tiers.budget.total <= budgetUSD });
  }
  const fitting = candidates.filter((x) => x.fits).sort((a, b) => b.sameRegion - a.sameRegion || a.km - b.km);
  // Nothing fits: show the cheapest nearby destinations so the user can see what's closest to their budget.
  const picks = fitting.length
    ? fitting
    : candidates.filter((x) => x.km < 3000).sort((a, b) => a.total - b.total);
  return picks.slice(0, 5).map(({ c, total, km, fits }) => ({
    fits,
    cca3: c.cca3,
    name: c.name,
    flag: c.flag,
    region: c.subregion,
    estimatedTotal: Math.round(fromUSD(total, currency)),
    distanceKm: Math.round(km),
  }));
}
