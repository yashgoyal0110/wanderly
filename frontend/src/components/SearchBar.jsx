import { useMemo, useRef, useState } from 'react';

function score(c, q) {
  const name = c.name.toLowerCase();
  if (name.startsWith(q)) return 4;
  if (name.split(/[\s-]/).some((w) => w.startsWith(q))) return 3;
  if ((c.capital || '').toLowerCase().startsWith(q)) return 2;
  if (c.altSpellings?.some((s) => s.toLowerCase().startsWith(q))) return 1.5;
  if (name.includes(q)) return 1;
  return 0;
}

export default function SearchBar({ countries, onPick }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return countries
      .map((c) => ({ c, s: score(c, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name))
      .slice(0, 8)
      .map((x) => x.c);
  }, [countries, query]);

  const pick = (c) => {
    onPick(c.cca3);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="search">
      <span className="search-icon">⌕</span>
      <input
        ref={inputRef}
        value={query}
        placeholder="Search a country, capital or nickname…"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        aria-label="Search countries"
      />
      {open && results.length > 0 && (
        <ul className="search-results" role="listbox">
          {results.map((c, i) => (
            <li
              key={c.cca3}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
            >
              <span className="flag">{c.flag}</span>
              <span className="grow">
                <strong>{c.name}</strong>
                <small>
                  {c.capital ? `${c.capital} · ` : ''}
                  {c.subregion}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && <div className="search-results empty">No matches — try a capital or another spelling.</div>}
    </div>
  );
}
