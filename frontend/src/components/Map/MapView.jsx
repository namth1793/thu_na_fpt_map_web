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
    html: `
      <div class="user-location-outer">
        <div class="user-location-pin"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

function renderStars(rating) {
  const full = Math.round(rating || 0);
  return '⭐'.repeat(full) + '☆'.repeat(5 - full);
}

function formatRouteDist(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatRouteDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return 'Ngay kế bên';
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
}

// ─── Popup HTML builder ───────────────────────────────────────────────────────
function buildPopupHTML(place) {
  const color = place.type_color || '#6B7280';
  const rating = place.avg_rating?.toFixed(1) || '0.0';
  const dist = formatDistance(place.distance_from_fpt);

  return `
    <div style="font-family:'Be Vietnam Pro',sans-serif;width:232px">
      <!-- Header -->
      <div
        style="background:${color};padding:12px 14px 10px;cursor:pointer;position:relative"
        onclick="window.__navigateToPlace('${place.id}')"
      >
        <div style="font-weight:700;font-size:14px;color:#fff;line-height:1.3;padding-right:8px">${place.name}</div>
        <div style="margin-top:4px;display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,0.18);border-radius:20px;padding:2px 8px">
          <span style="font-size:11px">${place.type_icon || ''}</span>
          <span style="font-size:11px;color:rgba(255,255,255,0.9);font-weight:500">${place.type_name || ''}</span>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:12px 14px">
        <!-- Rating row -->
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <span style="font-size:12px;letter-spacing:-1px">${renderStars(place.avg_rating)}</span>
          <span style="font-size:13px;font-weight:700;color:#111827">${rating}</span>
          <span style="font-size:11px;color:#9CA3AF">(${place.total_reviews} đánh giá)</span>
        </div>

        <!-- Address -->
        <div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:4px">
          <span style="font-size:11px;color:#9CA3AF;margin-top:1px;flex-shrink:0">📍</span>
          <span style="font-size:11px;color:#6B7280;line-height:1.4">${place.address || 'Chưa có địa chỉ'}</span>
        </div>

        <!-- Distance from FPT -->
        <div style="display:inline-flex;align-items:center;gap:4px;background:#FFF3EE;border-radius:20px;padding:3px 10px;margin-bottom:10px">
          <span style="font-size:11px">🎓</span>
          <span style="font-size:11px;color:#F05A22;font-weight:600">${dist} từ FPT</span>
        </div>

        <!-- Action buttons -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
          <div
            onclick="window.__navigateToPlace('${place.id}')"
            style="text-align:center;background:#F05A22;color:#fff;border-radius:10px;padding:7px 4px;font-size:12px;font-weight:600;cursor:pointer;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'"
          >
            Chi tiết →
          </div>
          <div
            onclick="window.__startRoute('${place.id}')"
            style="text-align:center;background:#2563EB;color:#fff;border-radius:10px;padding:7px 4px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Dẫn đường
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────
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

  const [routeInfo, setRouteInfo] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Fetch route via OSRM ──────────────────────────────────────────────────
  const fetchRoute = useCallback(async (userCoords, placeCoords, mode, placeName) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setLoadingRoute(true);
    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }

    try {
      const [uLat, uLng] = userCoords;
      const [pLat, pLng] = placeCoords;
      const url = `https://router.project-osrm.org/route/v1/${mode}/${uLng},${uLat};${pLng},${pLat}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM error');
      const data = await res.json();
      if (!data.routes?.length) throw new Error('No route');

      const route = data.routes[0];
      // OSRM → [lng,lat], Leaflet needs [lat,lng]
      const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      const isDriving = mode === 'driving';
      const polyline = L.polyline(latlngs, {
        color: isDriving ? '#2563EB' : '#059669',
        weight: isDriving ? 5 : 4,
        opacity: 0.85,
        dashArray: isDriving ? null : '10 6',
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);

      routeLayerRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [70, 70] });

      setRouteInfo({ distance: route.distance, duration: route.duration, mode, placeName, placeCoords });
    } catch {
      showToast('Không thể tải tuyến đường. Vui lòng thử lại sau.');
    } finally {
      setLoadingRoute(false);
    }
  }, [showToast]);

  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }
    setRouteInfo(null);
  }, []);

  const switchMode = useCallback((mode) => {
    if (!routeInfo || routeInfo.mode === mode || !userCoordsRef.current) return;
    fetchRoute(userCoordsRef.current, routeInfo.placeCoords, mode, routeInfo.placeName);
  }, [routeInfo, fetchRoute]);

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { center: FPT_COORDS, zoom: 14, zoomControl: false, attributionControl: false });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // ── My Location button ──
    const LocateControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const wrap = L.DomUtil.create('div', 'leaflet-bar leaflet-control locate-btn-wrap');
        wrap.style.cssText = 'margin-top:4px';
        const btn = L.DomUtil.create('button', '', wrap);
        btn.title = 'Về vị trí của tôi';
        btn.style.cssText = [
          'width:34px', 'height:34px', 'border:none', 'cursor:pointer',
          'background:#fff', 'display:flex', 'align-items:center', 'justify-content:center',
          'border-radius:4px', 'padding:0',
        ].join(';');
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/>
          </svg>
        `;
        L.DomEvent.disableClickPropagation(wrap);
        L.DomEvent.on(btn, 'click', () => {
          if (userCoordsRef.current) {
            map.flyTo(userCoordsRef.current, 17, { duration: 0.9 });
          } else {
            navigator.geolocation?.getCurrentPosition(
              (p) => map.flyTo([p.coords.latitude, p.coords.longitude], 17),
              () => {}
            );
          }
        });
        return wrap;
      },
    });
    new LocateControl().addTo(map);

    // FPT marker
    const fptMarker = L.marker(FPT_COORDS, { icon: createFPTIcon(), zIndexOffset: 1000 }).addTo(map);
    fptMarker.bindPopup(`
      <div style="padding:14px 16px;font-family:'Be Vietnam Pro',sans-serif">
        <div style="font-weight:700;font-size:14px;color:#F05A22;margin-bottom:4px">🎓 Đại học FPT Đà Nẵng</div>
        <div style="font-size:12px;color:#6B7280">Khu đô thị FPT City, Ngũ Hành Sơn</div>
        <div style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:#FFF3EE;border-radius:20px;padding:2px 8px">
          <span style="font-size:11px;color:#F05A22;font-weight:500">📍 Trung tâm bán kính 7km</span>
        </div>
      </div>
    `, { maxWidth: 220 });

    // 7km radius circle
    radiusCircleRef.current = L.circle(FPT_COORDS, {
      radius: MAX_RADIUS_KM * 1000,
      color: '#F05A22', fillColor: '#F05A22',
      fillOpacity: 0.04, weight: 1.5, dashArray: '6 4',
    }).addTo(map);

    mapInstanceRef.current = map;

    // ── Geolocation watch ──
    if (navigator.geolocation) {
      geoWatchRef.current = navigator.geolocation.watchPosition(
        ({ coords: { latitude, longitude } }) => {
          const coords = [latitude, longitude];
          userCoordsRef.current = coords;

          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker(coords, { icon: createUserIcon(), zIndexOffset: 900 }).addTo(map);
            userMarkerRef.current.bindPopup(`
              <div style="padding:10px 14px;font-family:'Be Vietnam Pro',sans-serif">
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="width:10px;height:10px;background:#2563EB;border-radius:50%;flex-shrink:0"></div>
                  <span style="font-size:13px;font-weight:600;color:#1D4ED8">Vị trí của bạn</span>
                </div>
                <div style="font-size:11px;color:#9CA3AF;margin-top:3px">Đang cập nhật theo thời gian thực</div>
              </div>
            `, { maxWidth: 180 });
          } else {
            userMarkerRef.current.setLatLng(coords);
          }
        },
        (err) => { if (err.code === 1) window.dispatchEvent(new CustomEvent('geo-denied')); },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    return () => {
      if (geoWatchRef.current != null) navigator.geolocation?.clearWatch(geoWatchRef.current);
      map.remove();
      mapInstanceRef.current = null;
      userMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => showToast('Vui lòng cho phép truy cập vị trí để dẫn đường.', 'warn');
    window.addEventListener('geo-denied', handler);
    return () => window.removeEventListener('geo-denied', handler);
  }, [showToast]);

  // ── Sync markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    placesDataRef.current = {};

    places.forEach(place => {
      placesDataRef.current[place.id] = place;
      const marker = L.marker([place.lat, place.lng], { icon: createPlaceIcon(place.type_color, place.type_icon) }).addTo(map);
      marker.bindPopup(buildPopupHTML(place), { maxWidth: 260, minWidth: 232, className: 'place-popup' });
      marker.on('click', () => { setSelectedPlace(place); map.flyTo([place.lat, place.lng], 16, { duration: 0.8 }); });
      markersRef.current[place.id] = marker;
    });

    window.__navigateToPlace = (id) => navigate(`/place/${id}`);
    window.__startRoute = (id) => {
      const place = placesDataRef.current[id];
      if (!place) return;
      if (!userCoordsRef.current) {
        window.__showRouteToast('Đang xác định vị trí, vui lòng thử lại sau giây lát.', 'warn');
        return;
      }
      mapInstanceRef.current?.closePopup();
      window.__fetchRouteGlobal(userCoordsRef.current, [place.lat, place.lng], 'driving', place.name);
    };
  }, [places, navigate, setSelectedPlace]);

  useEffect(() => {
    window.__fetchRouteGlobal = fetchRoute;
    window.__showRouteToast = showToast;
  }, [fetchRoute, showToast]);

  // ── Focus selected place ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPlace) return;
    const marker = markersRef.current[selectedPlace.id];
    if (marker) { map.flyTo([selectedPlace.lat, selectedPlace.lng], 16, { duration: 0.8 }); setTimeout(() => marker.openPopup(), 900); }
  }, [selectedPlace]);

  // ── Render ────────────────────────────────────────────────────────────────
  const isDriving = routeInfo?.mode === 'driving';

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400 }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* ── Toast ── */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] animate-fade-in-up pointer-events-none">
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-white text-sm font-medium"
            style={{ background: toast.type === 'warn' ? '#D97706' : '#DC2626', backdropFilter: 'blur(8px)' }}
          >
            <span className="text-base leading-none">{toast.type === 'warn' ? '⚠️' : '❌'}</span>
            {toast.msg}
          </div>
        </div>
      )}

      {/* ── Loading route ── */}
      {loadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] animate-fade-in-up pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg bg-blue-600 text-white text-sm font-medium">
            <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Đang tính toán tuyến đường…
          </div>
        </div>
      )}

      {/* ── Route info panel ── */}
      {routeInfo && !loadingRoute && (
        <div
          className="absolute z-[1000] bg-white shadow-2xl overflow-hidden animate-fade-in-up
            left-3 right-3 bottom-[88px]
            md:left-auto md:right-auto md:bottom-5 md:rounded-2xl md:-translate-x-1/2 md:left-1/2"
          style={{ borderRadius: 16, maxWidth: 400 }}
        >
          {/* Colored accent bar */}
          <div style={{ height: 4, background: isDriving ? 'linear-gradient(90deg,#2563EB,#60A5FA)' : 'linear-gradient(90deg,#059669,#34D399)' }} />

          <div className="px-4 pt-3 pb-3">
            {/* Header row — icon + tên + nút đóng */}
            <div className="flex items-center gap-2.5 mb-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: isDriving ? '#EFF6FF' : '#ECFDF5' }}
              >
                {isDriving ? '🏍️' : '🚶'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-0.5">Đang dẫn đường</div>
                <div className="text-sm font-semibold text-gray-800 leading-tight truncate">{routeInfo.placeName}</div>
              </div>
              <button
                onClick={clearRoute}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Đóng"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Stats + mode toggle — hàng ngang compact trên mobile */}
            <div className="flex items-center gap-2">
              {/* Khoảng cách */}
              <div className="flex-1 bg-blue-50 rounded-xl px-2.5 py-2 text-center">
                <div className="text-[9px] text-blue-400 font-bold uppercase tracking-wide">Khoảng cách</div>
                <div className="text-sm font-bold text-blue-700 leading-none mt-0.5">{formatRouteDist(routeInfo.distance)}</div>
              </div>
              {/* Thời gian */}
              <div className="flex-1 bg-emerald-50 rounded-xl px-2.5 py-2 text-center">
                <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-wide">Thời gian</div>
                <div className="text-sm font-bold text-emerald-700 leading-none mt-0.5">{formatRouteDuration(routeInfo.duration)}</div>
              </div>
              {/* Mode toggle — 2 nút nhỏ */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => switchMode('driving')}
                  title="Đi xe"
                  className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    isDriving ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/>
                    <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                  </svg>
                  Xe
                </button>
                <button
                  onClick={() => switchMode('foot')}
                  title="Đi bộ"
                  className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    !isDriving ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="1"/><path d="m9 20 3-7 2 3 2-3 1 4M6 9l6 1 2-3"/>
                  </svg>
                  Bộ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
