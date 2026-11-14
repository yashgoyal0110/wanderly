import { getIdentity } from '../cursor/identity.js';
import { handleListTrips, handleSaveTrip } from '../backend/src/web/handlers.js';
import { readJson, toResponse } from '../backend/src/web/respond.js';

export async function GET(request) {
  const url = new URL(request.url);
  const identity = await getIdentity(request);
  return toResponse(await handleListTrips({
    query: { kind: url.searchParams.get('kind') || '', limit: url.searchParams.get('limit') || '' },
    identity,
  }));
}

export async function POST(request) {
  const identity = await getIdentity(request);
  return toResponse(await handleSaveTrip({ body: await readJson(request), identity }));
}
