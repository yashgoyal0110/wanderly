import mongoose from 'mongoose';
import { countries } from './data/countries.js';
import { buildCostProfile } from './data/costModel.js';

const costSchema = new mongoose.Schema(
  {
    cca3: { type: String, unique: true, index: true },
    name: String,
    region: String,
    subregion: String,
    currency: String,
    costIndex: Number,
    daily: {
      budget: { accommodation: Number, food: Number, transport: Number, activities: Number },
      mid: { accommodation: Number, food: Number, transport: Number, activities: Number },
      luxury: { accommodation: Number, food: Number, transport: Number, activities: Number },
    },
    flight: { budget: Number, mid: Number, luxury: Number },
  },
  { timestamps: true }
);

const tripSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['search', 'plan'], default: 'plan' },
    country: { cca3: String, name: String, flag: String },
    input: mongoose.Schema.Types.Mixed,
    result: mongoose.Schema.Types.Mixed,
    title: String,
    notes: String,
    owner: { type: String, index: true },
  },
  { timestamps: true }
);

export const CostProfile = mongoose.model('CostProfile', costSchema);
export const Trip = mongoose.model('Trip', tripSchema);

// In-memory fallback used when MongoDB is unreachable.
const memory = { costs: new Map(), trips: [] };
export const state = { mode: 'connecting', error: null };

function seedMemory() {
  for (const c of countries) memory.costs.set(c.cca3, buildCostProfile(c));
}

export async function seedCosts({ force = false } = {}) {
  const count = await CostProfile.estimatedDocumentCount();
  if (count >= countries.length && !force) return count;
  const ops = countries.map((c) => ({
    updateOne: { filter: { cca3: c.cca3 }, update: { $set: buildCostProfile(c) }, upsert: true },
  }));
  await CostProfile.bulkWrite(ops);
  return CostProfile.estimatedDocumentCount();
}

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    state.mode = 'memory';
    state.error = 'MONGODB_URI not set';
    seedMemory();
    return state;
  }
  try {
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'trip_planner', serverSelectionTimeoutMS: 8000 });
    const n = await seedCosts();
    state.mode = 'mongo';
    console.log(`[db] Connected to MongoDB (${n} cost profiles)`);
  } catch (err) {
    state.mode = 'memory';
    state.error = 'unavailable';
    seedMemory();
    console.warn('[db] MongoDB unavailable; using in-memory store');
  }
  return state;
}

function ensureMemoryCosts() {
  if (memory.costs.size === 0) seedMemory();
}

// Cost figures for anyone, including a signed-out visitor. This is the same model
// seeded into MongoDB, served from memory so a public page never reads the database.
export function openCatalog() {
  ensureMemoryCosts();
  return {
    async getCost(cca3) {
      return memory.costs.get(cca3) || null;
    },
    async allCosts() {
      return [...memory.costs.values()];
    },
  };
}

// Preview deploys must not write the production database.
export function tripMode(identity) {
  if (identity?.stage === 'preview' || state.mode !== 'mongo') return 'memory';
  return 'mongo';
}

export const repo = {
  async getCost(cca3) {
    if (state.mode === 'mongo') return CostProfile.findOne({ cca3 }).lean();
    ensureMemoryCosts();
    return memory.costs.get(cca3) || null;
  },
  async allCosts() {
    if (state.mode === 'mongo') return CostProfile.find().lean();
    ensureMemoryCosts();
    return [...memory.costs.values()];
  },
  async saveTrip(doc, mode = state.mode) {
    if (mode === 'mongo') return (await Trip.create(doc)).toObject();
    const saved = { ...doc, _id: String(Date.now() + Math.random()), createdAt: new Date().toISOString() };
    memory.trips.unshift(saved);
    return saved;
  },
  async listTrips({ kind, owner, limit = 30, mode = state.mode } = {}) {
    if (!owner) return [];
    const cap = Math.min(limit, 100);
    if (mode === 'mongo') {
      const filter = { owner };
      if (kind) filter.kind = kind;
      return Trip.find(filter).sort({ createdAt: -1 }).limit(cap).lean();
    }
    return memory.trips.filter((t) => t.owner === owner && (!kind || t.kind === kind)).slice(0, cap);
  },
  async deleteTrip(id, owner, mode = state.mode) {
    if (!owner || !id) return null;
    if (mode === 'mongo') {
      if (!mongoose.isValidObjectId(id)) return null;
      return Trip.findOneAndDelete({ _id: id, owner });
    }
    const before = memory.trips.length;
    memory.trips = memory.trips.filter((t) => !(t._id === id && t.owner === owner));
    return memory.trips.length === before ? null : true;
  },
};
