import { useEffect, useState } from 'react';
import { api, formatMoney } from '../lib/api';

const VERDICT_LABEL = { insufficient: 'Short', basic: 'Basic', comfortable: 'Comfortable', luxury: 'Luxury' };

export default function TripsDrawer({ open, onClose, onOpenTrip, refreshKey }) {
  const [tab, setTab] = useState('plan');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    api
      .trips(tab)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, tab, refreshKey]);

  const remove = async (id) => {
    await api.deleteTrip(id);
    setItems((xs) => xs.filter((x) => x._id !== id));
  };

  return (
    <div className={`drawer-backdrop${open ? ' show' : ''}`} onClick={onClose}>
      <div className={`drawer${open ? ' show' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>My trips</h3>
          <button className="icon" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="tabs">
          <button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>Saved plans</button>
          <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Recent searches</button>
        </div>
        <div className="drawer-list">
          {loading && <p className="muted">Loading…</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !items.length && <p className="muted">{tab === 'plan' ? 'No saved trips yet — check a budget and hit “Save trip”.' : 'No searches yet.'}</p>}
          {items.map((t) => (
            <div key={t._id} className="trip-item">
              <button className="grow trip-main" onClick={() => onOpenTrip(t)}>
                <span className="flag">{t.country?.flag}</span>
                <span className="grow">
                  <strong>{t.title || t.country?.name}</strong>
                  <small>
                    {formatMoney(t.input?.budget, t.input?.currency)} · {t.input?.days}d · {t.input?.travelers} pax · {new Date(t.createdAt).toLocaleDateString()}
                  </small>
                </span>
                <span className={`tag ${t.result?.verdict}`}>{VERDICT_LABEL[t.result?.verdict]}</span>
              </button>
              {tab === 'plan' && (
                <button className="icon del" onClick={() => remove(t._id)} aria-label="Delete trip">🗑</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
