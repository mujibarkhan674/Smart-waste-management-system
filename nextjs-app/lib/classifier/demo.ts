/**
 * DEMO MODE — NOT AI. Picks a category from a hash of the image bytes so the
 * UI can be demonstrated without a model. Enabled only with
 * CLASSIFIER_PROVIDER=demo; results are stored with provider "demo" and the UI
 * shows a prominent "Demo mode – simulated result" warning.
 */
import { createHash } from 'node:crypto'
import { WASTE_TYPES } from '@/lib/types'
import type { ClassifierProvider, ImageInput, ProviderResult } from './types'

export const demoProvider: ClassifierProvider = {
  id: 'demo',
  model: 'simulated (no model)',
  isDemo: true,
  confidenceSource: 'simulated',
  async classify(image: ImageInput): Promise<ProviderResult> {
    const digest = createHash('sha256').update(image.bytes).digest()
    const wasteType = WASTE_TYPES[digest[0] % WASTE_TYPES.length]
    return { wasteType, confidence: 0, scores: {}, matchedLabel: null }
  },
}
