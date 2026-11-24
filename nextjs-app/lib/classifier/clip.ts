/**
 * Local zero-shot classifier using OpenAI CLIP (ViT-B/32, ONNX) via
 * transformers.js. No API key needed; the model (~90 MB) is downloaded from
 * the Hugging Face Hub on first use and cached on disk.
 *
 * How it works: the image is compared against text descriptions of typical
 * items in each waste category. CLIP produces a softmax probability over all
 * descriptions; a category's confidence is the sum of its descriptions'
 * probabilities. This is a genuine model probability, but CLIP is not
 * fine-tuned on waste images, so accuracy is limited (see README).
 */
import path from 'node:path'
import { WASTE_TYPES, type WasteType } from '@/lib/types'
import { ClassifierError, type ClassifierProvider, type ImageInput, type ProviderResult } from './types'

export const CATEGORY_PROMPTS: Record<WasteType, string[]> = {
  organic: [
    'food scraps',
    'fruit and vegetable peels',
    'leftover cooked food',
    'rotten fruit',
    'eggshells',
    'garden leaves and grass clippings',
    'used coffee grounds and tea leaves',
  ],
  recyclable: [
    'a plastic bottle',
    'an aluminium drink can',
    'a glass bottle or jar',
    'a cardboard box',
    'newspapers and paper',
    'a metal tin can',
    'a clean plastic food container',
  ],
  hazardous: [
    'used batteries',
    'a paint can',
    'a bottle of household chemicals',
    'medicine pills and blister packs',
    'a used syringe',
    'an aerosol spray can',
    'a fluorescent light bulb',
  ],
  general: [
    'used tissues',
    'a disposable diaper',
    'a chips packet wrapper',
    'cigarette butts',
    'a styrofoam food container',
    'a dirty plastic bag',
    'a bag of mixed household trash',
  ],
  electronic: [
    'a mobile phone',
    'a laptop computer',
    'a computer keyboard and mouse',
    'electrical cables and chargers',
    'a circuit board',
    'an old television',
    'a broken electronic appliance',
  ],
}

const MODEL_ID = process.env.CLIP_MODEL_ID || 'Xenova/clip-vit-base-patch32'

type ZeroShot = (
  image: unknown,
  labels: string[],
  options: { hypothesis_template: string },
) => Promise<{ label: string; score: number }[]>

const globalForClip = globalThis as unknown as { __clipPipeline?: Promise<ZeroShot> }

async function loadPipeline(): Promise<ZeroShot> {
  const { pipeline, env } = await import('@huggingface/transformers')
  env.cacheDir =
    process.env.TRANSFORMERS_CACHE_DIR ||
    (process.env.VERCEL ? '/tmp/transformers-cache' : path.join(process.cwd(), '.cache', 'models'))
  env.allowRemoteModels = process.env.CLIP_ALLOW_DOWNLOAD !== 'false'
  const pipe = await pipeline('zero-shot-image-classification', MODEL_ID, { dtype: 'q8' })
  return pipe as unknown as ZeroShot
}

function getPipeline(): Promise<ZeroShot> {
  if (!globalForClip.__clipPipeline) {
    globalForClip.__clipPipeline = loadPipeline().catch((err) => {
      globalForClip.__clipPipeline = undefined // allow retry
      throw err
    })
  }
  return globalForClip.__clipPipeline
}

export const clipProvider: ClassifierProvider = {
  id: 'clip-local',
  model: MODEL_ID,
  isDemo: false,
  confidenceSource: 'model-probability',
  async classify(image: ImageInput): Promise<ProviderResult> {
    let classifier: ZeroShot
    try {
      classifier = await getPipeline()
    } catch (err) {
      console.error('[clip] failed to load model', err)
      throw new ClassifierError(
        'The image classification model could not be loaded. Check network access to huggingface.co on first run, or TRANSFORMERS_CACHE_DIR.',
        503,
      )
    }

    const { RawImage } = await import('@huggingface/transformers')
    let raw
    try {
      raw = await RawImage.fromBlob(new Blob([new Uint8Array(image.bytes)], { type: image.mimeType }))
    } catch {
      throw new ClassifierError('The image could not be decoded. Please upload a valid JPG, PNG or WebP file.', 422)
    }

    const labelToType = new Map<string, WasteType>()
    for (const type of WASTE_TYPES) for (const p of CATEGORY_PROMPTS[type]) labelToType.set(p, type)
    const outputs = await classifier(raw, [...labelToType.keys()], { hypothesis_template: 'a photo of {}' })

    const scores = Object.fromEntries(WASTE_TYPES.map((t) => [t, 0])) as Record<WasteType, number>
    for (const { label, score } of outputs) scores[labelToType.get(label)!] += score
    const [wasteType, confidence] = (Object.entries(scores) as [WasteType, number][]).sort((a, b) => b[1] - a[1])[0]
    const top = [...outputs].sort((a, b) => b.score - a.score)[0]
    return { wasteType, confidence: Math.min(1, confidence), scores, matchedLabel: top?.label ?? null }
  },
}
