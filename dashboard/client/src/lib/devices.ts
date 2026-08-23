export function getSelectedDevice<T extends { id: number }>(devices: T[], selectedId: number | null) {
  return devices.find(device => device.id === selectedId) ?? devices[0];
}
