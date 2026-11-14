import { getIdentity } from '../../cursor/identity.js';
import { handleDeleteTrip } from '../../backend/src/web/handlers.js';
import { toResponse } from '../../backend/src/web/respond.js';

export async function DELETE(request) {
  const identity = await getIdentity(request);
  const id = decodeURIComponent(new URL(request.url).pathname.split('/').filter(Boolean).pop() || '');
  return toResponse(await handleDeleteTrip({ id, identity }));
}
