import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bins, collectionRoutes, routeStops } from '@/lib/db/schema'
import { ApiError, handle, ok, parseId, requireUser } from '@/lib/api'
import { binActionSchema, binUpdateSchema } from '@/lib/validation'
import { resolveBinStatus } from '@/lib/bin-status'
import { serializeBin } from '@/lib/serialize'
import { collectBinTx } from '@/lib/services/collection'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/bins/[id] (admin, staff)
export const GET = handle<Ctx>(async (_request, { params }) => {
  await requireUser(['admin', 'staff'])
  const id = parseId((await params).id)
  const [row] = await db.select().from(bins).where(eq(bins.id, id))
  if (!row) throw new ApiError(404, 'Bin not found')
  return ok(serializeBin(row))
})

// PATCH /api/bins/[id]
//   { action: 'collect' }         — mark collected (admin, staff)
//   { name?, type?, address?, latitude?, longitude?, fillLevel?, capacityLiters?, maintenance? } — edit (admin)
export const PATCH = handle<Ctx>(async (request, { params }) => {
  const id = parseId((await params).id)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON')
  }

  const action = binActionSchema.safeParse(body)
  if (action.success) {
    const { session } = await requireUser(['admin', 'staff'])
    const updated = await db.transaction((tx) => collectBinTx(tx, id, { collectedBy: session.user.id }))
    if (!updated) throw new ApiError(404, 'Bin not found')
    return ok(serializeBin(updated))
  }

  await requireUser(['admin'])
  const input = binUpdateSchema.parse(body)
  if (Object.keys(input).length === 0) throw new ApiError(400, 'No fields to update')

  const [current] = await db.select().from(bins).where(eq(bins.id, id))
  if (!current) throw new ApiError(404, 'Bin not found')

  const { maintenance, ...fields } = input
  const fillLevel = fields.fillLevel ?? current.fillLevel
  const inMaintenance = maintenance ?? current.status === 'maintenance'
  const [updated] = await db
    .update(bins)
    .set({ ...fields, status: resolveBinStatus(fillLevel, inMaintenance), updatedAt: new Date() })
    .where(eq(bins.id, id))
    .returning()
  return ok(serializeBin(updated))
})

// DELETE /api/bins/[id] (admin). Refused while the bin is on an active route.
export const DELETE = handle<Ctx>(async (_request, { params }) => {
  await requireUser(['admin'])
  const id = parseId((await params).id)

  const active = await db
    .select({ routeId: collectionRoutes.id, name: collectionRoutes.name })
    .from(routeStops)
    .innerJoin(collectionRoutes, eq(routeStops.routeId, collectionRoutes.id))
    .where(and(eq(routeStops.binId, id), inArray(collectionRoutes.status, ['pending', 'in_progress'])))
  if (active.length > 0) {
    throw new ApiError(
      409,
      `This bin is on an active route (${active.map((r) => r.name).join(', ')}). Complete the route first.`,
    )
  }

  const [deleted] = await db.delete(bins).where(eq(bins.id, id)).returning({ id: bins.id })
  if (!deleted) throw new ApiError(404, 'Bin not found')
  return ok({ id: deleted.id, deleted: true })
})
