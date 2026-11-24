import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
  console.warn('[db] DATABASE_URL is not set. Database operations will fail. See .env.example.')
}

// Reuse a single pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __smartwastePool?: Pool }

export const pool =
  globalForDb.__smartwastePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  })

if (process.env.NODE_ENV !== 'production') globalForDb.__smartwastePool = pool

export const db = drizzle(pool, { schema })
export type Db = typeof db
