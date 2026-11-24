import { and, asc, desc, eq, gte, inArray, ne, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bins, collectionRoutes, routeStops, user, type BinRow, type RouteRow } from '@/lib/db/schema'
import { ApiError } from '@/lib/api'
import { iso } from '@/lib/serialize'
import { depotFromEnv, estimateMinutes, nearestNeighbourOrder, roadEstimate, round, type Point } from '@/lib/routing'
import { collectBinTx } from '@/lib/services/collection'
import type { CollectionRoute, RouteStatus } from '@/lib/types'

export async function listRoutes(where?: SQL, limit = 50): Promise<CollectionRoute[]> {
  const routes = await db
    .select({ route: collectionRoutes, assignee: { id: user.id, name: user.name, email: user.email } })
    .from(collectionRoutes)
    .leftJoin(user, eq(collectionRoutes.assignedTo, user.id))
    .where(where)
    .orderBy(desc(collectionRoutes.createdAt))
    .limit(limit)
  if (routes.length === 0) return []

  const stops = await db
    .select({ stop: routeStops, bin: bins })
    .from(routeStops)
    .leftJoin(bins, eq(routeStops.binId, bins.id))
    .where(inArray(routeStops.routeId, routes.map((r) => r.route.id)))
    .orderBy(asc(routeStops.routeId), asc(routeStops.sequence))

  return routes.map(({ route, assignee }) => serializeRoute(route, assignee?.id ? assignee : null, stops.filter((s) => s.stop.routeId === route.id)))
}

export async function getRoute(id: number): Promise<CollectionRoute | null> {
  const [route] = await listRoutes(eq(collectionRoutes.id, id), 1)
  return route ?? null
}

function serializeRoute(
  route: RouteRow,
  assignee: CollectionRoute['assignedTo'],
  stops: { stop: typeof routeStops.$inferSelect; bin: typeof bins.$inferSelect | null }[],
): CollectionRoute {
  return {
    id: route.id,
    name: route.name,
    status: route.status,
    straightLineDistanceKm: route.straightLineDistanceKm,
    roadDistanceKm: route.roadDistanceKm,
    distanceMethod: route.distanceMethod,
    estimatedTimeMinutes: route.estimatedTimeMinutes,
    fillThreshold: route.fillThreshold,
    startLatitude: route.startLatitude,
    startLongitude: route.startLongitude,
    assignedTo: assignee,
    createdAt: iso(route.createdAt)!,
    startedAt: iso(route.startedAt),
    completedAt: iso(route.completedAt),
    stops: stops.map(({ stop, bin }) => ({
      sequence: stop.sequence,
      binId: stop.binId,
      binName: stop.binName,
      legDistanceKm: stop.legDistanceKm,
      fillLevelAtPlanning: stop.fillLevelAtPlanning,
      bin: bin
        ? {
            id: bin.id,
            name: bin.name,
            type: bin.type,
            address: bin.address,
            latitude: bin.latitude,
            longitude: bin.longitude,
            fillLevel: bin.fillLevel,
          }
        : null,
    })),
  }
}

export interface CreateRouteInput {
  binIds?: number[]
  threshold: number
  start?: Point | null
  assignedTo?: string | null
  name?: string
  createdBy: string
}

