import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, ImagePlus, MousePointerClick, PenLine } from 'lucide-react';
import { usePlaces } from '../../context/PlaceContext';
import { useAuth } from '../../context/AuthContext';
import { placesAPI } from '../../utils/api';
import { FPT_COORDS, MAX_RADIUS_KM, formatDistance } from '../../utils/distance';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const PLACE_TYPES = [
  { id: 1, name: 'Sống ảo / Check-in', icon: '📸' },
  { id: 2, name: 'Karaoke', icon: '🎤' },
  { id: 3, name: 'Thể thao', icon: '⚽' },
  { id: 4, name: 'Cafe & Chill', icon: '☕' },
  { id: 5, name: 'Xem phim', icon: '🎬' },
  { id: 6, name: 'Ăn uống', icon: '🍜' },
  { id: 7, name: 'Giải trí', icon: '🎮' },
  { id: 8, name: 'Mua sắm', icon: '🛍️' },
];

function createPlaceMarkerEl(color, icon, isPopular) {
  const el = document.createElement('div');
  el.className = isPopular ? 'place-pin-popular' : 'place-pin';
  el.style.backgroundColor = color || '#6B7280';
  const span = document.createElement('span');
  span.className = 'pin-emoji';
  span.textContent = icon || '📍';
  el.appendChild(span);
  return el;
}

function createFPTMarkerEl() {
  const el = document.createElement('div');
  el.className = 'fpt-pin';
  el.textContent = '🎓';
  return el;
}

function createUserMarkerEl() {
  const outer = document.createElement('div');
  outer.className = 'user-location-outer';
  const inner = document.createElement('div');
  inner.className = 'user-location-pin';
  outer.appendChild(inner);
  return outer;
}

function createPreviewMarkerEl() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center';
  const pin = document.createElement('div');
  pin.style.cssText = 'width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#F05A22;border:2.5px solid white;box-shadow:0 3px 12px rgba(240,90,34,0.5);display:flex;align-items:center;justify-content:center';
  const emoji = document.createElement('span');
  emoji.style.cssText = 'transform:rotate(45deg);font-size:16px';
  emoji.textContent = '📍';
  pin.appendChild(emoji);
  const label = document.createElement('div');
  label.style.cssText = 'background:#F05A22;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;margin-top:3px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2)';
  label.textContent = 'Vị trí mới';
  wrap.appendChild(pin);
  wrap.appendChild(label);
  return wrap;
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

