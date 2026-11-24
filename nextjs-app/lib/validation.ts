import { z } from 'zod'
import { ROUTE_STATUSES, USER_ROLES, WASTE_TYPES } from '@/lib/types'

export const binInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  type: z.enum(WASTE_TYPES),
  address: z.string().trim().min(3, 'Address is required').max(200),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  fillLevel: z.coerce.number().int().min(0).max(100).default(0),
  capacityLiters: z.coerce.number().int().min(1).max(10000).default(240),
  maintenance: z.boolean().default(false),
})

export const binUpdateSchema = binInputSchema.partial().strict()

export const binActionSchema = z.object({ action: z.literal('collect') }).strict()

/** Legacy body accepted by PATCH /api/bins (kept for backwards compatibility). */
export const legacyBinPatchSchema = z.union([
  z.object({ id: z.coerce.number().int().positive(), action: z.literal('collect') }),
  z.object({ id: z.coerce.number().int().positive(), fillLevel: z.coerce.number().int().min(0).max(100) }),
])

export const createRouteSchema = z.object({
  binIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one bin').max(100).optional(),
  /** When binIds is omitted, all bins at/above this fill level are used. */
  threshold: z.coerce.number().int().min(0).max(100).default(70),
  start: z
    .object({ latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) })
    .nullish(),
  assignedTo: z.string().min(1).nullish(),
  name: z.string().trim().max(100).optional(),
})

export const updateRouteSchema = z.object({
  routeId: z.coerce.number().int().positive(),
  // Accept the legacy "in-progress" spelling used by the old UI.
  status: z.preprocess((v) => (v === 'in-progress' ? 'in_progress' : v), z.enum(ROUTE_STATUSES)),
})

export const updateUserSchema = z.object({ role: z.enum(USER_ROLES) }).strict()

export const dateRangeSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})
