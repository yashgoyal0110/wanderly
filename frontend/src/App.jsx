import { useCallback, useEffect, useMemo, useState } from 'react';
import WorldMap from './components/WorldMap';
import SearchBar from './components/SearchBar';
import CountryPanel from './components/CountryPanel';
import ChatWidget from './components/ChatWidget';
import TripsDrawer from './components/TripsDrawer';
import { api } from './lib/api';
import { cca3ForFeature, colorFor, frameFeature, worldFeatures } from './lib/geo';

const PANEL_WIDTH = 460;
const FEATURED = ['JPN', 'ITA', 'PER', 'THA', 'MAR', 'ISL', 'NZL', 'MEX'];
const DEFAULT_FORM = { budget: '', currency: 'USD', days: 7, travelers: 1, originCca3: '', income: '' };

export default function App() {
  const [countries, setCountries] = useState([]);
  const [health, setHealth] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [focus, setFocus] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tripsOpen, setTripsOpen] = useState(false);
  const [savedKey, setSavedKey] = useState(0);

  useEffect(() => {
    api.countries().then(setCountries).catch((e) => setError(e.message));
    api.health().then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  const byCode = useMemo(() => new Map(countries.map((c) => [c.cca3, c])), [countries]);
  const byCcn3 = useMemo(() => new Map(countries.filter((c) => c.ccn3).map((c) => [c.ccn3, c])), [countries]);
  const featureIndex = useMemo(() => {
    const m = new Map();
    worldFeatures.forEach((f, i) => {
      const code = cca3ForFeature(f, byCcn3);
      if (code && (!m.has(code) || f.id)) m.set(code, { feature: f, color: colorFor(i) });
    });
    return m;
  }, [byCcn3]);

  const selectCountry = useCallback(
    (cca3, { keepResult = false } = {}) => {
      setSelected(cca3);
      setDetail(null);
      setError('');
      if (!keepResult) setResult(null);
      const entry = featureIndex.get(cca3);
      const cover = window.innerWidth > 900 ? PANEL_WIDTH / window.innerWidth : 0;
      if (entry) setFocus(frameFeature(entry.feature, cover));
      api
        .country(cca3)
        .then((d) => {
          setDetail(d);
          if (!entry && d.latlng) setFocus({ center: [d.latlng[1], d.latlng[0]], zoom: 12 });
        })
        .catch((e) => setError(e.message));
    },
    [featureIndex]
  );

  const close = () => {
    setSelected(null);
    setDetail(null);
    setResult(null);
    setFocus({ center: null });
  };

  const estimate = async (override) => {
    const body = { ...(override || form), cca3: selected };
    setLoading(true);
    setError('');
    try {
      setResult(await api.estimate(body));
      setSavedKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openTrip = (t) => {
    setTripsOpen(false);
    const input = t.input || {};
    setForm({ ...DEFAULT_FORM, ...input, originCca3: input.originCca3 || '', income: input.income || '' });
    selectCountry(t.country.cca3, { keepResult: true });
    if (t.kind === 'plan' && t.result?.money) setResult(t.result);
    else {
      setResult(null);
      api.estimate({ ...input, cca3: t.country.cca3 }).then(setResult).catch((e) => setError(e.message));
    }
  };

  const chatContext = useMemo(
    () => ({
      view: selected ? (result ? 'budget results for the selected country' : 'country details and budget form') : 'world map home page',
      country: detail ? { name: detail.name, capital: detail.capital, region: detail.region, subregion: detail.subregion, flag: detail.flag } : null,
      trip: form.budget ? { budget: form.budget, currency: form.currency, days: form.days, travelers: form.travelers } : null,
      result: result ? { verdict: result.verdict, planTier: result.planTier, money: { tiers: result.money.tiers }, input: result.input } : null,
    }),
    [selected, detail, form, result]
  );

  const entry = selected && featureIndex.get(selected);

  return (
    <div className={`app${selected ? ' has-panel' : ''}`}>
      <WorldMap
        byCcn3={byCcn3}
        byCode={byCode}
        selected={selected}
        capital={detail?.capitalLatLng ? { name: detail.capital, latlng: detail.capitalLatLng } : null}
        onSelect={(code) => selectCountry(code)}
        focus={focus}
      />

      <header className="topbar">
        <div className="brand" onClick={close} role="button" tabIndex={0}>
          <img src="/favicon.svg" alt="" />
          <span>Wanderly</span>
        </div>
        <SearchBar countries={countries} onPick={(c) => selectCountry(c)} />
        <div className="top-actions">
          {health && (
            <span className="status" title={health.dbError || ''}>
              <i className={health.db === 'mongo' ? 'on' : 'warn'} /> {health.db === 'mongo' ? 'Cloud sync' : 'Offline store'}
              <i className={health.gemini ? 'on' : 'off'} /> AI
            </span>
          )}
          <button className="btn glass" onClick={() => setTripsOpen(true)}>🧳 My trips</button>
        </div>
      </header>

      {!selected && (
        <section className="hero">
          <h1>
            Where to <span className="grad">next?</span>
          </h1>
          <p>Click any country on the map, or search above. Tell us your budget and we'll tell you if it's enough — and how to spend it.</p>
          <div className="chips">
            {FEATURED.map((code) => {
              const c = byCode.get(code);
              return (
                c && (
                  <button key={code} className="chip" onClick={() => selectCountry(code)}>
                    {c.flag} {c.name}
                  </button>
                )
              );
            })}
          </div>
          <p className="hint">🖱️ Drag to pan · scroll to zoom · hover for names</p>
        </section>
      )}

      {selected && (
        <CountryPanel
          country={detail}
          feature={entry?.feature}
          color={entry?.color || '#22b8cf'}
          onClose={close}
          form={form}
          setForm={setForm}
          onEstimate={() => estimate()}
          loading={loading}
          error={error}
          result={result}
          onEditResult={() => setResult(null)}
          countries={countries}
          onPickCountry={(c) => selectCountry(c)}
          onSaved={() => setSavedKey((k) => k + 1)}
        />
      )}

      <TripsDrawer open={tripsOpen} onClose={() => setTripsOpen(false)} onOpenTrip={openTrip} refreshKey={savedKey} />
      <ChatWidget context={chatContext} />
    </div>
  );
}
