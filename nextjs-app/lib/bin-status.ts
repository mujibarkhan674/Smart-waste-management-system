import type { BinStatus } from './types'

/**
 * Derive a bin's status from its fill level.
 *   0–49%   active
 *   50–69%  monitoring
 *   70–89%  almost_full
 *   90–100% needs_collection
 * `maintenance` is a manual status and is never derived.
 */
export function statusForFillLevel(fillLevel: number): Exclude<BinStatus, 'maintenance'> {
  if (fillLevel >= 90) return 'needs_collection'
  if (fillLevel >= 70) return 'almost_full'
  if (fillLevel >= 50) return 'monitoring'
  return 'active'
}

/** Status after a change: maintenance is sticky unless explicitly cleared. */
export function resolveBinStatus(fillLevel: number, maintenance: boolean): BinStatus {
  return maintenance ? 'maintenance' : statusForFillLevel(fillLevel)
}

export function fillLevelColor(level: number): string {
  if (level >= 90) return 'bg-red-500'
  if (level >= 70) return 'bg-amber-500'
  if (level >= 50) return 'bg-yellow-500'
  return 'bg-green-500'
}
