import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { classifications, type ClassificationRow } from '@/lib/db/schema'
import { ApiError, handle, ok, requireUser } from '@/lib/api'
import { ClassifierError, getClassifier, MAX_UPLOAD_BYTES, sniffImageType } from '@/lib/classifier'
import { WASTE_INFO, WASTE_TYPES, type WasteClassification, type WasteType } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CONFIDENCE_SOURCE: Record<string, WasteClassification['confidenceSource']> = {
  'clip-local': 'model-probability',
  anthropic: 'self-reported',
  demo: 'simulated',
}

function toApi(row: ClassificationRow): WasteClassification {
  const scores = WASTE_TYPES.filter((t) => row.scores?.[t] != null)
    .map((type) => ({ type, score: row.scores![type]! }))
    .sort((a, b) => b.score - a.score)
  return {
    id: row.id,
    wasteType: row.wasteType,
    confidence: row.confidence,
    confidenceSource: CONFIDENCE_SOURCE[row.provider] ?? 'model-probability',
    provider: row.provider,
    model: row.model,
    isDemo: row.provider === 'demo',
    matchedLabel: row.matchedLabel,
    scores,
    suggestedBin: WASTE_INFO[row.wasteType].binName,
    tips: WASTE_INFO[row.wasteType].tips,
    imageName: row.imageName,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

// GET /api/classify — the signed-in user's history. Admins can pass ?scope=all.
export const GET = handle(async (request) => {
  const { session, role } = await requireUser()
  const url = new URL(request.url)
  const all = role === 'admin' && url.searchParams.get('scope') === 'all'
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20))
  const rows = await db
    .select()
    .from(classifications)
    .where(all ? undefined : eq(classifications.userId, session.user.id))
    .orderBy(desc(classifications.createdAt))
    .limit(limit)
  return ok(rows.map(toApi))
})

async function readImage(request: Request): Promise<{ bytes: Buffer; name: string | null }> {
  const contentType = request.headers.get('content-type') ?? ''
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_UPLOAD_BYTES * 1.4 + 10_000) {
    throw new ApiError(413, `Image is too large. Maximum size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`)
  }

  if (contentType.startsWith('multipart/form-data')) {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      throw new ApiError(400, 'Invalid form data')
    }
    const file = form.get('image')
    if (!(file instanceof File)) throw new ApiError(400, 'Upload an image in the "image" field')
    if (file.size === 0) throw new ApiError(400, 'The uploaded file is empty')
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(413, `Image is too large. Maximum size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`)
    }
    return { bytes: Buffer.from(await file.arrayBuffer()), name: file.name?.slice(0, 200) || null }
  }

  // Legacy JSON body: { imageData: "data:image/png;base64,..." }
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as { imageData?: unknown } | null
    const match = typeof body?.imageData === 'string' && body.imageData.match(/^data:[\w/+.-]+;base64,(.+)$/)
    if (!match) throw new ApiError(400, 'imageData must be a base64 data URL')
    const bytes = Buffer.from(match[1], 'base64')
    if (bytes.length > MAX_UPLOAD_BYTES) throw new ApiError(413, 'Image is too large')
    return { bytes, name: null }
  }

  throw new ApiError(415, 'Send the image as multipart/form-data')
}

// POST /api/classify — multipart/form-data with field "image" (JPG, PNG or WebP).
export const POST = handle(async (request) => {
  const { session } = await requireUser()
  const { bytes, name } = await readImage(request)
  const mimeType = sniffImageType(bytes)
  if (!mimeType) throw new ApiError(415, 'Unsupported file type. Please upload a JPG, PNG or WebP image.')

  let provider
  let result
  try {
    provider = await getClassifier()
    result = await provider.classify({ bytes, mimeType })
  } catch (err) {
    if (err instanceof ClassifierError) throw new ApiError(err.status, err.message)
    console.error('[classify] provider failure', err)
    throw new ApiError(502, 'Classification failed. Please try again with a clearer photo.')
  }

  const [row] = await db
    .insert(classifications)
    .values({
      userId: session.user.id,
      wasteType: result.wasteType as WasteType,
      confidence: result.confidence,
      provider: provider.id,
      model: provider.model,
      scores: result.scores as Record<string, number>,
      matchedLabel: result.matchedLabel,
      imageName: name,
      imageMimeType: mimeType,
      imageSizeBytes: bytes.length,
    })
    .returning()

  return ok(toApi(row), 201)
})
