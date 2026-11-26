// Angles are radians in the named body's reference frame. The beat is a crew-local
// observation sequence, so a device clock adjustment cannot reorder new landings.
export function noteLanding(crew, observation) {
  const previous = Array.isArray(crew.landings) ? crew.landings : [];
  const last = previous[previous.length-1];
  const beat = (Number.isSafeInteger(last?.beat) ? last.beat : previous.length) + 1;
  const entry = {...observation, beat, ring: 'landing', schema: 1};
  crew.landings = [...previous.slice(-31), entry];
}

export function surfaceArc(a, b) {
  if (a.world !== b.world) return null;
  const dLat = Math.sin((a.latitude - b.latitude) / 2);
  const dLon = Math.sin((a.longitude - b.longitude) / 2);
  const h = dLat * dLat + Math.cos(a.latitude) * Math.cos(b.latitude) * dLon * dLon;
  return 2 * Math.min(a.radius, b.radius) * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function landingEntries(crew, here) {
  const entries = Array.isArray(crew.landings) ? crew.landings : [];
  return entries.map((point, i) => ({
    ...point, beat: point.beat ?? i + 1, ring: point.ring ?? 'landing',
    distance: here ? surfaceArc(point, here) : null
  })).reverse();
}
