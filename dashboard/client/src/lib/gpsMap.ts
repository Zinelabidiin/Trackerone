export function getNextMapZoom(currentZoom: number, direction: "in" | "out") {
  const delta = direction === "in" ? 1 : -1;
  return Math.min(19, Math.max(10, Math.round(currentZoom) + delta));
}

export function getRecenteredMapState(compact: boolean, revision: number) {
  return { zoom: compact ? 15 : 14, revision: revision + 1 };
}

export function getGpsMapEmbedUrl(latitude: string | number | null | undefined, longitude: string | number | null | undefined, zoom = 15) {
  if (latitude === null || latitude === undefined || latitude === "" || longitude === null || longitude === undefined || longitude === "") return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const safeZoom = Math.min(19, Math.max(10, Math.round(zoom)));
  const span = 0.08 / Math.pow(2, safeZoom - 10);
  const bbox = [lng - span, lat - span, lng + span, lat + span].map(value => value.toFixed(6)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}#map=${safeZoom}/${lat.toFixed(6)}/${lng.toFixed(6)}`;
}
