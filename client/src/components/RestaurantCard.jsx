import { useState } from 'react';

import { api } from '../api.js';
import { cuisineEmoji, miles, priceSigns, walkMinutes } from '../format.js';

export default function RestaurantCard({ restaurant: r, selected, onSelect, large = false }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = r.photo && !photoFailed;

  return (
    <article className={`card ${selected ? 'selected' : ''} ${large ? 'large' : ''}`} onClick={onSelect}>
      <div className="card-photo">
        {showPhoto ? (
          <img src={api.photoUrl(r.photo)} alt="" loading="lazy" onError={() => setPhotoFailed(true)} />
        ) : (
          <span className="card-emoji" aria-hidden="true">{cuisineEmoji(r.cuisine)}</span>
        )}
      </div>
      <div className="card-body">
        <h3>{r.name}</h3>
        <p className="card-meta">
          {r.rating != null && (
            <span className="rating">
              ★ {r.rating.toFixed(1)} <span className="muted">({r.ratingCount.toLocaleString()})</span>
            </span>
          )}
          {r.price != null && <span>{priceSigns(r.price)}</span>}
          <span>{r.cuisine}</span>
        </p>
        <p className="card-meta">
          <span>
            {miles(r.distance)} · {walkMinutes(r.distance)} min walk
          </span>
          {r.openNow === true && <span className="badge open">Open now</span>}
          {r.openNow === false && <span className="badge closed">Closed</span>}
        </p>
        {large && <p className="muted address">{r.address}</p>}
        {r.mapsUrl && (
          <a className="maps-link" href={r.mapsUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            Open in Google Maps ↗
          </a>
        )}
      </div>
    </article>
  );
}
