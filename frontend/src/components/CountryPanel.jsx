import { formatMoney, formatNumber } from '../lib/api';
import BudgetForm from './BudgetForm';
import BudgetResult from './BudgetResult';
import CountryShape from './CountryShape';

export default function CountryPanel({ country, feature, color, onClose, form, setForm, onEstimate, loading, error, result, onEditResult, countries, onPickCountry, onSaved }) {
  if (!country) {
    return (
      <aside className="panel loading-panel">
        <div className="spinner" />
      </aside>
    );
  }
  const cost = country.cost;
  const facts = [
    { k: 'Capital', v: country.capital || '—' },
    { k: 'Region', v: country.subregion },
    { k: 'Population', v: formatNumber(country.population) },
    { k: 'Area', v: country.area ? `${formatNumber(Math.round(country.area))} km²` : '—' },
    { k: 'Languages', v: country.languages.slice(0, 3).join(', ') || '—' },
    { k: 'Currency', v: country.currencies.map((c) => `${c.name} (${c.symbol || c.code})`).join(', ') || '—' },
  ];
  const trivia = [
    country.nationalDish && `🍽️ National dish: ${country.nationalDish}`,
    country.avgTemperatureC != null && `🌡️ Average yearly temperature: ${country.avgTemperatureC.toFixed(1)}°C`,
    country.government && `🏛️ Government: ${country.government}`,
    country.landlocked ? '⛰️ Landlocked — no coastline' : '🌊 Has a coastline',
  ].filter(Boolean);

  return (
    <aside className="panel">
      <button className="close" onClick={onClose} aria-label="Close panel">×</button>
      <header className="panel-head">
        <span className="big-flag">{country.flag}</span>
        <div>
          <h2>{country.name}</h2>
          <p className="muted">{country.officialName !== country.name ? country.officialName : country.subregion}</p>
        </div>
      </header>

      <div className="panel-body">
        <CountryShape feature={feature} capitalLatLng={country.capitalLatLng} color={color} />
        <div className="facts">
          {facts.map((f) => (
            <div key={f.k} className="fact">
              <span>{f.k}</span>
              <strong>{f.v}</strong>
            </div>
          ))}
        </div>
        <ul className="trivia">
          {trivia.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {country.borders.length > 0 && (
          <div className="borders">
            <span className="muted small">Neighbours</span>
            <div className="chips">
              {country.borders.map((b) => (
                <button key={b.cca3} className="chip" onClick={() => onPickCountry(b.cca3)}>
                  {b.flag} {b.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {cost && (
          <div className="cost-teaser">
            <span>Daily cost per person (USD)</span>
            <div>
              {['budget', 'mid', 'luxury'].map((t) => {
                const d = cost.daily[t];
                return (
                  <span key={t} className={`pill ${t}`}>
                    {t === 'mid' ? 'Mid' : t[0].toUpperCase() + t.slice(1)} {formatMoney(d.accommodation / 2 + d.food + d.transport + d.activities)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="divider" />
        {result ? (
          <BudgetResult result={result} onEdit={onEditResult} onPickCountry={onPickCountry} onSaved={onSaved} />
        ) : (
          <BudgetForm value={form} onChange={setForm} onSubmit={onEstimate} loading={loading} countries={countries} countryName={country.name} />
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </aside>
  );
}
