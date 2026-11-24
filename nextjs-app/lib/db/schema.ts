import { sql } from 'drizzle-orm'
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'

// --- Enums ------------------------------------------------------------------

export const wasteTypeEnum = pgEnum('waste_type', [
  'organic',
  'recyclable',
  'hazardous',
  'general',
  'electronic',
])

/**
 * Bin status. All values except `maintenance` are derived from the fill level
 * (see lib/bin-status.ts). `maintenance` is set manually by an admin.
 */
export const binStatusEnum = pgEnum('bin_status', [
  'active', // 0-49%
  'monitoring', // 50-69%
  'almost_full', // 70-89%
  'needs_collection', // 90-100%
  'maintenance',
])

export const routeStatusEnum = pgEnum('route_status', ['pending', 'in_progress', 'completed'])

export const distanceMethodEnum = pgEnum('distance_method', ['straight_line', 'road'])

// --- Better Auth tables ------------------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('emailVerified').notNull().default(false),
    image: text('image'),
    /** admin | staff | user — managed via Better Auth `additionalFields`. */
    role: text('role').notNull().default('user'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [check('user_role_check', sql`${t.role} in ('admin', 'staff', 'user')`)],
)

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expiresAt').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt').notNull(),
    createdAt: timestamp('createdAt').defaultNow(),
    updatedAt: timestamp('updatedAt').defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

// --- App tables: Waste Management System ------------------------------------

export const bins = pgTable(
  'bins',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    type: wasteTypeEnum('type').notNull(),
    address: text('address').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    fillLevel: integer('fill_level').notNull().default(0),
    /** Nominal bin volume, used to estimate collected volume for statistics. */
    capacityLiters: integer('capacity_liters').notNull().default(240),
    status: binStatusEnum('status').notNull().default('active'),
    lastCollected: timestamp('last_collected', { withTimezone: true }),
    /** True for demonstration records created by the seed script. */
    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('bins_fill_level_check', sql`${t.fillLevel} between 0 and 100`),
    check('bins_latitude_check', sql`${t.latitude} between -90 and 90`),
    check('bins_longitude_check', sql`${t.longitude} between -180 and 180`),
    check('bins_capacity_check', sql`${t.capacityLiters} > 0`),
    index('bins_type_idx').on(t.type),
    index('bins_status_idx').on(t.status),
    index('bins_fill_level_idx').on(t.fillLevel),
  ],
)

export const classifications = pgTable(
  'classifications',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    wasteType: wasteTypeEnum('waste_type').notNull(),
    /** Probability in the range 0-1 as reported by the provider. */
    confidence: doublePrecision('confidence').notNull(),
    /** Provider id, e.g. `clip-local`, `anthropic`, `demo`. */
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    /** Per-category scores returned by the provider. */
    scores: jsonb('scores').$type<Record<string, number>>(),
    /** Most specific matched description (e.g. "a plastic bottle"), if any. */
    matchedLabel: text('matched_label'),
    imageName: text('image_name'),
    imageMimeType: text('image_mime_type'),
    imageSizeBytes: integer('image_size_bytes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('classifications_confidence_check', sql`${t.confidence} between 0 and 1`),
    index('classifications_created_at_idx').on(t.createdAt),
    index('classifications_user_id_idx').on(t.userId),
    index('classifications_waste_type_idx').on(t.wasteType),
  ],
)

export const collectionRoutes = pgTable(
  'collection_routes',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    status: routeStatusEnum('status').notNull().default('pending'),
    /** Straight-line (Haversine) distance of the ordered sequence, in km. */
    straightLineDistanceKm: doublePrecision('straight_line_distance_km').notNull(),
    /** Road distance from the routing provider, in km (null if unavailable). */
    roadDistanceKm: doublePrecision('road_distance_km'),
    /** Which distance the estimated time is based on. */
    distanceMethod: distanceMethodEnum('distance_method').notNull().default('straight_line'),
    estimatedTimeMinutes: integer('estimated_time_minutes').notNull(),
    fillThreshold: integer('fill_threshold'),
    startLatitude: doublePrecision('start_latitude'),
    startLongitude: doublePrecision('start_longitude'),
    assignedTo: text('assigned_to').references(() => user.id, { onDelete: 'set null' }),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    check('routes_distance_check', sql`${t.straightLineDistanceKm} >= 0`),
    check('routes_time_check', sql`${t.estimatedTimeMinutes} >= 0`),
    index('routes_status_idx').on(t.status),
    index('routes_assigned_to_idx').on(t.assignedTo),
    index('routes_created_at_idx').on(t.createdAt),
  ],
)

/** Ordered stops of a collection route (replaces the old JSON `bin_ids` column). */
export const routeStops = pgTable(
  'route_stops',
  {
    id: serial('id').primaryKey(),
    routeId: integer('route_id')
      .notNull()
      .references(() => collectionRoutes.id, { onDelete: 'cascade' }),
    binId: integer('bin_id').references(() => bins.id, { onDelete: 'set null' }),
    /** Snapshot so history stays readable if the bin is later deleted. */
    binName: text('bin_name').notNull(),
    sequence: integer('sequence').notNull(),
    /** Straight-line distance from the previous stop (or start point), km. */
    legDistanceKm: doublePrecision('leg_distance_km').notNull().default(0),
    fillLevelAtPlanning: integer('fill_level_at_planning').notNull(),
  },
  (t) => [
    uniqueIndex('route_stops_route_sequence_idx').on(t.routeId, t.sequence),
    index('route_stops_bin_id_idx').on(t.binId),
  ],
)

export const collectionHistory = pgTable(
  'collection_history',
  {
    id: serial('id').primaryKey(),
    binId: integer('bin_id').references(() => bins.id, { onDelete: 'set null' }),
    binName: text('bin_name').notNull(),
    binType: wasteTypeEnum('bin_type').notNull(),
    routeId: integer('route_id').references(() => collectionRoutes.id, { onDelete: 'set null' }),
    collectedBy: text('collected_by').references(() => user.id, { onDelete: 'set null' }),
    fillLevelBefore: integer('fill_level_before').notNull(),
    /** Estimated collected volume = fillLevelBefore% × bin capacity. */
    estimatedVolumeLiters: doublePrecision('estimated_volume_liters').notNull(),
    isSample: boolean('is_sample').notNull().default(false),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('history_fill_check', sql`${t.fillLevelBefore} between 0 and 100`),
    index('history_collected_at_idx').on(t.collectedAt),
    index('history_bin_id_idx').on(t.binId),
    index('history_route_id_idx').on(t.routeId),
  ],
)

export type BinRow = typeof bins.$inferSelect
export type ClassificationRow = typeof classifications.$inferSelect
export type RouteRow = typeof collectionRoutes.$inferSelect
export type RouteStopRow = typeof routeStops.$inferSelect
export type CollectionHistoryRow = typeof collectionHistory.$inferSelect
