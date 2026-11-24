import { eq } from 'drizzle-orm'
import { collectionRoutes } from '@/lib/db/schema'
import { handle, ok, parseJson, requireUser } from '@/lib/api'
import { createRouteSchema, updateRouteSchema } from '@/lib/validation'
import { createRoute, listRoutes, updateRouteStatus } from '@/lib/services/routes'
import { routeAssumptions } from '@/lib/routing'

export const dynamic = 'force-dynamic'

// GET /api/routes — admins see all routes; staff see routes assigned to them.
export const GET = handle(async () => {
  const { session, role } = await requireUser(['admin', 'staff'])
  const routes = await listRoutes(role === 'staff' ? eq(collectionRoutes.assignedTo, session.user.id) : undefined)
  return ok(routes)
})

// POST /api/routes — generate and save an optimised route (admin).
export const POST = handle(async (request) => {
  const { session } = await requireUser(['admin'])
  const input = await parseJson(request, createRouteSchema)
  const route = await createRoute({ ...input, createdBy: session.user.id })
  return ok({ route, assumptions: routeAssumptions() }, 201)
})

// PATCH /api/routes — { routeId, status } (admin, or the assigned staff member).
export const PATCH = handle(async (request) => {
  const { session, role } = await requireUser(['admin', 'staff'])
  const { routeId, status } = await parseJson(request, updateRouteSchema)
  const route = await updateRouteStatus(routeId, status, { id: session.user.id, role })
  return ok(route)
})
