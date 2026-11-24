import './env'

async function main() {
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
