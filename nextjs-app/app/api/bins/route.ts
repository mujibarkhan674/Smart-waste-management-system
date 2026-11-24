import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bins } from '@/lib/db/schema'
import { ApiError, handle, ok, parseJson, requireUser } from '@/lib/api'
import { binInputSchema, legacyBinPatchSchema } from '@/lib/validation'
import { resolveBinStatus } from '@/lib/bin-status'
import { serializeBin } from '@/lib/serialize'
import { collectBinTx } from '@/lib/services/collection'

export const dynamic = 'force-dynamic'

// GET /api/bins — list all bins (admin, staff)
export const GET = handle(async () => {
  await requireUser(['admin', 'staff'])
  const rows = await db.select().from(bins).orderBy(asc(bins.id))
  return ok(rows.map(serializeBin))
})

// POST /api/bins — create a bin (admin)
export const POST = handle(async (request) => {
  await requireUser(['admin'])
  const input = await parseJson(request, binInputSchema)
  const [row] = await db
    .insert(bins)
    .values({
      name: input.name,
      type: input.type,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      fillLevel: input.fillLevel,
      capacityLiters: input.capacityLiters,
      status: resolveBinStatus(input.fillLevel, input.maintenance),
    })
    .returning()
  return ok(serializeBin(row), 201)
})

// PATCH /api/bins — legacy endpoint: { id, action: 'collect' } or { id, fillLevel }.
// New code should use PATCH /api/bins/[id].
export const PATCH = handle(async (request) => {
  const body = await parseJson(request, legacyBinPatchSchema)
  if ('action' in body) {
    const { session } = await requireUser(['admin', 'staff'])
    const updated = await db.transaction((tx) => collectBinTx(tx, body.id, { collectedBy: session.user.id }))
    if (!updated) throw new ApiError(404, 'Bin not found')
    return ok(serializeBin(updated))
  }
  await requireUser(['admin'])
  const [current] = await db.select().from(bins).where(eq(bins.id, body.id))
  if (!current) throw new ApiError(404, 'Bin not found')
  const [updated] = await db
    .update(bins)
    .set({
      fillLevel: body.fillLevel,
      status: resolveBinStatus(body.fillLevel, current.status === 'maintenance'),
      updatedAt: new Date(),
    })
    .where(eq(bins.id, body.id))
    .returning()
  return ok(serializeBin(updated))
})
