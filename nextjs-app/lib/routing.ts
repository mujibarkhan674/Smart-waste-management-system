/**
 * Route optimisation helpers.
 *
 * Ordering uses the Nearest Neighbour heuristic over straight-line (Haversine)
 * distances. Optionally, the ordered sequence is sent to an OSRM server to get
 * an estimated *road* distance and driving duration. Straight-line distance is
 * always computed and kept as a fallback, and the two are labelled separately.
 */

export interface Point {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371

/** Great-circle distance between two coordinates in kilometres (Haversine). */
export function haversineKm(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export interface OrderedStop<T> {
  item: T
  legDistanceKm: number
}

/**
 * Nearest Neighbour ordering.
 * Starting from `start` (a depot) — or, if none is given, from the first item —
 * repeatedly visit the closest unvisited item. O(n²), fine for city-scale lists.
 */
export function nearestNeighbourOrder<T extends Point>(items: T[], start?: Point | null): OrderedStop<T>[] {
  const remaining = [...items]
  const ordered: OrderedStop<T>[] = []
  let current: Point
  if (start) {
    current = start
  } else {
    const first = remaining.shift()
    if (!first) return []
    ordered.push({ item: first, legDistanceKm: 0 })
    current = first
  }
  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i])
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const [next] = remaining.splice(bestIdx, 1)
    ordered.push({ item: next, legDistanceKm: bestDist })
    current = next
  }
  return ordered
}

export const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits

export interface RoadEstimate {
  distanceKm: number
  durationMinutes: number
  provider: string
}

/**
 * Ask an OSRM server for the road distance/duration of a fixed sequence of
 * points. Returns null (and the caller falls back to straight-line distance)
 * if routing is disabled, times out or fails.
 */
export async function roadEstimate(points: Point[]): Promise<RoadEstimate | null> {
  const provider = (process.env.ROUTING_PROVIDER ?? 'haversine').toLowerCase()
  if (provider !== 'osrm' || points.length < 2) return null
  const base = (process.env.OSRM_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '')
  const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(';')
  const url = `${base}/route/v1/driving/${coords}?overview=false&alternatives=false&steps=false`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'SmartWaste/1.0' } })
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
    const body = (await res.json()) as { code: string; routes?: { distance: number; duration: number }[] }
    const route = body.routes?.[0]
    if (body.code !== 'Ok' || !route) throw new Error(`OSRM code ${body.code}`)
    return {
      distanceKm: round(route.distance / 1000),
      durationMinutes: Math.round(route.duration / 60),
      provider: 'osrm',
    }
  } catch (err) {
    console.warn('[routing] road estimate unavailable, using straight-line distance:', (err as Error).message)
    return null
  }
}

/** Configurable assumptions for straight-line time estimates. */
export function routeAssumptions() {
  return {
    averageSpeedKmh: Number(process.env.ROUTE_AVG_SPEED_KMH ?? 25),
    serviceMinutesPerStop: Number(process.env.ROUTE_SERVICE_MIN_PER_STOP ?? 5),
  }
}

export function estimateMinutes(distanceKm: number, stops: number, roadDurationMinutes?: number): number {
  const { averageSpeedKmh, serviceMinutesPerStop } = routeAssumptions()
  const driving = roadDurationMinutes ?? (distanceKm / averageSpeedKmh) * 60
  return Math.round(driving + stops * serviceMinutesPerStop)
}

export function depotFromEnv(): Point | null {
  const lat = Number(process.env.DEPOT_LATITUDE)
  const lng = Number(process.env.DEPOT_LONGITUDE)
  if (!process.env.DEPOT_LATITUDE || !process.env.DEPOT_LONGITUDE) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { latitude: lat, longitude: lng }
}
