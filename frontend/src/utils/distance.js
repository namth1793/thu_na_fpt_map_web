export const FPT_LAT = 15.9765;
export const FPT_LNG = 108.2634;
export const FPT_COORDS = [FPT_LAT, FPT_LNG];
export const MAX_RADIUS_KM = 7;

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceFromFPT(lat, lng) {
  return haversineDistance(FPT_LAT, FPT_LNG, lat, lng);
}

export function formatDistance(km) {
  if (km < 0.1) return 'Ngay cạnh trường';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function walkingTime(km) {
  const mins = Math.round(km * 12); // 5km/h ~ 12 min/km
  if (mins < 2) return 'Đi bộ ngay';
  if (mins < 60) return `${mins} phút đi bộ`;
  return `${Math.round(mins / 60)} giờ đi bộ`;
}

export function drivingTime(km) {
  const mins = Math.round(km * 3); // ~20km/h trong nội ô
  if (mins < 2) return 'Ngay kế bên';
  return `${mins} phút đi xe`;
}
