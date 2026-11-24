import './env'

async function main() {
  // Prefer a direct (non-pooled) connection for schema changes when the host
  // provides one (e.g. Neon's DATABASE_URL_UNPOOLED on Vercel).
  if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
  const { migrate } = await import('drizzle-orm/node-postgres/migrator')
  const { db, pool } = await import('@/lib/db')
  console.log('Applying migrations from ./drizzle ...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations applied.')
  await pool.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
