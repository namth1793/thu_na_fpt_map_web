import { useEffect, useRef, useState, useCallback } from 'react';
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

function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="user-location-pin"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
}

function renderStars(rating) {
  const full = Math.round(rating || 0);
  return '⭐'.repeat(full) + '☆'.repeat(5 - full);
}

function formatRouteDist(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatRouteDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return 'Ngay kế bên';
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
}

export default function MapView() {
  const navigate = useNavigate();
  const { places, selectedPlace, setSelectedPlace } = usePlaces();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const radiusCircleRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userCoordsRef = useRef(null);
  const routeLayerRef = useRef(null);
  const geoWatchRef = useRef(null);
  const placesDataRef = useRef({});

  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration, mode, placeName, placeCoords }
  const [toast, setToast] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // --- Fetch route from OSRM ---
  const fetchRoute = useCallback(async (userCoords, placeCoords, mode, placeName) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setLoadingRoute(true);

    // Remove old route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    try {
      const [userLat, userLng] = userCoords;
      const [placeLat, placeLng] = placeCoords;
      // OSRM uses [lng, lat] order in the URL
      const url = `https://router.project-osrm.org/route/v1/${mode}/${userLng},${userLat};${placeLng},${placeLat}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM error');
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) throw new Error('No route');

      const route = data.routes[0];
      // OSRM returns [lng, lat] — swap to [lat, lng] for Leaflet
      const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      const color = mode === 'foot' ? '#10B981' : '#3B82F6';
      const weight = mode === 'foot' ? 4 : 5;
      const dashArray = mode === 'foot' ? '8 6' : null;

      const polyline = L.polyline(latlngs, {
        color,
        weight,
        opacity: 0.85,
        dashArray,
        lineJoin: 'round',
      }).addTo(map);

      routeLayerRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [60, 60] });

      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
        mode,
        placeName,
        placeCoords,
      });
    } catch {
      showToast('Không thể tải tuyến đường. Vui lòng thử lại.');
    } finally {
      setLoadingRoute(false);
    }
  }, [showToast]);

  // --- Clear route ---
  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    setRouteInfo(null);
  }, []);

  // --- Toggle route mode ---
  const toggleRouteMode = useCallback(() => {
    if (!routeInfo || !userCoordsRef.current) return;
    const newMode = routeInfo.mode === 'driving' ? 'foot' : 'driving';
    fetchRoute(userCoordsRef.current, routeInfo.placeCoords, newMode, routeInfo.placeName);
  }, [routeInfo, fetchRoute]);

  // --- Init map ---
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

    // "My Location" button (custom Leaflet control)
    const LocateControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
        btn.title = 'Vị trí của tôi';
        btn.style.cssText = [
          'width:34px', 'height:34px', 'background:#fff', 'border:none',
          'cursor:pointer', 'font-size:18px', 'display:flex',
          'align-items:center', 'justify-content:center',
          'box-shadow:0 1px 5px rgba(0,0,0,0.25)', 'border-radius:4px',
        ].join(';');
        btn.innerHTML = '📍';
        L.DomEvent.on(btn, 'click', L.DomEvent.stopPropagation);
        L.DomEvent.on(btn, 'click', () => {
          if (userCoordsRef.current) {
            map.flyTo(userCoordsRef.current, 16, { duration: 0.8 });
          } else {
            navigator.geolocation?.getCurrentPosition(
              (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 16),
              () => {}
            );
          }
        });
        return btn;
      },
    });
    new LocateControl().addTo(map);

    // FPT University marker
    const fptMarker = L.marker(FPT_COORDS, { icon: createFPTIcon(), zIndexOffset: 1000 }).addTo(map);
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

    // --- Geolocation watch ---
    if (navigator.geolocation) {
      geoWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const coords = [latitude, longitude];
          userCoordsRef.current = coords;

          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker(coords, {
              icon: createUserIcon(),
              zIndexOffset: 900,
            }).addTo(map);
            userMarkerRef.current.bindPopup(
              `<div style="padding:10px;font-family:'Be Vietnam Pro',sans-serif;font-size:13px;font-weight:600;color:#3B82F6">📍 Vị trí của bạn</div>`,
              { maxWidth: 160 }
            );
          } else {
            userMarkerRef.current.setLatLng(coords);
          }
        },
        (err) => {
          if (err.code === 1) {
            // Permission denied — notify once via a custom event so React state can show it
            window.dispatchEvent(new CustomEvent('geo-denied'));
          }
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    return () => {
      if (geoWatchRef.current != null) {
        navigator.geolocation?.clearWatch(geoWatchRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
      userMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for geo-denied event from inside useEffect
  useEffect(() => {
    const handler = () => showToast('Vui lòng cho phép truy cập vị trí để sử dụng dẫn đường.', 'warn');
    window.addEventListener('geo-denied', handler);
    return () => window.removeEventListener('geo-denied', handler);
  }, [showToast]);

  // --- Update markers when places change ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    placesDataRef.current = {};

    places.forEach(place => {
      placesDataRef.current[place.id] = place;

      const icon = createPlaceIcon(place.type_color, place.type_icon);
      const marker = L.marker([place.lat, place.lng], { icon }).addTo(map);

      const popupContent = `
        <div style="font-family:'Be Vietnam Pro',sans-serif">
          <div style="background:${place.type_color || '#6B7280'};padding:10px 12px;color:white;cursor:pointer" onclick="window.__navigateToPlace('${place.id}')">
            <div style="font-weight:700;font-size:14px">${place.name}</div>
            <div style="font-size:11px;opacity:0.9;margin-top:2px">${place.type_icon || ''} ${place.type_name || ''}</div>
          </div>
          <div style="padding:10px 12px">
            <div style="font-size:13px;color:#374151;margin-bottom:6px">${renderStars(place.avg_rating)} <b>${place.avg_rating?.toFixed(1) || '0.0'}</b> <span style="color:#9CA3AF;font-size:11px">(${place.total_reviews} đánh giá)</span></div>
            <div style="font-size:12px;color:#6B7280">${place.address || ''}</div>
            <div style="font-size:12px;color:#F05A22;margin-top:4px;font-weight:600">${formatDistance(place.distance_from_fpt)} từ FPT</div>
            <div style="margin-top:8px;display:flex;gap:6px">
              <div onclick="window.__navigateToPlace('${place.id}')" style="flex:1;text-align:center;background:#F05A22;color:white;border-radius:8px;padding:6px 4px;font-size:12px;font-weight:600;cursor:pointer">
                Xem chi tiết →
              </div>
              <div onclick="window.__startRoute('${place.id}')" style="flex:1;text-align:center;background:#3B82F6;color:white;border-radius:8px;padding:6px 4px;font-size:12px;font-weight:600;cursor:pointer">
                🧭 Dẫn đường
              </div>
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

    // Global route handler from popup — calls fetchRoute stored on window to avoid stale closure
    window.__startRoute = (id) => {
      const place = placesDataRef.current[id];
      if (!place) return;
      if (!userCoordsRef.current) {
        window.__showRouteToast('Đang xác định vị trí của bạn, vui lòng thử lại sau giây lát.');
        return;
      }
      mapInstanceRef.current?.closePopup();
      window.__fetchRouteGlobal(userCoordsRef.current, [place.lat, place.lng], 'driving', place.name);
    };
  }, [places, navigate, setSelectedPlace]);

  // Keep global fetchRoute reference up to date
  useEffect(() => {
    window.__fetchRouteGlobal = fetchRoute;
    window.__showRouteToast = (msg) => showToast(msg, 'warn');
  }, [fetchRoute, showToast]);

  // --- Focus selected place ---
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
    <div className="relative w-full h-full" style={{ minHeight: 400 }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* Toast notification */}
      {toast && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] text-white text-sm px-4 py-2 rounded-xl shadow-lg animate-fade-in-up"
          style={{ background: toast.type === 'warn' ? '#F59E0B' : '#EF4444', whiteSpace: 'nowrap' }}
        >
          {toast.msg}
        </div>
      )}

      {/* Loading route indicator */}
      {loadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-500 text-white text-sm px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Đang tải tuyến đường...
        </div>
      )}

      {/* Route info panel */}
      {routeInfo && !loadingRoute && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-fade-in-up"
          style={{ minWidth: 300, maxWidth: 'calc(100vw - 32px)' }}
        >
          <div className="text-2xl flex-shrink-0">
            {routeInfo.mode === 'foot' ? '🚶' : '🏍️'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 truncate">
              Đến: <span className="font-semibold text-gray-700">{routeInfo.placeName}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm font-bold text-blue-600">📏 {formatRouteDist(routeInfo.distance)}</span>
              <span className="text-sm font-bold text-green-600">⏱ {formatRouteDuration(routeInfo.duration)}</span>
            </div>
          </div>
          <button
            onClick={toggleRouteMode}
            title={routeInfo.mode === 'driving' ? 'Chuyển sang đi bộ' : 'Chuyển sang đi xe'}
            className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 rounded-lg px-2 py-1 text-sm transition-colors"
          >
            {routeInfo.mode === 'driving' ? '🚶 Bộ' : '🚗 Xe'}
          </button>
          <button
            onClick={clearRoute}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors"
            title="Đóng dẫn đường"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
