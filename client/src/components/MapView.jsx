import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';

const GOLD = '#cfb87c';
const DARK = '#1a1a1a';

function Follow({ origin, radius, selected }) {
  const map = useMap();
  useEffect(() => {
    const zoom = radius <= 805 ? 15 : radius <= 1609 ? 14 : radius <= 3219 ? 13 : 12;
    map.setView([origin.lat, origin.lng], zoom);
  }, [map, origin, radius]);
  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [map, selected]);
  return null;
}

export default function MapView({ origin, radius, restaurants, selectedId, onSelect }) {
  const selected = restaurants.find((r) => r.id === selectedId);

  return (
    <div className="map-wrap">
      <MapContainer center={[origin.lat, origin.lng]} zoom={14} scrollWheelZoom={false} className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Follow origin={origin} radius={radius} selected={selected} />
        <Circle center={[origin.lat, origin.lng]} radius={radius} pathOptions={{ color: GOLD, weight: 1, fillOpacity: 0.06 }} />
        <CircleMarker center={[origin.lat, origin.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#2f6fed', fillOpacity: 1 }}>
          <Tooltip>{origin.label}</Tooltip>
        </CircleMarker>
        {restaurants.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={r.id === selectedId ? 11 : 7}
            pathOptions={{ color: DARK, weight: 2, fillColor: r.id === selectedId ? '#ffb000' : GOLD, fillOpacity: 0.95 }}
            eventHandlers={{ click: () => onSelect(r.id) }}
          >
            <Tooltip>{r.name}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
