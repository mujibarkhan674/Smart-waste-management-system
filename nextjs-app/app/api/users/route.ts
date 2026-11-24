import { asc, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { handle, ok, requireUser } from '@/lib/api'
import { USER_ROLES, type UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET /api/users[?role=staff,admin] — list users (admin)
export const GET = handle(async (request) => {
  await requireUser(['admin'])
  const roleParam = new URL(request.url).searchParams.get('role')
  const roles = roleParam?.split(',').filter((r): r is UserRole => USER_ROLES.includes(r as UserRole))
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
    .from(user)
    .where(roles?.length ? inArray(user.role, roles) : undefined)
    .orderBy(asc(user.createdAt))
  return ok(rows)
})
