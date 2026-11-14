import { CURRENCIES } from '../lib/api';

export default function BudgetForm({ value, onChange, onSubmit, loading, countries, countryName }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <form
      className="budget-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h3>What's your budget for {countryName}?</h3>
      <div className="field budget-field">
        <label htmlFor="budget">Total trip budget</label>
        <div className="input-group">
          <input id="budget" type="number" min="1" step="any" required placeholder="e.g. 3000" value={value.budget} onChange={set('budget')} />
          <select value={value.currency} onChange={set('currency')} aria-label="Currency">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="days">Trip length (days)</label>
          <input id="days" type="number" min="1" max="90" value={value.days} onChange={set('days')} />
        </div>
        <div className="field">
          <label htmlFor="travelers">Travelers</label>
          <input id="travelers" type="number" min="1" max="20" value={value.travelers} onChange={set('travelers')} />
        </div>
      </div>
      <details className="optional">
        <summary>More options (optional)</summary>
        <div className="field">
          <label htmlFor="origin">Flying from</label>
          <select id="origin" value={value.originCca3} onChange={set('originCca3')}>
            <option value="">Not sure — use a regional average</option>
            {countries.map((c) => (
              <option key={c.cca3} value={c.cca3}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="income">Monthly income ({value.currency})</label>
          <input id="income" type="number" min="0" step="any" placeholder="Helps us gauge affordability" value={value.income} onChange={set('income')} />
        </div>
      </details>
      <button className="btn primary block" disabled={loading || !value.budget}>
        {loading ? 'Crunching the numbers…' : 'Check my budget →'}
      </button>
    </form>
  );
}
