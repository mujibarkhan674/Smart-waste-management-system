import type { ClassifierProvider } from './types'
import { ClassifierError } from './types'

export { ClassifierError }
export type { ClassifierProvider, ImageInput } from './types'

/**
 * Select the provider from CLASSIFIER_PROVIDER:
 *   clip-local (default) — local CLIP zero-shot model, no key required
 *   anthropic            — Claude vision via ANTHROPIC_API_KEY
 *   demo                 — explicitly labelled simulated results (not AI)
 */
export async function getClassifier(): Promise<ClassifierProvider> {
  const id = (process.env.CLASSIFIER_PROVIDER || 'clip-local').toLowerCase()
  switch (id) {
    case 'clip-local':
    case 'clip':
      return (await import('./clip')).clipProvider
    case 'anthropic':
    case 'claude':
      return (await import('./anthropic')).anthropicProvider
    case 'demo':
      return (await import('./demo')).demoProvider
    default:
      throw new ClassifierError(`Unknown CLASSIFIER_PROVIDER "${id}". Use clip-local, anthropic or demo.`, 500)
  }
}

export const MAX_UPLOAD_BYTES = Math.round(Number(process.env.MAX_UPLOAD_MB ?? 4) * 1024 * 1024)

/** Detect the real image type from magic bytes (ignores the client-supplied type). */
export function sniffImageType(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png'
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp'
  return null
}
