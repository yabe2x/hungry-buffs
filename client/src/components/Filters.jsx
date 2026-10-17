import { useState } from 'react';

const DISTANCES = [
  { label: '½ mi', meters: 805 },
  { label: '1 mi', meters: 1609 },
  { label: '2 mi', meters: 3219 },
  { label: '5 mi', meters: 8047 },
];
const RATINGS = [
  { label: 'Any', value: 0 },
  { label: '3.5+', value: 3.5 },
  { label: '4.0+', value: 4 },
  { label: '4.5+', value: 4.5 },
];
const SORTS = [
  { label: 'Best match', value: 'best' },
  { label: 'Top rated', value: 'rating' },
  { label: 'Closest', value: 'distance' },
];

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.label}
            role="radio"
            aria-checked={o.value === value}
            className={o.value === value ? 'active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const startOpen = typeof window === 'undefined' || !window.matchMedia('(max-width: 820px)').matches;

export default function Filters({ filters, cuisines, onChange, onReset }) {
  const [open, setOpen] = useState(startOpen);
  const active = [
    filters.cuisine !== 'any',
    filters.radius !== 1609,
    filters.maxPrice !== 4,
    filters.minRating !== 0,
    filters.openNow,
    filters.sort !== 'best',
  ].filter(Boolean).length;

  return (
    <section className={`panel filters ${open ? 'open' : 'closed'}`}>
      <div className="panel-title">
        <button className="filters-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <h2>
            Filters{active > 0 && <span className="count"> · {active} on</span>}
          </h2>
          <span className="chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
        </button>
        <button className="link-button" onClick={onReset}>Reset</button>
      </div>
      {open && (
        <>
          <FilterFields filters={filters} cuisines={cuisines} onChange={onChange} />
        </>
      )}
    </section>
  );
}

function FilterFields({ filters, cuisines, onChange }) {
  return (
    <>

      <div className="field">
        <span className="field-label">Craving</span>
        <div className="chips">
          {cuisines.map((c) => (
            <button
              key={c.id}
              className={`chip ${filters.cuisine === c.id ? 'active' : ''}`}
              aria-pressed={filters.cuisine === c.id}
              onClick={() => onChange({ cuisine: c.id })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Segmented
        label="Distance"
        options={DISTANCES.map((d) => ({ label: d.label, value: d.meters }))}
        value={filters.radius}
        onChange={(radius) => onChange({ radius })}
      />

      <Segmented
        label="Max price"
        options={[1, 2, 3, 4].map((p) => ({ label: '$'.repeat(p), value: p }))}
        value={filters.maxPrice}
        onChange={(maxPrice) => onChange({ maxPrice })}
      />

      <Segmented label="Rating" options={RATINGS} value={filters.minRating} onChange={(minRating) => onChange({ minRating })} />

      <label className="toggle">
        <input type="checkbox" checked={filters.openNow} onChange={(e) => onChange({ openNow: e.target.checked })} />
        <span>Open now</span>
      </label>

      <Segmented label="Sort by" options={SORTS} value={filters.sort} onChange={(sort) => onChange({ sort })} />
    </>
  );
}
