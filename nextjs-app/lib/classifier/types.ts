import type { WasteType } from '@/lib/types'

export interface ImageInput {
  bytes: Buffer
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface ProviderResult {
  wasteType: WasteType
  /** 0-1. */
  confidence: number
  /** Per-category scores (0-1). May contain only the predicted category. */
  scores: Partial<Record<WasteType, number>>
  /** Most specific description matched, e.g. "a plastic bottle". */
  matchedLabel: string | null
}

export interface ClassifierProvider {
  id: string
  model: string
  /** True only for the explicitly simulated demo provider. */
  isDemo: boolean
  /**
   * model-probability: softmax probability from an image model
   * self-reported:     a vision-language model's own estimate (not calibrated)
   * simulated:         demo mode, not a prediction at all
   */
  confidenceSource: 'model-probability' | 'self-reported' | 'simulated'
  classify(image: ImageInput): Promise<ProviderResult>
}

export class ClassifierError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message)
  }
}
