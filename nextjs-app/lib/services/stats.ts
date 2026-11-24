import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { WASTE_TYPES, type WasteType } from '@/lib/types'

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata'

/**
 * Landfill diversion rate (shown as "Recycling / Diversion Rate"):
 *
 *   estimated volume collected from recyclable + organic + e-waste bins
 *   ─────────────────────────────────────────────────────────────────── × 100
 *          estimated volume collected from all bins
 *
 * within the selected period, where estimated volume of a collection =
 * fill level before collection (%) × bin capacity (litres).
 * Recyclable-only rate uses just the recyclable bins in the numerator.
 */
export const DIVERTED_TYPES: WasteType[] = ['recyclable', 'organic', 'electronic']

const todayInTz = () => new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(new Date())

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function resolveRange(from?: string, to?: string) {
  const end = to ?? todayInTz()
  const start = from ?? addDays(end, -29)
  if (start > end) return { from: end, to: start }
  return { from: start, to: end }
}

type Row = Record<string, unknown>
const rows = async <T extends Row>(q: ReturnType<typeof sql>) => (await db.execute(q)).rows as T[]
const num = (v: unknown) => Number(v ?? 0)

export async function getDashboardStats(fromInput?: string, toInput?: string) {
  const { from, to } = resolveRange(fromInput, toInput)
  const tz = APP_TIMEZONE
  // Bounds in the app timezone: [from 00:00, to+1 00:00)
  const lower = sql`(${from}::date)::timestamp at time zone ${tz}`
  const upper = sql`((${to}::date) + 1)::timestamp at time zone ${tz}`
  const today = todayInTz()

  const [binSummary] = await rows<Row>(sql`
    select count(*) as total,
      count(*) filter (where status = 'needs_collection') as needs_collection,
      count(*) filter (where status = 'almost_full') as almost_full,
      count(*) filter (where status = 'maintenance') as maintenance,
      coalesce(round(avg(fill_level)), 0) as avg_fill,
      bool_or(is_sample) as has_sample
    from bins`)

  const binsByType = await rows<Row>(sql`select type, count(*) as count, round(avg(fill_level)) as avg_fill from bins group by type`)
  const binFill = await rows<Row>(sql`select id, name, type, fill_level, status from bins order by fill_level desc, id`)

  const [todayRow] = await rows<Row>(sql`
    select count(*) as count from collection_history
    where collected_at >= (${today}::date)::timestamp at time zone ${tz}
      and collected_at < ((${today}::date) + 1)::timestamp at time zone ${tz}`)

  const [routeRow] = await rows<Row>(sql`
    select count(*) filter (where status in ('pending','in_progress')) as active,
           count(*) filter (where status = 'completed' and completed_at >= ${lower} and completed_at < ${upper}) as completed_in_range
    from collection_routes`)

  const volumeByType = await rows<Row>(sql`
    select bin_type as type, count(*) as collections, coalesce(sum(estimated_volume_liters), 0) as volume,
           bool_or(is_sample) as has_sample
    from collection_history where collected_at >= ${lower} and collected_at < ${upper}
    group by bin_type`)

  const classificationByType = await rows<Row>(sql`
    select waste_type as type, count(*) as count, avg(confidence) as avg_confidence
    from classifications where created_at >= ${lower} and created_at < ${upper}
    group by waste_type`)

  const [classificationTotals] = await rows<Row>(sql`select count(*) as all_time from classifications`)

  const daily = await rows<Row>(sql`
    with days as (
      select to_char(d, 'YYYY-MM-DD') as day from generate_series(${from}::date, ${to}::date, interval '1 day') d
    ),
    c as (
      select to_char(collected_at at time zone ${tz}, 'YYYY-MM-DD') as day, count(*) as collections,
             sum(estimated_volume_liters) as volume
      from collection_history where collected_at >= ${lower} and collected_at < ${upper} group by 1
    ),
    k as (
      select to_char(created_at at time zone ${tz}, 'YYYY-MM-DD') as day, count(*) as classifications
      from classifications where created_at >= ${lower} and created_at < ${upper} group by 1
    )
    select days.day, coalesce(c.collections, 0) as collections, coalesce(c.volume, 0) as volume,
           coalesce(k.classifications, 0) as classifications
    from days left join c on c.day = days.day left join k on k.day = days.day order by days.day`)

  const bucket = (unit: 'week' | 'month') =>
    rows<Row>(sql`
      with c as (
        select to_char(date_trunc(${unit}, collected_at at time zone ${tz}), 'YYYY-MM-DD') as period,
               count(*) as collections, sum(estimated_volume_liters) as volume,
               sum(estimated_volume_liters) filter (where bin_type in ('recyclable','organic','electronic')) as diverted
        from collection_history where collected_at >= ${lower} and collected_at < ${upper} group by 1
      ),
      k as (
        select to_char(date_trunc(${unit}, created_at at time zone ${tz}), 'YYYY-MM-DD') as period, count(*) as classifications
        from classifications where created_at >= ${lower} and created_at < ${upper} group by 1
      )
      select coalesce(c.period, k.period) as period, coalesce(c.collections, 0) as collections,
             coalesce(c.volume, 0) as volume, coalesce(c.diverted, 0) as diverted,
             coalesce(k.classifications, 0) as classifications
      from c full outer join k on k.period = c.period order by 1`)
  const [weekly, monthly] = await Promise.all([bucket('week'), bucket('month')])

  const recentCollections = await rows<Row>(sql`
    select h.id, h.bin_id, h.bin_name, h.bin_type, h.fill_level_before, h.estimated_volume_liters,
           h.route_id, h.is_sample, h.collected_at, u.name as collected_by
    from collection_history h left join "user" u on u.id = h.collected_by
    where h.collected_at >= ${lower} and h.collected_at < ${upper}
    order by h.collected_at desc limit 25`)

  const totalVolume = volumeByType.reduce((s, r) => s + num(r.volume), 0)
  const divertedVolume = volumeByType
    .filter((r) => DIVERTED_TYPES.includes(r.type as WasteType))
    .reduce((s, r) => s + num(r.volume), 0)
  const recyclableVolume = num(volumeByType.find((r) => r.type === 'recyclable')?.volume)
  const pct = (part: number) => (totalVolume > 0 ? Math.round((part / totalVolume) * 1000) / 10 : null)

  return {
    range: { from, to, timezone: tz },
    hasSampleData: Boolean(binSummary?.has_sample) || volumeByType.some((r) => r.has_sample),
    bins: {
      total: num(binSummary?.total),
      needsCollection: num(binSummary?.needs_collection),
      almostFull: num(binSummary?.almost_full),
      maintenance: num(binSummary?.maintenance),
      averageFillLevel: num(binSummary?.avg_fill),
      byType: WASTE_TYPES.map((type) => {
        const r = binsByType.find((x) => x.type === type)
        return { type, count: num(r?.count), averageFillLevel: num(r?.avg_fill) }
      }),
      fillLevels: binFill.map((b) => ({ id: num(b.id), name: String(b.name), type: b.type as WasteType, fillLevel: num(b.fill_level), status: String(b.status) })),
    },
    collections: {
      today: num(todayRow?.count),
      inRange: volumeByType.reduce((s, r) => s + num(r.collections), 0),
      volumeLiters: Math.round(totalVolume),
      byType: WASTE_TYPES.map((type) => {
        const r = volumeByType.find((x) => x.type === type)
        return { type, collections: num(r?.collections), volumeLiters: Math.round(num(r?.volume)) }
      }),
      recent: recentCollections.map((r) => ({
        id: num(r.id),
        binId: r.bin_id == null ? null : num(r.bin_id),
        binName: String(r.bin_name),
        binType: r.bin_type as WasteType,
        fillLevelBefore: num(r.fill_level_before),
        volumeLiters: num(r.estimated_volume_liters),
        routeId: r.route_id == null ? null : num(r.route_id),
        collectedBy: (r.collected_by as string | null) ?? null,
        isSample: Boolean(r.is_sample),
        collectedAt: new Date(r.collected_at as string).toISOString(),
      })),
    },
    recycling: {
      diversionRate: pct(divertedVolume),
      recyclableRate: pct(recyclableVolume),
      formula:
        'Diversion rate = estimated volume collected from recyclable, organic and e-waste bins ÷ estimated volume collected from all bins, in the selected period. Estimated volume = fill level before collection × bin capacity.',
    },
    classifications: {
      allTime: num(classificationTotals?.all_time),
      inRange: classificationByType.reduce((s, r) => s + num(r.count), 0),
      byType: WASTE_TYPES.map((type) => {
        const r = classificationByType.find((x) => x.type === type)
        return { type, count: num(r?.count), averageConfidence: r ? Math.round(num(r.avg_confidence) * 1000) / 10 : null }
      }),
    },
    routes: { active: num(routeRow?.active), completedInRange: num(routeRow?.completed_in_range) },
    series: {
      daily: daily.map((d) => ({ date: String(d.day), collections: num(d.collections), classifications: num(d.classifications), volumeLiters: Math.round(num(d.volume)) })),
      weekly: weekly.map((w) => ({ period: String(w.period), collections: num(w.collections), classifications: num(w.classifications), volumeLiters: Math.round(num(w.volume)), diversionRate: num(w.volume) > 0 ? Math.round((num(w.diverted) / num(w.volume)) * 1000) / 10 : null })),
      monthly: monthly.map((m) => ({ period: String(m.period), collections: num(m.collections), classifications: num(m.classifications), volumeLiters: Math.round(num(m.volume)), diversionRate: num(m.volume) > 0 ? Math.round((num(m.diverted) / num(m.volume)) * 1000) / 10 : null })),
    },
  }
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>

/** Small set of real figures for the public homepage. Returns null if the DB is unavailable. */
export async function getPublicStats() {
  try {
    const [r] = await rows<Row>(sql`
      select (select count(*) from bins) as bins,
             (select count(*) from classifications) as classifications,
             (select count(*) from collection_history where collected_at >= now() - interval '30 days') as collections_30d,
             (select sum(estimated_volume_liters) from collection_history where collected_at >= now() - interval '30 days') as volume_30d,
             (select sum(estimated_volume_liters) from collection_history where collected_at >= now() - interval '30 days'
                and bin_type in ('recyclable','organic','electronic')) as diverted_30d,
             (select bool_or(is_sample) from bins) as has_sample`)
    const volume = num(r?.volume_30d)
    return {
      bins: num(r?.bins),
      classifications: num(r?.classifications),
      collections30d: num(r?.collections_30d),
      diversionRate30d: volume > 0 ? Math.round((num(r?.diverted_30d) / volume) * 100) : null,
      hasSampleData: Boolean(r?.has_sample),
    }
  } catch (err) {
    console.error('[stats] public stats unavailable:', (err as Error).message)
    return null
  }
}
