import 'dotenv/config';
import { connectDb, openCatalog, repo, state, tripMode } from '../db.js';
import { estimateTrip } from '../estimate.js';
import { countries, countryByCode } from '../data/countries.js';
import { generate, geminiConfigured } from '../gemini.js';

const PRIVATE = { 'cache-control': 'private, no-store' };
const summary = (c) => ({
  cca3: c.cca3,
  ccn3: c.ccn3,
  name: c.name,
  flag: c.flag,
  capital: c.capital,
  region: c.region,
  subregion: c.subregion,
  altSpellings: c.altSpellings,
});

const geminiHits = new Map();
function allowGemini(sub) {
  const now = Date.now();
  const recent = (geminiHits.get(sub) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 30) return false;
  recent.push(now);
  geminiHits.set(sub, recent);
  return true;
}

function signedIn(identity) {
  return Boolean(identity?.verified && identity.sub);
}

export async function handleHealth() {
  await connectDb();
  return { status: 200, json: { ok: true, db: state.mode, gemini: geminiConfigured() } };
}

export async function handleCountries({ query = '', cca3 = '' } = {}) {
  if (cca3) {
    const c = countryByCode.get(String(cca3).toUpperCase());
    if (!c) return { status: 404, json: { error: 'Country not found' } };
    const cost = await openCatalog().getCost(c.cca3);
    return {
      status: 200,
      json: {
        ...c,
        borders: c.borders.map((b) => countryByCode.get(b)).filter(Boolean).map((b) => ({ cca3: b.cca3, name: b.name, flag: b.flag })),
        cost,
      },
    };
  }
  const q = String(query).trim().toLowerCase();
  if (!q) return { status: 200, json: countries.map(summary) };
  const scored = countries
    .map((c) => {
      const name = c.name.toLowerCase();
      let score = 0;
      if (name.startsWith(q)) score = 3;
      else if (name.includes(q)) score = 2;
      else if ((c.capital || '').toLowerCase().startsWith(q) || c.altSpellings.some((s) => s.toLowerCase().startsWith(q))) score = 1;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));
  return { status: 200, json: scored.slice(0, 10).map((x) => summary(x.c)) };
}

export async function handleEstimate({ body, identity }) {
  await connectDb();
  try {
    const result = await estimateTrip(body || {}, openCatalog());
    if (signedIn(identity)) {
      const mode = tripMode(identity);
      repo
        .saveTrip(
          { kind: 'search', owner: identity.sub, country: result.country, input: result.input, result: { verdict: result.verdict } },
          mode
        )
        .catch((e) => console.warn('[trips] failed to log search:', e.message));
    }
    return { status: 200, json: result };
  } catch (err) {
    return { status: err.status || 500, json: { error: err.message || 'Could not estimate this trip' } };
  }
}

const SITE_GUIDE = `You are "Atlas", the friendly assistant inside the Wanderly trip-planner website.
How the site works:
- The home page is an interactive world map. Users can drag to pan, scroll or use the +/- buttons to zoom, hover a country to see its name, and click it to zoom in and open its details panel (shape, capital, region, facts).
- The search bar at the top has autocomplete for country names, capitals and alternate spellings — useful if the user doesn't know where a country is.
- After picking a country, the side panel asks for budget, currency, trip length, number of travelers, optional "flying from" country and optional monthly income. "Check my budget" estimates costs.
- Results say whether the budget is enough and show a basic, comfortable or luxury plan with a cost breakdown and itinerary, or (if short) how much more is needed plus cheaper nearby countries. Users can generate an AI itinerary and save plans ("Save trip"); saved trips and recent searches appear under "My trips" in the header.
Answer travel questions (visas, weather, culture, food, safety, costs, packing) helpfully and concisely. Use short paragraphs or bullets. Cost figures from the site are rough estimates; say so when relevant. If unsure about visa or safety rules, advise checking official sources.`;

function deny(identity, what) {
  if (!signedIn(identity)) {
    return { status: 401, json: { error: `Sign in to ${what}.` }, headers: PRIVATE };
  }
  if (!allowGemini(identity.sub)) {
    return { status: 429, json: { error: 'Too many assistant requests. Try again in a little while.' }, headers: PRIVATE };
  }
  return null;
}

