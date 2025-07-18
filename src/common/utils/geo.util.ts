export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Great-circle distance between two coords (km). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // km
  const dLat = deg2rad(b.latitude - a.latitude);
  const dLon = deg2rad(b.longitude - a.longitude);
  const lat1 = deg2rad(a.latitude);
  const lat2 = deg2rad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function estimateEtaMinutes(distanceKm: number, avgSpeedKmh = 35): number {
  if (avgSpeedKmh <= 0) return 0;
  return (distanceKm / avgSpeedKmh) * 60;
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}
