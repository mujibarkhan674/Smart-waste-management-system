// Load environment variables for CLI scripts (Next.js loads them itself at runtime).
// Order: .env.local overrides .env. Missing files are ignored.
import { existsSync } from 'node:fs'

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.')
  process.exit(1)
}
