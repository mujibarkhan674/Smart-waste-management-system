import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

function deploymentUrls(): string[] {
  const urls: string[] = []
  if (process.env.BETTER_AUTH_URL) urls.push(process.env.BETTER_AUTH_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) urls.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  if (process.env.VERCEL_URL) urls.push(`https://${process.env.VERCEL_URL}`)
  for (const origin of (process.env.TRUSTED_ORIGINS ?? '').split(',')) {
    if (origin.trim()) urls.push(origin.trim())
  }
  return urls
}

export const auth = betterAuth({
  // BETTER_AUTH_SECRET is read automatically from the environment.
  database: pool,
  baseURL: deploymentUrls()[0],
  trustedOrigins: deploymentUrls(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      // admin | staff | user. `input: false` prevents users from choosing
      // their own role at sign-up; admins change it via /api/users/[id].
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
})

export type Session = typeof auth.$Infer.Session
