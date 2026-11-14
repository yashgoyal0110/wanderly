import { handleCountries } from '../../backend/src/web/handlers.js';
import { toResponse } from '../../backend/src/web/respond.js';

export function GET(request) {
  const cca3 = decodeURIComponent(new URL(request.url).pathname.split('/').filter(Boolean).pop() || '');
  return handleCountries({ cca3 }).then(toResponse);
}
