// Approximate static exchange rates: units of currency per 1 USD.
export const RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 150, AUD: 1.52, CAD: 1.36, CHF: 0.88, CNY: 7.2,
  SGD: 1.34, AED: 3.67, NZD: 1.65, ZAR: 18.5, BRL: 5.0, MXN: 17.5, KRW: 1330, SEK: 10.5, THB: 35.5,
};

export const toUSD = (amount, currency = 'USD') => amount / (RATES[currency] ?? 1);
export const fromUSD = (amount, currency = 'USD') => amount * (RATES[currency] ?? 1);
