import type { BinRow } from '@/lib/db/schema'
import type { Bin } from '@/lib/types'

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null)

export function serializeBin(row: BinRow): Bin {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    fillLevel: row.fillLevel,
    capacityLiters: row.capacityLiters,
    status: row.status,
    lastCollected: iso(row.lastCollected),
    isSample: row.isSample,
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
  }
}

export { iso }
