import { useEffect, useRef, useState } from 'react';
import { api, formatMoney } from '../lib/api';
import Markdown from './Markdown';

const VERDICTS = {
  insufficient: { label: 'Not quite enough', emoji: '🧳', tone: 'danger', blurb: 'Your budget falls short of even a basic trip.' },
  basic: { label: 'Enough for a basic trip', emoji: '🎒', tone: 'warn', blurb: 'Smart, budget-friendly travel — hostels, street food and public transport.' },
  comfortable: { label: 'Comfortable trip', emoji: '🏨', tone: 'ok', blurb: 'Mid-range hotels, good restaurants and plenty of experiences.' },
  luxury: { label: 'Go luxurious!', emoji: '🥂', tone: 'lux', blurb: 'Your budget comfortably covers a luxury trip. Treat yourself.' },
};

const CAT = {
  accommodation: { icon: '🛏️', color: '#845ef7' },
  food: { icon: '🍜', color: '#ff922b' },
  transport: { icon: '🚆', color: '#22b8cf' },
  activities: { icon: '🎟️', color: '#f06595' },
  flights: { icon: '✈️', color: '#5c7cfa' },
  contingency: { icon: '🛟', color: '#51cf66' },
};

const TIER_LABEL = { budget: 'Budget', mid: 'Mid-range', luxury: 'Luxury' };

