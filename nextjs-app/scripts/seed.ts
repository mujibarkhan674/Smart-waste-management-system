/**
 * Seed demonstration data.
 *
 *   pnpm db:seed           insert sample bins, sample collection history and demo accounts
 *   pnpm db:seed --reset   delete previously seeded sample data first
 *
 * All seeded bins and history rows have is_sample = true and the bins use
 * clearly labelled SAMPLE locations in Kolkata. They are NOT official municipal
 * bin locations. No classification records are seeded: those only come from
 * real model predictions.
 */
import './env'

const SAMPLE_BINS = [
  { name: 'Salt Lake Sector V Organic', type: 'organic', address: 'Near Sector V, Salt Lake, Kolkata (sample location)', latitude: 22.5735, longitude: 88.4331, fillLevel: 85 },
  { name: 'Park Street Recycling', type: 'recyclable', address: 'Near Park Street, Kolkata (sample location)', latitude: 22.553, longitude: 88.352, fillLevel: 45 },
  { name: 'Bhowanipore Medical Zone Hazardous', type: 'hazardous', address: 'Near AJC Bose Road, Bhowanipore, Kolkata (sample location)', latitude: 22.539, longitude: 88.344, fillLevel: 92 },
  { name: 'Chandni Chowk E-Waste', type: 'electronic', address: 'Near Chandni Chowk, Kolkata (sample location)', latitude: 22.565, longitude: 88.353, fillLevel: 67 },
  { name: 'Gariahat Market General', type: 'general', address: 'Near Gariahat Road, Kolkata (sample location)', latitude: 22.518, longitude: 88.367, fillLevel: 78 },
  { name: 'New Market Organic', type: 'organic', address: 'Near Lindsay Street, New Market, Kolkata (sample location)', latitude: 22.5602, longitude: 88.3507, fillLevel: 55 },
  { name: 'College Street Recycling', type: 'recyclable', address: 'Near College Street, Kolkata (sample location)', latitude: 22.576, longitude: 88.363, fillLevel: 88 },
  { name: 'Howrah Station General', type: 'general', address: 'Near Howrah Station approach, Howrah (sample location)', latitude: 22.583, longitude: 88.342, fillLevel: 95 },
  { name: 'New Town Action Area I Recycling', type: 'recyclable', address: 'Near Action Area I, New Town, Kolkata (sample location)', latitude: 22.58, longitude: 88.46, fillLevel: 30 },
  { name: 'Behala Chowrasta General', type: 'general', address: 'Near Behala Chowrasta, Kolkata (sample location)', latitude: 22.498, longitude: 88.31, fillLevel: 15, maintenance: true },
] as const

const DEMO_USERS = [
  { email: 'admin@smartwaste.demo', name: 'Demo Admin', role: 'admin', env: 'SEED_ADMIN_PASSWORD' },
  { email: 'staff@smartwaste.demo', name: 'Demo Collection Staff', role: 'staff', env: 'SEED_STAFF_PASSWORD' },
  { email: 'user@smartwaste.demo', name: 'Demo User', role: 'user', env: 'SEED_USER_PASSWORD' },
] as const

const DEFAULT_PASSWORD = 'ChangeMe123!'

// Deterministic PRNG so repeated seeds give the same history.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function main() {
  const reset = process.argv.includes('--reset')
  const { db, pool } = await import('@/lib/db')
  const schema = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const { auth } = await import('@/lib/auth')
  const { resolveBinStatus } = await import('@/lib/bin-status')

  if (reset) {
    await db.delete(schema.collectionHistory).where(eq(schema.collectionHistory.isSample, true))
    await db.delete(schema.bins).where(eq(schema.bins.isSample, true))
    console.log('Removed existing sample bins and sample collection history.')
  }

  // --- Demo accounts --------------------------------------------------------
  for (const u of DEMO_USERS) {
    const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, u.email))
    if (!existing) {
      const password = process.env[u.env] || DEFAULT_PASSWORD
      await auth.api.signUpEmail({ body: { email: u.email, password, name: u.name } })
      console.log(`Created ${u.role} account ${u.email}${process.env[u.env] ? '' : ` (password: ${DEFAULT_PASSWORD} — change it!)`}`)
    }
    await db.update(schema.user).set({ role: u.role }).where(eq(schema.user.email, u.email))
  }
  const [staff] = await db.select().from(schema.user).where(eq(schema.user.email, 'staff@smartwaste.demo'))

  // --- Sample bins ----------------------------------------------------------
  const existingSample = await db.select({ id: schema.bins.id }).from(schema.bins).where(eq(schema.bins.isSample, true))
  if (existingSample.length > 0) {
    console.log(`Sample bins already present (${existingSample.length}). Use --reset to recreate.`)
    await pool.end()
    return
  }

  const rand = mulberry32(20261124)
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  for (const b of SAMPLE_BINS) {
    // Generate ~60 days of sample collections every 2–5 days.
    const history: { at: Date; fill: number }[] = []
    let t = now - 60 * DAY + Math.floor(rand() * 3) * DAY
    while (t < now - DAY) {
      const at = new Date(t + Math.floor(rand() * 10 + 7) * 60 * 60 * 1000) // between 07:00 and 17:00-ish
      history.push({ at, fill: Math.round(60 + rand() * 38) })
      t += Math.floor(2 + rand() * 4) * DAY
    }
    const lastCollected = history.at(-1)?.at ?? null
    const maintenance = 'maintenance' in b && b.maintenance

    const [bin] = await db
      .insert(schema.bins)
      .values({
        name: b.name,
        type: b.type,
        address: b.address,
        latitude: b.latitude,
        longitude: b.longitude,
        fillLevel: b.fillLevel,
        capacityLiters: b.type === 'hazardous' || b.type === 'electronic' ? 120 : 240,
        status: resolveBinStatus(b.fillLevel, Boolean(maintenance)),
        lastCollected,
        isSample: true,
      })
      .returning()

    if (history.length) {
      await db.insert(schema.collectionHistory).values(
        history.map((h) => ({
          binId: bin.id,
          binName: bin.name,
          binType: bin.type,
          collectedBy: staff?.id ?? null,
          fillLevelBefore: h.fill,
          estimatedVolumeLiters: Math.round((h.fill / 100) * bin.capacityLiters * 10) / 10,
          isSample: true,
          collectedAt: h.at,
        })),
      )
    }
    console.log(`Inserted sample bin "${bin.name}" with ${history.length} sample collections.`)
  }

  console.log('Seed complete.')
  await pool.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
