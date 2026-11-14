const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request('/health'),
  countries: () => request('/countries'),
  country: (cca3) => request(`/countries/${cca3}`),
  estimate: (body) => request('/trips/estimate', { method: 'POST', body }),
  aiItinerary: (body) => request('/trips/itinerary/ai', { method: 'POST', body }),
  trips: (kind) => request(`/trips${kind ? `?kind=${kind}` : ''}`),
  saveTrip: (body) => request('/trips', { method: 'POST', body }),
  deleteTrip: (id) => request(`/trips/${id}`, { method: 'DELETE' }),
  chat: (body) => request('/chat', { method: 'POST', body }),
};

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'AED', 'NZD', 'ZAR', 'BRL', 'MXN', 'KRW', 'SEK', 'THB'];

export const formatMoney = (n, currency = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n ?? 0);

export const formatNumber = (n) => (n == null ? '—' : new Intl.NumberFormat().format(n));
