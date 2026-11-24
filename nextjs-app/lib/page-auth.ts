import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { roleOf } from '@/lib/api'
import type { UserRole } from '@/lib/types'

/**
 * Server-side page guard. Redirects anonymous visitors to sign-in and returns
 * `{ allowed: false }` when the signed-in user's role is not permitted.
 */
export async function guardPage(path: string, roles?: UserRole[]) {
  const requestHeaders = await headers() // marks the page dynamic; must not be caught
  let session
  try {
    session = await auth.api.getSession({ headers: requestHeaders })
  } catch (err) {
    console.error('[auth] session lookup failed', err)
    session = null
  }
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(path)}`)
  const role = roleOf(session)!
  return {
    session,
    role,
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    allowed: !roles || roles.includes(role),
  }
}
