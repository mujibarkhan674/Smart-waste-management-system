// Usage: pnpm user:role <email> <admin|staff|user>
import './env'

async function main() {
  const [email, role] = process.argv.slice(2)
  if (!email || !['admin', 'staff', 'user'].includes(role)) {
    console.error('Usage: pnpm user:role <email> <admin|staff|user>')
    process.exit(1)
  }
  const { db, pool } = await import('@/lib/db')
  const { user } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const updated = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.email, email.toLowerCase()))
    .returning({ id: user.id })
  console.log(updated.length ? `Set role of ${email} to ${role}.` : `No user with email ${email}. Sign up first.`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
