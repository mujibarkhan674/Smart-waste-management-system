import { handle, ok, requireUser } from '@/lib/api'
import { dateRangeSchema } from '@/lib/validation'
import { getDashboardStats } from '@/lib/services/stats'

export const dynamic = 'force-dynamic'

// GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD (admin). Defaults to the last 30 days.
export const GET = handle(async (request) => {
  await requireUser(['admin'])
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const { from, to } = dateRangeSchema.parse(params)
  return ok(await getDashboardStats(from, to))
})