export default function BudgetResult({ result, onEdit, onPickCountry, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ai, setAi] = useState({ loading: false, text: '', error: '' });
  const rootRef = useRef(null);
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);
  const { money, input, verdict } = result;
  const cur = input.currency;
  const v = VERDICTS[verdict];
  const maxTotal = Math.max(money.tiers.luxury.total, money.budget) * 1.05;

  const save = async () => {
    setSaving(true);
    try {
      await api.saveTrip({ result });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateAi = async () => {
    setAi({ loading: true, text: '', error: '' });
    try {
      const { text } = await api.aiItinerary({ cca3: result.country.cca3, days: input.days, travelers: input.travelers, tier: result.planTier, budget: input.budget, currency: cur });
      setAi({ loading: false, text, error: '' });
    } catch (e) {
      setAi({ loading: false, text: '', error: e.message });
    }
  };

  return (
    <div className="result" ref={rootRef}>
      <div className={`verdict ${v.tone}`}>
        <span className="verdict-emoji">{v.emoji}</span>
        <div>
          <h3>{v.label}</h3>
          <p>{v.blurb}</p>
        </div>
      </div>

      <div className="summary-line">
        <span>
          {formatMoney(input.budget, cur)} · {input.days} days · {input.travelers} traveler{input.travelers > 1 ? 's' : ''}
        </span>
        <button className="link" onClick={onEdit}>Edit</button>
      </div>

      <section className="card">
        <h4>Typical cost of this trip</h4>
        <div className="tier-bars">
          {['budget', 'mid', 'luxury'].map((t) => (
            <div key={t} className={`tier-bar ${result.planTier === t && verdict !== 'insufficient' ? 'chosen' : ''}`}>
              <span className="tier-name">{TIER_LABEL[t]}</span>
              <div className="track">
                <div className={`fill ${t}`} style={{ width: `${(money.tiers[t].total / maxTotal) * 100}%` }} />
                <div className="you" style={{ left: `${(money.budget / maxTotal) * 100}%` }} title="Your budget" />
              </div>
              <span className="tier-total">{formatMoney(money.tiers[t].total, cur)}</span>
            </div>
          ))}
        </div>
        <p className="muted small">
          The marker shows your budget. Flights are estimated {result.flightSource}
          {result.flightDistanceKm ? ` (~${result.flightDistanceKm.toLocaleString()} km)` : ''}. All figures are rough estimates.
        </p>
      </section>

      {verdict === 'insufficient' ? (
        <>
          <section className="card shortfall">
            <h4>You'd need about {formatMoney(money.shortfall, cur)} more</h4>
            <p>
              A basic {input.days}-day trip costs around <strong>{formatMoney(money.tiers.budget.total, cur)}</strong> (about{' '}
              {formatMoney(money.tiers.budget.groundPerDay, cur)}/day on the ground plus {formatMoney(money.tiers.budget.breakdown.flights, cur)} in flights).
            </p>
            <ul className="ideas">
              {result.affordableDays > 0 ? (
                <li>✂️ Shorten the trip: your budget covers roughly <strong>{result.affordableDays} day{result.affordableDays > 1 ? 's' : ''}</strong> on a budget plan.</li>
              ) : (
                <li>✈️ Flights alone take most of this budget — try fewer travelers or a closer destination.</li>
              )}
              <li>📅 Travel off-season and book flights 6–10 weeks ahead.</li>
              <li>💰 Save {formatMoney(Math.ceil(money.shortfall / 6), cur)}/month for 6 months to close the gap.</li>
            </ul>
          </section>
          {result.alternatives?.length > 0 && (
            <section className="card">
              <h4>{result.alternatives[0].fits ? 'Cheaper destinations nearby that fit your budget' : 'Most affordable destinations nearby'}</h4>
              <div className="alt-list">
                {result.alternatives.map((a) => (
                  <button key={a.cca3} className="alt" onClick={() => onPickCountry(a.cca3)}>
                    <span className="flag">{a.flag}</span>
                    <span className="grow">
                      <strong>{a.name}</strong>
                      <small>{a.region} · {a.distanceKm.toLocaleString()} km away</small>
                    </span>
                    <span className={`price ${a.fits ? 'fits' : ''}`}>{formatMoney(a.estimatedTotal, cur)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <section className="card">
            <h4>How to spend {formatMoney(input.budget, cur)}</h4>
            <div className="stack-bar">
              {Object.entries(money.allocation).map(([k, val]) => (
                <div key={k} style={{ flex: val, background: CAT[k].color }} title={`${k}: ${formatMoney(val, cur)}`} />
              ))}
            </div>
            <ul className="alloc">
              {Object.entries(money.allocation).map(([k, val]) => (
                <li key={k}>
                  <span className="dot" style={{ background: CAT[k].color }} />
                  <span className="grow">
                    {CAT[k].icon} {k[0].toUpperCase() + k.slice(1)}
                  </span>
                  <strong>{formatMoney(val, cur)}</strong>
                </li>
              ))}
            </ul>
            <p className="muted small">≈ {formatMoney(money.dailySpend, cur)} per day on the ground, with a 10% safety buffer.</p>
          </section>

          <section className="card">
            <h4>Suggested {TIER_LABEL[result.planTier].toLowerCase()} itinerary</h4>
            <ol className="itinerary">
              {result.itinerary.map((d) => (
                <li key={d.day}>
                  <span className="day">Day {d.day}</span>
                  <div>
                    <strong>{d.title}</strong>
                    <p>{d.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ul className="tips">
              {result.tips.map((t) => (
                <li key={t}>💡 {t}</li>
              ))}
            </ul>
          </section>
        </>
      )}

      {result.incomeInsight && (
        <section className="card income">
          <h4>Affordability check</h4>
          <p>
            This trip equals <strong>{result.incomeInsight.monthsOfIncome} months</strong> of your income. {result.incomeInsight.advice}
          </p>
        </section>
      )}

      <section className="card ai-card">
        <div className="ai-head">
          <h4>✨ Personalized AI itinerary</h4>
          <button className="btn ghost small" onClick={generateAi} disabled={ai.loading}>
            {ai.loading ? 'Generating…' : ai.text ? 'Regenerate' : 'Generate with Gemini'}
          </button>
        </div>
        {ai.error && <p className="error">{ai.error}</p>}
        {ai.text && <Markdown text={ai.text} />}
      </section>

      <div className="actions">
        <button className="btn primary" onClick={save} disabled={saving || saved}>
          {saved ? '✓ Saved to My trips' : saving ? 'Saving…' : 'Save trip'}
        </button>
        <button className="btn ghost" onClick={onEdit}>Adjust budget</button>
      </div>
    </div>
  );
}
