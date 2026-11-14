import { handleCountries } from '../backend/src/web/handlers.js';
import { toResponse } from '../backend/src/web/respond.js';

export function GET(request) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const cca3 = parts[0] === 'api' && parts[1] === 'countries' && parts[2] ? parts[2] : '';
  return handleCountries({ query: url.searchParams.get('q') || '', cca3 }).then(toResponse);
}
