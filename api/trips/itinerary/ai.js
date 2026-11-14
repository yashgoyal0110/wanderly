import { getIdentity } from '../../../cursor/identity.js';
import { handleAiItinerary } from '../../../backend/src/web/handlers.js';
import { readJson, toResponse } from '../../../backend/src/web/respond.js';

export async function POST(request) {
  const identity = await getIdentity(request);
  return toResponse(await handleAiItinerary({ body: await readJson(request), identity }));
}
