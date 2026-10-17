import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from './api.js';
import Filters from './components/Filters.jsx';
import MapView from './components/MapView.jsx';
import PickerModal from './components/PickerModal.jsx';
import RestaurantCard from './components/RestaurantCard.jsx';

const CU_BOULDER = { lat: 40.0068, lng: -105.2705, label: 'CU Boulder campus (UMC)' };

const DEFAULT_FILTERS = {
  cuisine: 'any',
  radius: 1609,
  openNow: false,
  maxPrice: 4,
  minRating: 0,
  sort: 'best',
};

export default function App() {
  const [origin, setOrigin] = useState(CU_BOULDER);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [cuisines, setCuisines] = useState([]);
  const [results, setResults] = useState({ status: 'loading', restaurants: [], source: null, error: null });
  const [selectedId, setSelectedId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const cardRefs = useRef({});

  useEffect(() => {
    const ctrl = new AbortController();
    api.cuisines(ctrl.signal).then(setCuisines).catch(() => {});
    return () => ctrl.abort();
  }, []);

  // abort stale requests so a slow response can't overwrite a newer one
  useEffect(() => {
    const ctrl = new AbortController();
    setResults((r) => ({ ...r, status: 'loading', error: null }));
    api
      .restaurants(origin, filters, ctrl.signal)
      .then((data) => setResults({ status: 'done', restaurants: data.restaurants, source: data.source, error: null }))
      .catch((err) => {
        if (err.name !== 'AbortError') setResults({ status: 'error', restaurants: [], source: null, error: err.message });
      });
    return () => ctrl.abort();
  }, [origin, filters]);

  const updateFilters = (changes) => setFilters((f) => ({ ...f, ...changes }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert('Your browser cannot share its location.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your location' });
        setLocating(false);
      },
      () => {
        alert('Could not get your location, so we will keep using campus.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const select = useCallback((id) => {
    setSelectedId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const { status, restaurants, source, error } = results;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🦬</span>
          <div>
            <h1>Hungry Buffs</h1>
            <p>Where should we eat?</p>
          </div>
        </div>
        <button className="pick-button" onClick={() => setPickerOpen(true)} disabled={status !== 'done' || restaurants.length === 0}>
          🎲 Pick for me
        </button>
      </header>

      {source === 'sample' && (
        <div className="banner">
          Showing <strong>sample restaurants</strong>. Add your Google API key (see the README) to see real places near campus.
        </div>
      )}

      <main className="layout">
        <aside className="sidebar">
          <section className="panel location">
            <h2>Searching near</h2>
            <p className="location-label">📍 {origin.label}</p>
            <div className="location-buttons">
              <button onClick={useMyLocation} disabled={locating}>{locating ? 'Locating…' : 'Use my location'}</button>
              {origin !== CU_BOULDER && <button onClick={() => setOrigin(CU_BOULDER)}>Back to campus</button>}
            </div>
          </section>
          <Filters filters={filters} cuisines={cuisines} onChange={updateFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
        </aside>

        <section className="content">
          <MapView origin={origin} radius={filters.radius} restaurants={restaurants} selectedId={selectedId} onSelect={select} />

          <div className="results-header">
            <h2>
              {status === 'loading' && 'Finding food…'}
              {status === 'done' && `${restaurants.length} place${restaurants.length === 1 ? '' : 's'} nearby`}
              {status === 'error' && 'Something went wrong'}
            </h2>
          </div>

          {status === 'error' && <div className="error-box">{error}</div>}

          {status === 'done' && restaurants.length === 0 && (
            <div className="empty">
              <p>No places match those filters.</p>
              <button onClick={() => setFilters(DEFAULT_FILTERS)}>Reset filters</button>
            </div>
          )}

          <ul className={`results ${status === 'loading' ? 'is-loading' : ''}`}>
            {restaurants.map((r) => (
              <li key={r.id} ref={(el) => (cardRefs.current[r.id] = el)}>
                <RestaurantCard restaurant={r} selected={r.id === selectedId} onSelect={() => setSelectedId(r.id)} />
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="footer">
        Restaurant data from Google Places · Map © OpenStreetMap contributors · Built by Yabetse Beneberu
      </footer>

      {pickerOpen && (
        <PickerModal
          origin={origin}
          filters={filters}
          candidates={restaurants}
          onClose={() => setPickerOpen(false)}
          onShow={(id) => {
            setPickerOpen(false);
            select(id);
          }}
        />
      )}
    </div>
  );
}