export async function createRoute(input: CreateRouteInput): Promise<CollectionRoute> {
  let selected: BinRow[]
  if (input.binIds && input.binIds.length > 0) {
    const ids = [...new Set(input.binIds)]
    selected = await db.select().from(bins).where(inArray(bins.id, ids))
    const missing = ids.filter((id) => !selected.some((b) => b.id === id))
    if (missing.length) throw new ApiError(404, `Bins not found: ${missing.join(', ')}`)
    const inMaintenance = selected.filter((b) => b.status === 'maintenance')
    if (inMaintenance.length) {
      throw new ApiError(400, `Bins under maintenance cannot be routed: ${inMaintenance.map((b) => b.name).join(', ')}`)
    }
  } else {
    selected = await db
      .select()
      .from(bins)
      .where(and(gte(bins.fillLevel, input.threshold), ne(bins.status, 'maintenance')))
  }
  if (selected.length === 0) {
    throw new ApiError(400, `No bins are at or above the ${input.threshold}% threshold`)
  }

  if (input.assignedTo) {
    const [assignee] = await db.select().from(user).where(eq(user.id, input.assignedTo))
    if (!assignee || !['staff', 'admin'].includes(assignee.role)) {
      throw new ApiError(400, 'Routes can only be assigned to collection staff or admins')
    }
  }

  const start = input.start ?? depotFromEnv()
  // Without a depot, begin at the fullest (most urgent) bin.
  const candidates = [...selected].sort((a, b) => b.fillLevel - a.fillLevel)
  const ordered = nearestNeighbourOrder(candidates, start)
  const straightLine = round(ordered.reduce((sum, s) => sum + s.legDistanceKm, 0))

  const points: Point[] = [...(start ? [start] : []), ...ordered.map((s) => s.item)]
  const road = await roadEstimate(points)
  const estimatedTime = road
    ? estimateMinutes(road.distanceKm, ordered.length, road.durationMinutes)
    : estimateMinutes(straightLine, ordered.length)

  const routeId = await db.transaction(async (tx) => {
    const [route] = await tx
      .insert(collectionRoutes)
      .values({
        name: input.name || `Route ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (${ordered.length} stops)`,
        status: 'pending',
        straightLineDistanceKm: straightLine,
        roadDistanceKm: road?.distanceKm ?? null,
        distanceMethod: road ? 'road' : 'straight_line',
        estimatedTimeMinutes: estimatedTime,
        fillThreshold: input.binIds?.length ? null : input.threshold,
        startLatitude: start?.latitude ?? null,
        startLongitude: start?.longitude ?? null,
        assignedTo: input.assignedTo ?? null,
        createdBy: input.createdBy,
      })
      .returning({ id: collectionRoutes.id })
    await tx.insert(routeStops).values(
      ordered.map((s, i) => ({
        routeId: route.id,
        binId: s.item.id,
        binName: s.item.name,
        sequence: i + 1,
        legDistanceKm: round(s.legDistanceKm, 3),
        fillLevelAtPlanning: s.item.fillLevel,
      })),
    )
    return route.id
  })

  return (await getRoute(routeId))!
}

const NEXT_STATUS: Record<RouteStatus, RouteStatus | null> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: null,
}

/**
 * Move a route to its next status. Completing a route marks every bin on it as
 * collected (history row + fill reset) in the same transaction.
 */
export async function updateRouteStatus(
  routeId: number,
  status: RouteStatus,
  actor: { id: string; role: string },
): Promise<CollectionRoute> {
  await db.transaction(async (tx) => {
    const [route] = await tx.select().from(collectionRoutes).where(eq(collectionRoutes.id, routeId)).for('update')
    if (!route) throw new ApiError(404, 'Route not found')
    if (actor.role === 'staff' && route.assignedTo !== actor.id) {
      throw new ApiError(403, 'This route is not assigned to you')
    }
    if (route.status === status) return
    if (NEXT_STATUS[route.status] !== status) {
      throw new ApiError(409, `Cannot change a ${route.status.replace('_', ' ')} route to ${status.replace('_', ' ')}`)
    }

    const now = new Date()
    await tx
      .update(collectionRoutes)
      .set(status === 'in_progress' ? { status, startedAt: now } : { status, completedAt: now })
      .where(eq(collectionRoutes.id, routeId))

    if (status === 'completed') {
      const stops = await tx.select().from(routeStops).where(eq(routeStops.routeId, routeId)).orderBy(asc(routeStops.sequence))
      for (const stop of stops) {
        if (stop.binId == null) continue // bin was deleted after planning
        await collectBinTx(tx, stop.binId, { collectedBy: route.assignedTo ?? actor.id, routeId, at: now })
      }
    }
  })
  return (await getRoute(routeId))!
}
