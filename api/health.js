import { handleHealth } from '../backend/src/web/handlers.js';
import { toResponse } from '../backend/src/web/respond.js';

export function GET() {
  return handleHealth().then(toResponse);
}
