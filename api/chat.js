import { getIdentity } from '../cursor/identity.js';
import { handleChat } from '../backend/src/web/handlers.js';
import { readJson, toResponse } from '../backend/src/web/respond.js';

export async function POST(request) {
  const identity = await getIdentity(request);
  return toResponse(await handleChat({ body: await readJson(request), identity }));
}