function buildPopupHTML(place) {
  const color = place.type_color || '#6B7280';
  const rating = place.avg_rating?.toFixed(1) || '0.0';
  const dist = formatDistance(place.distance_from_fpt);
  const popularBadge = place.is_popular
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#F59E0B;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;margin-left:4px">🔥 Nổi tiếng</span>`
    : '';
  return `
    <div style="font-family:'Be Vietnam Pro',sans-serif;width:232px">
      <div style="background:${color};padding:12px 14px 10px;cursor:pointer" onclick="window.__navigateToPlace('${place.id}')">
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <div style="font-weight:700;font-size:14px;color:#fff;line-height:1.3">${place.name}</div>
          ${popularBadge}
        </div>
        <div style="margin-top:5px;display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,0.18);border-radius:20px;padding:2px 8px">
          <span style="font-size:11px">${place.type_icon || ''}</span>
          <span style="font-size:11px;color:rgba(255,255,255,0.9);font-weight:500">${place.type_name || ''}</span>
        </div>
      </div>
      <div style="padding:12px 14px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <span style="font-size:12px;letter-spacing:-1px">${renderStars(place.avg_rating)}</span>
          <span style="font-size:13px;font-weight:700;color:#111827">${rating}</span>
          <span style="font-size:11px;color:#9CA3AF">(${place.total_reviews} đánh giá)</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:4px">
          <span style="font-size:11px;color:#9CA3AF;margin-top:1px;flex-shrink:0">📍</span>
          <span style="font-size:11px;color:#6B7280;line-height:1.4">${place.address || 'Chưa có địa chỉ'}</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:4px;background:#FFF3EE;border-radius:20px;padding:3px 10px;margin-bottom:10px">
          <span style="font-size:11px">🎓</span>
          <span style="font-size:11px;color:#F05A22;font-weight:600">${dist} từ FPT</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
          <div onclick="window.__navigateToPlace('${place.id}')"
            style="text-align:center;background:#F05A22;color:#fff;border-radius:10px;padding:7px 4px;font-size:12px;font-weight:600;cursor:pointer"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">Chi tiết →</div>
          <div onclick="window.__startRoute('${place.id}')"
            style="text-align:center;background:#2563EB;color:#fff;border-radius:10px;padding:7px 4px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Dẫn đường
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Add Place Modal ───────────────────────────────────────────────────────────
function AddPlaceModal({ placeTypes, onClose, onSuccess, onPreviewCoords, onPickFromMap, initialCoords }) {
  const [form, setForm] = useState({
    name: '',
    type_id: '1',
    lat: initialCoords ? initialCoords.lat.toFixed(6) : '',
    lng: initialCoords ? initialCoords.lng.toFixed(6) : '',
    address: '',
    phone: '',
    hours: '',
    description: '',
  });
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pickingFromMap, setPickingFromMap] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      onPreviewCoords([lat, lng]);
    } else {
      onPreviewCoords(null);
    }
  }, [form.lat, form.lng, onPreviewCoords]);

  useEffect(() => {
    const handler = (e) => {
      setForm(f => ({ ...f, lat: e.detail.lat.toFixed(6), lng: e.detail.lng.toFixed(6) }));
      setPickingFromMap(false);
    };
    window.addEventListener('modal-map-pick', handler);
    return () => window.removeEventListener('modal-map-pick', handler);
  }, []);

  function handlePickFromMap() {
    setPickingFromMap(true);
    onPickFromMap(true);
  }

  function handleImgSelect(e) {
    const files = Array.from(e.target.files);
    const toAdd = files.slice(0, 10 - images.length).map(file => ({
      file, preview: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...toAdd]);
    e.target.value = '';
  }

  function removeImg(idx) {
    setImages(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Vui lòng nhập tên địa điểm'); return; }
    if (!form.lat || !form.lng) { setError('Vui lòng nhập tọa độ (Lat/Lng)'); return; }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      images.forEach(({ file }) => fd.append('images', file));
      const res = await placesAPI.create(fd);
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra. Kiểm tra tọa độ trong bán kính 7km từ FPT.');
    } finally {
      setSaving(false);
    }
  }

  const lat = parseFloat(form.lat);
  const lng = parseFloat(form.lng);
  const coordsValid = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange bg-slate-50 focus:bg-white transition-colors';

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={18} className="text-fpt-orange" /> Thêm địa điểm mới
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Nhập tọa độ hoặc chọn trực tiếp trên bản đồ</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Tên địa điểm *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Vd: Cafe Highland, Karaoke Family..." className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Loại hình</label>
            <select value={form.type_id} onChange={e => setForm(f => ({ ...f, type_id: e.target.value }))} className={inputCls}>
              {(placeTypes?.length ? placeTypes : PLACE_TYPES).map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tọa độ *</label>
              <button type="button" onClick={handlePickFromMap}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${pickingFromMap ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                <MousePointerClick size={12} />
                {pickingFromMap ? 'Đang chờ nhấp...' : 'Chọn trên bản đồ'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                placeholder="Lat: 15.9697" className={inputCls} />
              <input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                placeholder="Lng: 108.2603" className={inputCls} />
            </div>
            {coordsValid && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Tọa độ hợp lệ</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Địa chỉ</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Vd: 123 Nguyễn Văn Linh, Đà Nẵng" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Điện thoại</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="0905 123 456" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Giờ mở cửa</label>
              <input value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                placeholder="07:00 - 22:00" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Mô tả</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={`${inputCls} resize-none`} placeholder="Mô tả ngắn về địa điểm..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Hình ảnh ({images.length}/10)
            </label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 group flex-shrink-0">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImg(idx)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <X size={14} className="text-white" />
                  </button>
                  {idx === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-fpt-orange text-white text-[9px] font-bold text-center py-0.5">Bìa</div>
                  )}
                </div>
              ))}
              {images.length < 10 && (
                <button type="button" onClick={() => imgRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-fpt-orange hover:bg-orange-50 flex flex-col items-center justify-center text-slate-400 hover:text-fpt-orange transition-colors flex-shrink-0">
                  <ImagePlus size={18} />
                  <span className="text-[9px] mt-0.5 font-medium">Ảnh</span>
                </button>
              )}
            </div>
            <input ref={imgRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImgSelect} />
          </div>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="submit" disabled={saving || !coordsValid}
              className="flex-1 bg-fpt-orange text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-fpt-dark disabled:opacity-50 transition-colors">
              {saving ? 'Đang lưu...' : '📍 Thêm địa điểm'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 bg-slate-100 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MapView Component ────────────────────────────────────────────────────────
export default function MapView({ onPlaceAdded }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { places, placeTypes, selectedPlace, setSelectedPlace } = usePlaces();
  const mapContainerRef = useRef(null);   // DOM element ref
  const mapInstanceRef = useRef(null);    // Leaflet map instance
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const userCoordsRef = useRef(null);
  const routeLayerRef = useRef(null);
  const geoWatchRef = useRef(null);
  const placesDataRef = useRef({});
  const previewMarkerRef = useRef(null);
  const clickHandlerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // addStep: null | 'picker' | 'picking' | 'form'
  const [addStep, setAddStep] = useState(null);
  const [pickedCoords, setPickedCoords] = useState(null);
  const [mapPickMode, setMapPickMode] = useState(false);

  const showAddModal = addStep === 'form';
  const isPickingActive = addStep === 'picking' || mapPickMode;

  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

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
      const path = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const isDriving = mode === 'driving';
      const polyline = isDriving
        ? L.polyline(path, { color: '#2563EB', weight: 5, opacity: 0.85 })
        : L.polyline(path, { color: '#059669', weight: 4, opacity: 0.85, dashArray: '8, 12' });
      polyline.addTo(map);
      routeLayerRef.current = polyline;
      map.fitBounds(L.latLngBounds(path), { padding: [70, 70] });
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

  // ── Preview marker ────────────────────────────────────────────────────────
  const handlePreviewCoords = useCallback((coords) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!coords) {
      if (previewMarkerRef.current) { previewMarkerRef.current.remove(); previewMarkerRef.current = null; }
      return;
    }
    const [lat, lng] = coords;
    if (previewMarkerRef.current) {
      previewMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        html: createPreviewMarkerEl(),
        className: '',
        iconSize: [80, 60],
        iconAnchor: [18, 52],
      });
      previewMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }
    map.panTo([lat, lng]);
    if (map.getZoom() < 15) map.setZoom(15);
  }, []);

  // ── Map pick mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (isPickingActive) {
      mapContainerRef.current?.classList.add('map-add-mode');
      const handler = (e) => {
        const { lat, lng } = e.latlng;
        if (addStep === 'picking') {
          setPickedCoords({ lat, lng });
          setAddStep('form');
        } else {
          window.dispatchEvent(new CustomEvent('modal-map-pick', { detail: { lat, lng } }));
          setMapPickMode(false);
        }
      };
      clickHandlerRef.current = handler;
      map.once('click', handler);
      return () => {
        map.off('click', handler);
        mapContainerRef.current?.classList.remove('map-add-mode');
      };
    } else {
      mapContainerRef.current?.classList.remove('map-add-mode');
    }
  }, [addStep, isPickingActive, mapReady]);

  // Clean up preview marker khi đóng form
  useEffect(() => {
    if (!showAddModal && previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }
  }, [showAddModal]);

  // ── Init Leaflet + Mapbox ─────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [FPT_COORDS[0], FPT_COORDS[1]],
      zoom: 14,
      zoomControl: false,
    });

    // Mapbox Streets tile layer
    L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
      {
        attribution: '© <a href="https://www.mapbox.com/" target="_blank">Mapbox</a> © <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 20,
      }
    ).addTo(map);

    // Zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Custom locate button
    const LocateControl = L.Control.extend({
      onAdd() {
        const btn = document.createElement('button');
        btn.className = 'leaflet-locate-btn';
        btn.title = 'Về vị trí của tôi';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/></svg>`;
        btn.addEventListener('click', () => {
          if (userCoordsRef.current) {
            map.panTo(userCoordsRef.current);
            map.setZoom(17);
          } else {
            navigator.geolocation?.getCurrentPosition(
              (p) => { map.panTo([p.coords.latitude, p.coords.longitude]); map.setZoom(17); }, () => {}
            );
          }
        });
        return btn;
      },
      onRemove() {},
    });
    new LocateControl({ position: 'topright' }).addTo(map);

    // FPT marker
    const fptIcon = L.divIcon({ html: createFPTMarkerEl(), className: '', iconSize: [48, 48], iconAnchor: [24, 24] });
    const fptMarker = L.marker([FPT_COORDS[0], FPT_COORDS[1]], { icon: fptIcon, zIndexOffset: 1000, title: 'Đại học FPT Đà Nẵng' }).addTo(map);
    fptMarker.bindPopup(
      `<div style="padding:14px 16px;font-family:'Be Vietnam Pro',sans-serif"><div style="font-weight:700;font-size:14px;color:#F05A22;margin-bottom:4px">🎓 Đại học FPT Đà Nẵng</div><div style="font-size:12px;color:#6B7280">Khu đô thị FPT City, Ngũ Hành Sơn</div><div style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:#FFF3EE;border-radius:20px;padding:2px 8px"><span style="font-size:11px;color:#F05A22;font-weight:500">📍 Trung tâm bán kính 7km</span></div></div>`,
      { maxWidth: 220, className: 'place-popup' }
    );

    // Radius circle
    L.circle([FPT_COORDS[0], FPT_COORDS[1]], {
      radius: MAX_RADIUS_KM * 1000,
      color: '#F05A22',
      weight: 1.5,
      opacity: 1,
      fillColor: '#F05A22',
      fillOpacity: 0.03,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Geolocation watch
    if (navigator.geolocation) {
      geoWatchRef.current = navigator.geolocation.watchPosition(
        ({ coords: { latitude, longitude } }) => {
          const coords = [latitude, longitude];
          userCoordsRef.current = coords;
          if (!userMarkerRef.current) {
            const icon = L.divIcon({ html: createUserMarkerEl(), className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
            userMarkerRef.current = L.marker(coords, { icon, zIndexOffset: 900, title: 'Vị trí của bạn' }).addTo(map);
            userMarkerRef.current.bindPopup(
              `<div style="padding:10px 14px;font-family:'Be Vietnam Pro',sans-serif"><div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;background:#2563EB;border-radius:50%"></div><span style="font-size:13px;font-weight:600;color:#1D4ED8">Vị trí của bạn</span></div><div style="font-size:11px;color:#9CA3AF;margin-top:3px">Đang cập nhật theo thời gian thực</div></div>`,
              { maxWidth: 180, className: 'place-popup' }
            );
          } else {
            userMarkerRef.current.setLatLng(coords);
          }
        },
        (err) => { if (err.code === 1) window.dispatchEvent(new CustomEvent('geo-denied')); },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    setMapReady(true);

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
    if (!map || !mapReady) return;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    placesDataRef.current = {};

    places.forEach(place => {
      placesDataRef.current[place.id] = place;
      const isPopular = Boolean(place.is_popular);
      const size = isPopular ? 44 : 36;
      const icon = L.divIcon({
        html: createPlaceMarkerEl(place.type_color, place.type_icon, isPopular),
        className: '',
        iconSize: [size, size],
        iconAnchor: [0, size],
      });
      const marker = L.marker([place.lat, place.lng], {
        icon,
        zIndexOffset: isPopular ? 100 : 0,
        title: place.name,
      }).addTo(map);
      marker.bindPopup(buildPopupHTML(place), { maxWidth: 260, className: 'place-popup', closeButton: true });
      marker.on('click', () => {
        setSelectedPlace(place);
        map.panTo([place.lat, place.lng]);
        if (map.getZoom() < 16) map.setZoom(16);
        marker.openPopup();
      });
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
      map.closePopup();
      window.__fetchRouteGlobal(userCoordsRef.current, [place.lat, place.lng], 'driving', place.name);
    };
  }, [places, mapReady, navigate, setSelectedPlace]);

  useEffect(() => {
    window.__fetchRouteGlobal = fetchRoute;
    window.__showRouteToast = showToast;
  }, [fetchRoute, showToast]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !selectedPlace) return;
    const marker = markersRef.current[selectedPlace.id];
    if (marker) {
      map.panTo([selectedPlace.lat, selectedPlace.lng]);
      map.setZoom(16);
      setTimeout(() => {
        marker.openPopup();
      }, 900);
    }
  }, [selectedPlace, mapReady]);

  function handlePlaceAdded(newPlace) {
    setAddStep(null);
    setPickedCoords(null);
    if (onPlaceAdded) onPlaceAdded(newPlace);
    showToast(`Đã thêm "${newPlace.name}" lên bản đồ!`, 'success');
    const map = mapInstanceRef.current;
    if (map) { map.panTo([newPlace.lat, newPlace.lng]); map.setZoom(16); }
  }

  function closeAddFlow() {
    setAddStep(null);
    setPickedCoords(null);
    setMapPickMode(false);
  }

  const isDriving = routeInfo?.mode === 'driving';

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400 }}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* ── FAB: Thêm địa điểm ── */}
      {user && (
        <button
          onClick={() => setAddStep(s => s === 'picker' ? null : 'picker')}
          className={`absolute bottom-[72px] md:bottom-8 left-5 z-[1000] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl text-sm font-semibold transition-all border ${
            addStep === 'picker'
              ? 'bg-fpt-orange text-white border-fpt-orange'
              : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-fpt-orange border-gray-200 hover:border-fpt-orange'
          }`}
          title="Thêm địa điểm lên bản đồ"
        >
          <MapPin size={16} className={addStep === 'picker' ? 'text-white' : 'text-fpt-orange'} />
          Thêm địa điểm
        </button>
      )}

      {/* ── Option picker popup ── */}
      {addStep === 'picker' && (
        <>
          <div className="absolute inset-0 z-[999]" onClick={() => setAddStep(null)} />
          <div className="absolute bottom-[120px] md:bottom-20 left-5 z-[1001] bg-white rounded-2xl shadow-2xl border border-gray-100 w-64 overflow-hidden animate-scale-in">
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chọn cách nhập vị trí</p>
            </div>
            <button onClick={() => { setPickedCoords(null); setAddStep('form'); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 text-left transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-orange-100 group-hover:bg-fpt-orange flex items-center justify-center flex-shrink-0 transition-colors">
                <PenLine size={16} className="text-fpt-orange group-hover:text-white transition-colors" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">Tự nhập tọa độ</div>
                <div className="text-xs text-gray-400">Điền Lat/Lng thủ công trong form</div>
              </div>
            </button>
            <button onClick={() => setAddStep('picking')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors group border-t border-gray-50">
              <div className="w-9 h-9 rounded-xl bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center flex-shrink-0 transition-colors">
                <MousePointerClick size={16} className="text-blue-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">Chọn trên bản đồ</div>
                <div className="text-xs text-gray-400">Nhấp vào vị trí, form tự điền tọa độ</div>
              </div>
            </button>
            <div className="h-2" />
          </div>
        </>
      )}

      {/* Map pick hint */}
      {isPickingActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1100] pointer-events-none animate-fade-in-up">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg bg-amber-500 text-white text-sm font-semibold">
            <MousePointerClick size={16} /> Nhấp vào bản đồ để lấy tọa độ
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] animate-fade-in-up pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-white text-sm font-medium"
            style={{ background: toast.type === 'warn' ? '#D97706' : toast.type === 'success' ? '#059669' : toast.type === 'info' ? '#2563EB' : '#DC2626' }}>
            <span className="text-base leading-none">
              {toast.type === 'warn' ? '⚠️' : toast.type === 'success' ? '✅' : toast.type === 'info' ? 'ℹ️' : '❌'}
            </span>
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
        <div className="absolute z-[1000] bg-white shadow-2xl overflow-hidden animate-fade-in-up left-3 right-3 bottom-[88px] md:left-auto md:right-auto md:bottom-5 md:rounded-2xl md:-translate-x-1/2 md:left-1/2"
          style={{ borderRadius: 16, maxWidth: 400 }}>
          <div style={{ height: 4, background: isDriving ? 'linear-gradient(90deg,#2563EB,#60A5FA)' : 'linear-gradient(90deg,#059669,#34D399)' }} />
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: isDriving ? '#EFF6FF' : '#ECFDF5' }}>
                {isDriving ? '🏍️' : '🚶'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-0.5">Đang dẫn đường</div>
                <div className="text-sm font-semibold text-gray-800 leading-tight truncate">{routeInfo.placeName}</div>
              </div>
              <button onClick={clearRoute}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-blue-50 rounded-xl px-2.5 py-2 text-center">
                <div className="text-[9px] text-blue-400 font-bold uppercase tracking-wide">Khoảng cách</div>
                <div className="text-sm font-bold text-blue-700 leading-none mt-0.5">{formatRouteDist(routeInfo.distance)}</div>
              </div>
              <div className="flex-1 bg-emerald-50 rounded-xl px-2.5 py-2 text-center">
                <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-wide">Thời gian</div>
                <div className="text-sm font-bold text-emerald-700 leading-none mt-0.5">{formatRouteDuration(routeInfo.duration)}</div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => switchMode('driving')}
                  className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isDriving ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                  </svg>Xe
                </button>
                <button onClick={() => switchMode('foot')}
                  className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${!isDriving ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="1"/><path d="m9 20 3-7 2 3 2-3 1 4M6 9l6 1 2-3"/>
                  </svg>Bộ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Place Modal ── */}
      {showAddModal && (
        <AddPlaceModal
          placeTypes={placeTypes}
          onClose={closeAddFlow}
          onSuccess={handlePlaceAdded}
          onPreviewCoords={handlePreviewCoords}
          onPickFromMap={setMapPickMode}
          initialCoords={pickedCoords}
        />
      )}
    </div>
  );
}
