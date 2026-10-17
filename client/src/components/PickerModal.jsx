import { useEffect, useRef, useState } from 'react';

import { api } from '../api.js';
import RestaurantCard from './RestaurantCard.jsx';

export default function PickerModal({ origin, filters, candidates, onClose, onShow }) {
  const [spinName, setSpinName] = useState('');
  const [pick, setPick] = useState(null);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setPick(null);
    setError(null);

    const request = api.random(origin, filters);

    // ~2 s spin that slows down
    let delay = 50;
    let elapsed = 0;
    const step = () => {
      if (cancelled) return;
      const r = candidates[Math.floor(Math.random() * candidates.length)];
      if (r) setSpinName(r.name);
      elapsed += delay;
      delay *= 1.15;
      if (elapsed < 2000) {
        timer.current = setTimeout(step, delay);
      } else {
        request
          .then((data) => !cancelled && setPick(data.restaurant))
          .catch((err) => !cancelled && setError(err.message));
      }
    };
    step();

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [origin, filters, candidates, round]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Random pick" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        {!pick && !error && (
          <div className="spinner">
            <p className="muted">Picking from {candidates.length} places…</p>
            <p className="spin-name">{spinName}</p>
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
        {pick && (
          <div className="pick-result">
            <p className="pick-title">🎉 You're eating at</p>
            <RestaurantCard restaurant={pick} large />
            <div className="pick-actions">
              <button onClick={() => setRound((n) => n + 1)}>🎲 Spin again</button>
              <button className="primary" onClick={() => onShow(pick.id)}>Show on map</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
