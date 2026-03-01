import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usePlaces } from '../../context/PlaceContext';
import { FPT_COORDS, MAX_RADIUS_KM, formatDistance } from '../../utils/distance';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createPlaceIcon(color, icon) {
  return L.divIcon({
    className: '',
    html: `
      <div class="place-pin" style="background-color:${color || '#6B7280'}">
        <span class="pin-emoji">${icon || '📍'}</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -44],
  });
}

function createFPTIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="fpt-pin">🎓</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -30],
  });
}

function renderStars(rating) {
  const full = Math.round(rating || 0);
  return '⭐'.repeat(full) + '☆'.repeat(5 - full);
}

export default function MapView() {
  const navigate = useNavigate();
  const { places, selectedPlace, setSelectedPlace } = usePlaces();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const radiusCircleRef = useRef(null);

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: FPT_COORDS,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Zoom controls (top right)
    L.control.zoom({ position: 'topright' }).addTo(map);

    // FPT University marker
    const fptMarker = L.marker(FPT_COORDS, { icon: createFPTIcon(), zIndexOffset: 1000 })
      .addTo(map);
    fptMarker.bindPopup(`
      <div style="padding:12px;font-family:'Be Vietnam Pro',sans-serif">
        <div style="font-weight:700;font-size:14px;color:#F05A22">🎓 Đại học FPT Đà Nẵng</div>
        <div style="font-size:12px;color:#6B7280;margin-top:4px">Khu đô thị FPT City, Ngũ Hành Sơn</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:4px">Trung tâm bán kính 7km</div>
      </div>
    `, { maxWidth: 200 });

    // 7km radius circle
    radiusCircleRef.current = L.circle(FPT_COORDS, {
      radius: MAX_RADIUS_KM * 1000,
      color: '#F05A22',
      fillColor: '#F05A22',
      fillOpacity: 0.04,
      weight: 1.5,
      dashArray: '6 4',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when places change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    places.forEach(place => {
      const icon = createPlaceIcon(place.type_color, place.type_icon);
      const marker = L.marker([place.lat, place.lng], { icon })
        .addTo(map);

      const popupContent = `
        <div style="font-family:'Be Vietnam Pro',sans-serif;cursor:pointer" onclick="window.__navigateToPlace('${place.id}')">
          <div style="background:${place.type_color || '#6B7280'};padding:10px 12px;color:white">
            <div style="font-weight:700;font-size:14px">${place.name}</div>
            <div style="font-size:11px;opacity:0.9;margin-top:2px">${place.type_icon || ''} ${place.type_name || ''}</div>
          </div>
          <div style="padding:10px 12px">
            <div style="font-size:13px;color:#374151;margin-bottom:6px">${renderStars(place.avg_rating)} <b>${place.avg_rating?.toFixed(1) || '0.0'}</b> <span style="color:#9CA3AF;font-size:11px">(${place.total_reviews} đánh giá)</span></div>
            <div style="font-size:12px;color:#6B7280">${place.address || ''}</div>
            <div style="font-size:12px;color:#F05A22;margin-top:4px;font-weight:600">${formatDistance(place.distance_from_fpt)} từ FPT</div>
            <div style="margin-top:8px;text-align:center;background:#F05A22;color:white;border-radius:8px;padding:6px;font-size:12px;font-weight:600">
              Xem chi tiết →
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 240, minWidth: 220 });

      marker.on('click', () => {
        setSelectedPlace(place);
        map.flyTo([place.lat, place.lng], 16, { duration: 0.8 });
      });

      markersRef.current[place.id] = marker;
    });

    // Global navigation handler from popup
    window.__navigateToPlace = (id) => navigate(`/place/${id}`);

  }, [places, navigate, setSelectedPlace]);

  // Focus selected place
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPlace) return;

    const marker = markersRef.current[selectedPlace.id];
    if (marker) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], 16, { duration: 0.8 });
      setTimeout(() => marker.openPopup(), 900);
    }
  }, [selectedPlace]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: 400 }}
    />
  );
}
