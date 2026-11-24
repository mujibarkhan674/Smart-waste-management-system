import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z, ZodError, type ZodTypeAny } from 'zod'
import { auth, type Session } from '@/lib/auth'
import { USER_ROLES, type UserRole } from '@/lib/types'

/**
 * Consistent JSON envelope for every API route:
 *   success: { data: T }
 *   failure: { error: string, details?: unknown }
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

type Handler<C> = (request: Request, context: C) => Promise<Response>

/** Wrap a route handler with uniform error handling. */
export function handle<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await fn(request, context)
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status })
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: err.flatten() },
          { status: 400 },
        )
      }
      const pgCode = (err as { code?: string })?.code
      if (pgCode === 'ECONNREFUSED' || pgCode === 'ENOTFOUND' || pgCode === '3D000') {
        console.error('[api] database unavailable', err)
        return NextResponse.json(
          { error: 'Database unavailable. Check DATABASE_URL and that migrations have run.' },
          { status: 503 },
        )
      }
      if (pgCode === '42P01') {
        console.error('[api] missing table', err)
        return NextResponse.json(
          { error: 'Database tables are missing. Run `pnpm db:migrate`.' },
          { status: 503 },
        )
      }
      console.error('[api] unexpected error', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

export async function parseJson<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON')
  }
  return schema.parse(body)
}

export function parseId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid id')
  return id
}

export function roleOf(session: Session | null): UserRole | null {
  const role = (session?.user as { role?: string } | undefined)?.role
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : session ? 'user' : null
}

export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() })
}

/** Require a signed-in user, optionally restricted to the given roles. */
export async function requireUser(roles?: UserRole[]): Promise<{ session: Session; role: UserRole }> {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Authentication required')
  const role = roleOf(session)!
  if (roles && !roles.includes(role)) throw new ApiError(403, 'You do not have permission for this action')
  return { session, role }
}
