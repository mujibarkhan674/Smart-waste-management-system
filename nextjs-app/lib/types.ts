// Shared domain types used by both API routes and client components.
// Dates are ISO strings because they travel over JSON.

export const WASTE_TYPES = ['organic', 'recyclable', 'hazardous', 'general', 'electronic'] as const
export type WasteType = (typeof WASTE_TYPES)[number]

export const BIN_STATUSES = [
  'active',
  'monitoring',
  'almost_full',
  'needs_collection',
  'maintenance',
] as const
export type BinStatus = (typeof BIN_STATUSES)[number]

export const ROUTE_STATUSES = ['pending', 'in_progress', 'completed'] as const
export type RouteStatus = (typeof ROUTE_STATUSES)[number]

export const USER_ROLES = ['admin', 'staff', 'user'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  staff: 'Collection Staff',
  user: 'General User',
}

export interface Bin {
  id: number
  name: string
  type: WasteType
  address: string
  latitude: number
  longitude: number
  fillLevel: number
  capacityLiters: number
  status: BinStatus
  lastCollected: string | null
  isSample: boolean
  createdAt: string
  updatedAt: string
}

export interface ClassificationScore {
  type: WasteType
  score: number
}

export interface WasteClassification {
  id: number
  wasteType: WasteType
  /** 0-1 probability from the provider. */
  confidence: number
  confidenceSource: 'model-probability' | 'self-reported' | 'simulated'
  provider: string
  model: string
  isDemo: boolean
  matchedLabel: string | null
  scores: ClassificationScore[]
  suggestedBin: string
  tips: string[]
  imageName: string | null
  createdAt: string
}

export interface RouteStop {
  sequence: number
  binId: number | null
  binName: string
  legDistanceKm: number
  fillLevelAtPlanning: number
  bin: Pick<Bin, 'id' | 'name' | 'type' | 'address' | 'latitude' | 'longitude' | 'fillLevel'> | null
}

export interface CollectionRoute {
  id: number
  name: string
  status: RouteStatus
  straightLineDistanceKm: number
  roadDistanceKm: number | null
  distanceMethod: 'straight_line' | 'road'
  estimatedTimeMinutes: number
  fillThreshold: number | null
  startLatitude: number | null
  startLongitude: number | null
  assignedTo: { id: string; name: string; email: string } | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  stops: RouteStop[]
}

export const WASTE_INFO: Record<
  WasteType,
  { label: string; color: string; hex: string; /** Validated chart shade (same hue). */ chart: string; binName: string; description: string; tips: string[] }
> = {
  organic: {
    label: 'Organic',
    color: 'bg-green-500',
    hex: '#22c55e',
    chart: '#16a34a',
    binName: 'Green Bin (Organic)',
    description: 'Food scraps, yard waste, and biodegradable materials',
    tips: [
      'Remove any plastic packaging or stickers before disposal',
      'Can be composted at home or at a municipal composting facility',
      'Keep liquids and oils out of the organic bin',
    ],
  },
  recyclable: {
    label: 'Recyclable',
    color: 'bg-blue-500',
    hex: '#3b82f6',
    chart: '#2563eb',
    binName: 'Blue Bin (Recyclable)',
    description: 'Paper, cardboard, plastic bottles, glass, and metals',
    tips: [
      'Rinse food and drink containers before recycling',
      'Flatten cardboard boxes to save space',
      'Keep recyclables dry and free of food contamination',
    ],
  },
  hazardous: {
    label: 'Hazardous',
    color: 'bg-red-500',
    hex: '#ef4444',
    chart: '#dc2626',
    binName: 'Red Bin (Hazardous)',
    description: 'Batteries, chemicals, paint, medicines and medical waste',
    tips: [
      'Never mix hazardous items with regular waste',
      'Keep items in their original, closed containers where possible',
      'Take to an authorised hazardous-waste collection point',
    ],
  },
  general: {
    label: 'General',
    color: 'bg-gray-500',
    hex: '#6b7280',
    chart: '#6b7280',
    binName: 'Black Bin (General)',
    description: 'Non-recyclable waste that cannot be composted',
    tips: [
      'Check that no recyclables or organics are mixed in',
      'Bag securely to prevent littering',
      'Consider whether the item can be repaired, reused or donated',
    ],
  },
  electronic: {
    label: 'E-Waste',
    color: 'bg-yellow-500',
    hex: '#eab308',
    chart: '#ca8a04',
    binName: 'Yellow Bin (E-Waste)',
    description: 'Electronics, computers, phones, cables and appliances',
    tips: [
      'Remove batteries and dispose of them as hazardous waste',
      'Wipe personal data from phones and computers first',
      'Use manufacturer take-back or authorised e-waste recyclers',
    ],
  },
}

export const BIN_STATUS_INFO: Record<BinStatus, { label: string; className: string; range: string }> = {
  active: { label: 'Active', className: 'bg-green-500 text-white', range: '0–49%' },
  monitoring: { label: 'Monitoring', className: 'bg-yellow-500 text-white', range: '50–69%' },
  almost_full: { label: 'Almost Full', className: 'bg-amber-500 text-white', range: '70–89%' },
  needs_collection: { label: 'Needs Collection', className: 'bg-red-500 text-white', range: '90–100%' },
  maintenance: { label: 'Maintenance', className: 'bg-slate-500 text-white', range: 'Manual' },
}

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}
