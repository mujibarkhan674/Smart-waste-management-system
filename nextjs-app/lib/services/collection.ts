import { eq } from 'drizzle-orm'
import type { Db } from '@/lib/db'
import { bins, collectionHistory, type BinRow } from '@/lib/db/schema'
import { statusForFillLevel } from '@/lib/bin-status'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Record a collection for a bin inside an existing transaction:
 *  - inserts a collection_history row (with fill level and estimated volume),
 *  - resets the fill level to 0 and updates last_collected,
 *  - recalculates the status (maintenance is preserved).
 * Returns the updated bin, or null if it does not exist.
 */
export async function collectBinTx(
  tx: Tx,
  binId: number,
  opts: { collectedBy?: string | null; routeId?: number | null; at?: Date } = {},
): Promise<BinRow | null> {
  const [bin] = await tx.select().from(bins).where(eq(bins.id, binId)).for('update')
  if (!bin) return null
  const at = opts.at ?? new Date()

  await tx.insert(collectionHistory).values({
    binId: bin.id,
    binName: bin.name,
    binType: bin.type,
    routeId: opts.routeId ?? null,
    collectedBy: opts.collectedBy ?? null,
    fillLevelBefore: bin.fillLevel,
    estimatedVolumeLiters: Math.round((bin.fillLevel / 100) * bin.capacityLiters * 10) / 10,
    collectedAt: at,
  })

  const [updated] = await tx
    .update(bins)
    .set({
      fillLevel: 0,
      lastCollected: at,
      status: bin.status === 'maintenance' ? 'maintenance' : statusForFillLevel(0),
      updatedAt: at,
    })
    .where(eq(bins.id, bin.id))
    .returning()
  return updated
}
