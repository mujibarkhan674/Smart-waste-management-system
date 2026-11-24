/**
 * Optional external vision provider using Claude (Anthropic API).
 * Requires ANTHROPIC_API_KEY. Useful on hosts where running the local CLIP
 * model is impractical (e.g. serverless size limits).
 *
 * NOTE: the confidence here is the model's own estimate (self-reported), not a
 * calibrated probability. The UI labels it accordingly.
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod/v4'
import { WASTE_TYPES } from '@/lib/types'
import { ClassifierError, type ClassifierProvider, type ImageInput, type ProviderResult } from './types'

const MODEL = process.env.ANTHROPIC_CLASSIFIER_MODEL || 'claude-opus-5-5'

const ResultSchema = z.object({
  category: z.enum(WASTE_TYPES),
  confidence: z.number().describe('Your confidence in the category, from 0 to 1'),
  item_description: z.string().describe('Short description of the main item, e.g. "a crushed plastic bottle"'),
})

const SYSTEM = `You classify photos of waste items for a municipal waste-sorting app.
Choose exactly one category:
- organic: food scraps, peels, garden waste, other biodegradable material
- recyclable: clean paper, cardboard, plastic bottles/containers, glass, metal cans
- hazardous: batteries, chemicals, paint, medicines, syringes, aerosols, fluorescent bulbs
- general: non-recyclable, non-compostable residual waste (tissues, diapers, wrappers, styrofoam)
- electronic: phones, computers, cables, chargers, circuit boards, appliances
If several items are shown, classify the most prominent one. If the image does not clearly show waste, still pick the closest category but give a low confidence.`

let client: Anthropic | null = null

export const anthropicProvider: ClassifierProvider = {
  id: 'anthropic',
  model: MODEL,
  isDemo: false,
  confidenceSource: 'self-reported',
  async classify(image: ImageInput): Promise<ProviderResult> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ClassifierError('CLASSIFIER_PROVIDER=anthropic requires ANTHROPIC_API_KEY to be set on the server.', 503)
    }
    client ??= new Anthropic()
    try {
      const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 2048,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM,
        output_config: { effort: 'low', format: betaZodOutputFormat(ResultSchema) },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.bytes.toString('base64') } },
              { type: 'text', text: 'Classify this waste item.' },
            ],
          },
        ],
      })
      if (response.stop_reason === 'refusal') throw new ClassifierError('The vision model declined to classify this image.', 422)
      const parsed = response.parsed_output
      if (!parsed) throw new ClassifierError('The vision model returned an unreadable response.', 502)
      const confidence = Math.max(0, Math.min(1, parsed.confidence))
      return {
        wasteType: parsed.category,
        confidence,
        scores: { [parsed.category]: confidence },
        matchedLabel: parsed.item_description,
      }
    } catch (err) {
      if (err instanceof ClassifierError) throw err
      if (err instanceof Anthropic.AuthenticationError) throw new ClassifierError('Invalid ANTHROPIC_API_KEY.', 503)
      if (err instanceof Anthropic.RateLimitError) throw new ClassifierError('Vision API rate limit reached. Try again shortly.', 503)
      if (err instanceof Anthropic.APIError) throw new ClassifierError(`Vision API error (${err.status}).`, 502)
      if (err instanceof Anthropic.APIConnectionError) throw new ClassifierError('Could not reach the vision API.', 503)
      throw err
    }
  },
}
