import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { ApiError, handle, ok, parseJson, requireUser } from '@/lib/api'
import { updateUserSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/users/[id] — { role } (admin). Admins cannot change their own role.
export const PATCH = handle<Ctx>(async (request, { params }) => {
  const { session } = await requireUser(['admin'])
  const { id } = await params
  const { role } = await parseJson(request, updateUserSchema)
  if (id === session.user.id) throw new ApiError(400, 'You cannot change your own role')
  const [updated] = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning({ id: user.id, name: user.name, email: user.email, role: user.role })
  if (!updated) throw new ApiError(404, 'User not found')
  return ok(updated)
})
