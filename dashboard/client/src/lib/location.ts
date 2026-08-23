export function formatLiveCoordinate(latitude: string | number | null | undefined, longitude: string | number | null | undefined) {
  if (latitude === null || latitude === undefined || latitude === "" || longitude === null || longitude === undefined || longitude === "") return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function getLocationCardState(telemetry?: { latitude: string | null; longitude: string | null; recordedAt?: Date | string } | null) {
  const coordinate = formatLiveCoordinate(telemetry?.latitude, telemetry?.longitude);
  return {
    hasPosition: Boolean(coordinate),
    label: coordinate ? "Position actuelle" : "En attente du GPS",
    coordinate: coordinate ?? "—",
    updatedAt: telemetry?.recordedAt ? new Date(telemetry.recordedAt).toLocaleTimeString("fr-FR") : "Aucune donnée",
  };
}