export async function handleChat({ body, identity }) {
  const denied = deny(identity, 'chat with the assistant');
  if (denied) return denied;
  const { messages = [], context = {} } = body || {};
  const history = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content.slice(0, 4000) }));
  if (!history.length || history[history.length - 1].role !== 'user') {
    return { status: 400, json: { error: 'Send at least one user message' }, headers: PRIVATE };
  }
  if (!geminiConfigured()) {
    return { status: 503, json: { error: 'The assistant is offline: no Gemini API key is configured on the server.' }, headers: PRIVATE };
  }
  const ctxLines = [];
  if (context.country) ctxLines.push(`Selected country: ${context.country.name} (capital ${context.country.capital || 'n/a'}, ${context.country.subregion || context.country.region || ''}).`);
  if (context.trip) {
    const t = context.trip;
    ctxLines.push(`Current trip inputs: budget ${t.budget} ${t.currency}, ${t.days} days, ${t.travelers} traveler(s).`);
  }
  if (context.result) {
    const r = context.result;
    ctxLines.push(`Latest estimate verdict: ${r.verdict} (plan tier ${r.planTier}). Budget-tier total ${r.money?.tiers?.budget?.total}, mid ${r.money?.tiers?.mid?.total}, luxury ${r.money?.tiers?.luxury?.total} ${r.input?.currency}.`);
  }
  if (context.view) ctxLines.push(`User is currently viewing: ${context.view}.`);
  const system = `${SITE_GUIDE}\n\nCurrent user context:\n${ctxLines.join('\n') || 'No country selected yet.'}`;
  try {
    const reply = await generate({ system, messages: history });
    return { status: 200, json: { reply }, headers: PRIVATE };
  } catch (err) {
    console.warn('[chat] Gemini error:', err.message);
    return { status: 502, json: { error: "Sorry, I couldn't reach the AI service right now. Please try again in a moment." }, headers: PRIVATE };
  }
}

export async function handleAiItinerary({ body, identity }) {
  const denied = deny(identity, 'generate an itinerary');
  if (denied) return denied;
  const { cca3, days = 7, travelers = 1, tier = 'mid', budget, currency = 'USD', interests = '' } = body || {};
  const c = countryByCode.get(cca3);
  if (!c) return { status: 400, json: { error: 'Unknown country' }, headers: PRIVATE };
  const interest = String(interests).slice(0, 300);
  try {
    const text = await generate({
      system: 'You are an expert travel planner. Reply in concise Markdown: a day-by-day itinerary with short bullet points, then 3 money-saving or upgrade tips. No preamble.',
      messages: [
        {
          role: 'user',
          content: `Plan a ${days}-day ${tier === 'budget' ? 'budget-friendly' : tier === 'luxury' ? 'luxurious' : 'comfortable mid-range'} trip to ${c.name} for ${travelers} traveler(s) with a total budget of ${budget} ${currency}. ${interest ? `Interests: ${interest}.` : ''}`,
        },
      ],
      maxOutputTokens: 1500,
    });
    return { status: 200, json: { text }, headers: PRIVATE };
  } catch (err) {
    return { status: err.status || 502, json: { error: err.message || 'Could not generate an itinerary' }, headers: PRIVATE };
  }
}

export async function handleListTrips({ query, identity }) {
  if (!signedIn(identity)) return { status: 401, json: { error: 'Sign in to see your trips.' }, headers: PRIVATE };
  await connectDb();
  const kind = query?.kind === 'plan' || query?.kind === 'search' ? query.kind : undefined;
  const limit = Math.min(Number(query?.limit) || 30, 100);
  const items = await repo.listTrips({ kind, owner: identity.sub, limit, mode: tripMode(identity) });
  return { status: 200, json: items, headers: PRIVATE };
}

export async function handleSaveTrip({ body, identity }) {
  if (!signedIn(identity)) return { status: 401, json: { error: 'Sign in to save a trip.' }, headers: PRIVATE };
  await connectDb();
  const { result, title, notes } = body || {};
  if (!result?.country) return { status: 400, json: { error: 'Missing trip result' }, headers: PRIVATE };
  const saved = await repo.saveTrip(
    {
      kind: 'plan',
      owner: identity.sub,
      country: result.country,
      input: result.input,
      result,
      title: title || `${result.input?.days || ''} days in ${result.country.name}`.trim(),
      notes,
    },
    tripMode(identity)
  );
  return { status: 201, json: saved, headers: PRIVATE };
}

export async function handleDeleteTrip({ id, identity }) {
  if (!signedIn(identity)) return { status: 401, json: { error: 'Sign in to delete a trip.' }, headers: PRIVATE };
  await connectDb();
  const removed = await repo.deleteTrip(id, identity.sub, tripMode(identity));
  if (!removed) return { status: 404, json: { error: 'Trip not found' }, headers: PRIVATE };
  return { status: 204, headers: PRIVATE };
}
