'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2,
  Recycle,
  TrendingUp,
  Truck,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Map,
  Activity,
  Leaf,
  Cpu,
  Camera,
  Gauge,
  Route as RouteIcon,
  Users,
  History,
  Info,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/client-api';
import { fillLevelColor } from '@/lib/bin-status';
import type { DashboardStats } from '@/lib/services/stats';
import { BIN_STATUS_INFO, BinStatus, ROLE_LABELS, USER_ROLES, UserRole, WASTE_INFO, WasteType } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const WASTE_ICONS: Record<WasteType, typeof Leaf> = {
  organic: Leaf,
  recyclable: Recycle,
  hazardous: AlertTriangle,
  general: Trash2,
  electronic: Cpu,
};

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  borderColor: 'var(--border)',
  borderRadius: '8px',
  color: 'var(--foreground)',
};
const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export function AdminDashboard({ currentUserId }: { currentUserId: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(isoDay(new Date()));
  const [granularity, setGranularity] = useState<'weekly' | 'monthly'>('weekly');

  const rangeError = from > to ? 'The start date must be on or before the end date.' : null;

  // Sets state only after the request settles (safe to call from an effect).
  const loadStats = useCallback(async () => {
    if (from > to) return;
    try {
      const data = await apiFetch<DashboardStats>(`/api/stats?from=${from}&to=${to}`);
      setStats(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    // Loader only sets state after its request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
    const interval = setInterval(loadStats, 60000); // auto-refresh every minute
    return () => clearInterval(interval);
  }, [loadStats]);

  const fetchData = () => {
    setLoading(true);
    loadStats();
  };

  const preset = (days: number) => {
    setFrom(daysAgo(days - 1));
    setTo(isoDay(new Date()));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Operational statistics calculated from database records
            {stats && ` · ${stats.range.from} to ${stats.range.to} (${stats.range.timezone})`}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Date range filter">
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <Button key={d} variant="outline" size="sm" onClick={() => preset(d)}>
                {d}d
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[9.5rem]" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 w-[9.5rem]" />
          </div>
          <Button variant="outline" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {(rangeError || error) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load statistics</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {rangeError ?? error}
            {!rangeError && <Button size="sm" variant="outline" onClick={() => fetchData()}>Retry</Button>}
          </AlertDescription>
        </Alert>
      )}

      {!stats ? (
        loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : null
      ) : (
        <DashboardBody stats={stats} granularity={granularity} setGranularity={setGranularity} currentUserId={currentUserId} />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Leaf;
  tone?: 'primary' | 'red' | 'green' | 'amber';
}) {
  const tones = {
    primary: ['bg-primary/10', 'text-primary', 'text-foreground'],
    red: ['bg-red-500/10', 'text-red-500', 'text-red-600'],
    green: ['bg-green-500/10', 'text-green-600', 'text-foreground'],
    amber: ['bg-amber-500/10', 'text-amber-600', 'text-foreground'],
  }[tone];
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn('text-3xl font-bold', tones[2])}>{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', tones[0])}>
            <Icon className={cn('h-6 w-6', tones[1])} aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{message}</div>;
}

function DashboardBody({
  stats,
  granularity,
  setGranularity,
  currentUserId,
}: {
  stats: DashboardStats;
  granularity: 'weekly' | 'monthly';
  setGranularity: (g: 'weekly' | 'monthly') => void;
  currentUserId: string;
}) {
  const pieData = stats.bins.byType
    .filter((t) => t.count > 0)
    .map((t) => ({ name: WASTE_INFO[t.type].label, value: t.count, color: WASTE_INFO[t.type].chart }));
  const fillData = stats.bins.fillLevels.map((b) => ({
    name: b.name.length > 22 ? `${b.name.slice(0, 21)}…` : b.name,
    fullName: b.name,
    fillLevel: b.fillLevel,
    color: WASTE_INFO[b.type].chart,
  }));
  const periodData = (granularity === 'weekly' ? stats.series.weekly : stats.series.monthly).map((p) => ({
    ...p,
    label: granularity === 'weekly' ? `w/c ${p.period.slice(5)}` : p.period.slice(0, 7),
  }));
  const dailyData = stats.series.daily.map((d) => ({ ...d, label: d.date.slice(5) }));
  const alerts = stats.bins.fillLevels.filter((b) => b.fillLevel >= 80 && b.status !== 'maintenance');
  const hasActivity = stats.collections.inRange > 0 || stats.classifications.inRange > 0;

  return (
    <>
      {stats.hasSampleData && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>Includes sample data</AlertTitle>
          <AlertDescription>
            <p>
              Some bins and collection records were created by the seed script for demonstration (marked “Sample”).
              They are not real municipal data. Run <code>pnpm db:seed --reset</code> to recreate, or delete the
              sample bins.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Bins" value={stats.bins.total} sub={`${stats.bins.maintenance} in maintenance`} icon={Trash2} />
        <KpiCard
          label="Bins Needing Collection"
          value={stats.bins.needsCollection}
          sub={`≥90% full · ${stats.bins.almostFull} almost full (70–89%)`}
          icon={AlertTriangle}
          tone="red"
        />
        <KpiCard label="Today's Collections" value={stats.collections.today} sub="Recorded in collection history" icon={Truck} tone="green" />
        <KpiCard
          label="Recycling / Diversion Rate"
          value={stats.recycling.diversionRate == null ? '—' : `${stats.recycling.diversionRate}%`}
          sub={
            stats.recycling.diversionRate == null
              ? 'No collections in this period'
              : `Recyclable only: ${stats.recycling.recyclableRate}% · see formula below`
          }
          icon={TrendingUp}
        />
        <KpiCard label="Average Fill Level" value={`${stats.bins.averageFillLevel}%`} sub="Across all bins, current" icon={Gauge} tone="amber" />
        <KpiCard
          label="Classifications"
          value={stats.classifications.inRange}
          sub={`In period · ${stats.classifications.allTime} all time`}
          icon={Camera}
        />
        <KpiCard label="Collections in Period" value={stats.collections.inRange} sub={`≈ ${stats.collections.volumeLiters.toLocaleString()} L estimated`} icon={History} tone="green" />
        <KpiCard label="Active Routes" value={stats.routes.active} sub={`${stats.routes.completedInRange} completed in period`} icon={RouteIcon} />
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {stats.recycling.formula}
      </p>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="bins" className="flex items-center gap-2">
              <Map className="h-4 w-4" /> Bin Status
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Trends
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <History className="h-4 w-4" /> Collections
            </TabsTrigger>
            <TabsTrigger value="classifications" className="flex items-center gap-2">
              <Camera className="h-4 w-4" /> Classifications
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bins by Type</CardTitle>
                <CardDescription>Distribution of waste bins by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {pieData.length === 0 ? (
                    <EmptyChart message="No bins yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          stroke="var(--card)"
                          strokeWidth={2}
                          dataKey="value"
                          label={({ name, value, x, y, textAnchor }) => (
                            <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill="var(--foreground)" fontSize={12}>
                              {`${name} (${value})`}
                            </text>
                          )}
                        >
                          {pieData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fill Levels</CardTitle>
                <CardDescription>Current fill level of each bin, coloured by waste type</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: Math.max(300, fillData.length * 28) }}>
                  {fillData.length === 0 ? (
                    <EmptyChart message="No bins yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fillData} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" tick={AXIS_TICK} />
                        <YAxis dataKey="name" type="category" width={170} tick={AXIS_TICK} interval={0} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          cursor={{ fill: 'var(--muted)' }}
                          formatter={(v: number) => [`${v}%`, 'Fill level']}
                          labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ''}
                        />
                        <Bar dataKey="fillLevel" radius={[0, 4, 4, 0]} barSize={14}>
                          {fillData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collected Volume by Waste Type</CardTitle>
              <CardDescription>Estimated litres collected in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 font-medium">Waste type</th>
                      <th className="py-2 font-medium">Collections</th>
                      <th className="py-2 font-medium">Estimated volume</th>
                      <th className="py-2 font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.collections.byType.map((t) => (
                      <tr key={t.type} className="border-b border-border">
                        <td className="py-2">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm" style={{ background: WASTE_INFO[t.type].chart }} aria-hidden />
                            {WASTE_INFO[t.type].label}
                          </span>
                        </td>
                        <td className="py-2">{t.collections}</td>
                        <td className="py-2">{t.volumeLiters.toLocaleString()} L</td>
                        <td className="py-2">
                          {stats.collections.volumeLiters > 0
                            ? `${Math.round((t.volumeLiters / stats.collections.volumeLiters) * 100)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bins">
          <Card>
            <CardHeader>
              <CardTitle>All Bins Status</CardTitle>
              <CardDescription>Current status of all waste bins in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.bins.fillLevels.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No bins yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-3 text-left text-sm font-medium text-muted-foreground">Bin</th>
                        <th className="py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                        <th className="py-3 text-left text-sm font-medium text-muted-foreground">Fill Level</th>
                        <th className="py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.bins.fillLevels.map((bin) => {
                        const Icon = WASTE_ICONS[bin.type];
                        const status = BIN_STATUS_INFO[bin.status as BinStatus];
                        return (
                          <tr key={bin.id} className="border-b border-border">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className={cn('flex h-8 w-8 items-center justify-center rounded', WASTE_INFO[bin.type].color)}>
                                  <Icon className="h-4 w-4 text-white" aria-hidden />
                                </div>
                                <span className="text-sm font-medium text-foreground">{bin.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-sm text-muted-foreground">{WASTE_INFO[bin.type].label}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                                  <div className={cn('h-full', fillLevelColor(bin.fillLevel))} style={{ width: `${bin.fillLevel}%` }} />
                                </div>
                                <span className="text-sm font-medium text-foreground">{bin.fillLevel}%</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge className={status?.className}>{status?.label ?? bin.status}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity</CardTitle>
              <CardDescription>Collections and classifications per day in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[340px]">
                {!hasActivity ? (
                  <EmptyChart message="No collections or classifications in this period" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={{ right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={AXIS_TICK} minTickGap={16} />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend />
                      <Line type="monotone" dataKey="collections" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Collections" />
                      <Line type="monotone" dataKey="classifications" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Classifications" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{granularity === 'weekly' ? 'Weekly' : 'Monthly'} Analytics</CardTitle>
                <CardDescription>Collections per {granularity === 'weekly' ? 'week (weeks start Monday)' : 'month'}</CardDescription>
              </div>
              <Select value={granularity} onValueChange={(v) => setGranularity(v as 'weekly' | 'monthly')}>
                <SelectTrigger className="w-36" aria-label="Granularity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="h-[260px]">
                {periodData.length === 0 ? (
                  <EmptyChart message="No activity in this period" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={periodData} margin={{ right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={AXIS_TICK} />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--muted)' }} />
                      <Legend />
                      <Bar dataKey="collections" name="Collections" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="classifications" name="Classifications" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              {periodData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 font-medium">{granularity === 'weekly' ? 'Week commencing' : 'Month'}</th>
                        <th className="py-2 font-medium">Collections</th>
                        <th className="py-2 font-medium">Est. volume</th>
                        <th className="py-2 font-medium">Diversion rate</th>
                        <th className="py-2 font-medium">Classifications</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodData.map((p) => (
                        <tr key={p.period} className="border-b border-border">
                          <td className="py-2">{granularity === 'weekly' ? p.period : p.period.slice(0, 7)}</td>
                          <td className="py-2">{p.collections}</td>
                          <td className="py-2">{p.volumeLiters.toLocaleString()} L</td>
                          <td className="py-2">{p.diversionRate == null ? '—' : `${p.diversionRate}%`}</td>
                          <td className="py-2">{p.classifications}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections">
          <Card>
            <CardHeader>
              <CardTitle>Collection History</CardTitle>
              <CardDescription>Most recent 25 collections in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.collections.recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No collections recorded in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 font-medium">Collected at</th>
                        <th className="py-2 font-medium">Bin</th>
                        <th className="py-2 font-medium">Type</th>
                        <th className="py-2 font-medium">Fill before</th>
                        <th className="py-2 font-medium">Est. volume</th>
                        <th className="py-2 font-medium">By</th>
                        <th className="py-2 font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.collections.recent.map((c) => (
                        <tr key={c.id} className="border-b border-border">
                          <td className="py-2 whitespace-nowrap">{new Date(c.collectedAt).toLocaleString()}</td>
                          <td className="py-2">{c.binName}{c.binId == null && <span className="text-muted-foreground"> (deleted)</span>}</td>
                          <td className="py-2">{WASTE_INFO[c.binType].label}</td>
                          <td className="py-2">{c.fillLevelBefore}%</td>
                          <td className="py-2">{c.volumeLiters} L</td>
                          <td className="py-2">{c.collectedBy ?? '—'}</td>
                          <td className="py-2">
                            {c.isSample ? <Badge variant="outline">Sample</Badge> : c.routeId ? `Route #${c.routeId}` : 'Manual'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classifications">
          <Card>
            <CardHeader>
              <CardTitle>Classifications by Waste Type</CardTitle>
              <CardDescription>
                Image classifications saved in the selected period ({stats.classifications.inRange} total)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="h-[260px]">
                {stats.classifications.inRange === 0 ? (
                  <EmptyChart message="No classifications in this period" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.classifications.byType.map((c) => ({ ...c, name: WASTE_INFO[c.type].label }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={AXIS_TICK} />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--muted)' }} />
                      <Bar dataKey="count" name="Classifications" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {stats.classifications.byType.map((c) => (
                          <Cell key={c.type} fill={WASTE_INFO[c.type].chart} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 font-medium">Waste type</th>
                      <th className="py-2 font-medium">Count</th>
                      <th className="py-2 font-medium">Average confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.classifications.byType.map((c) => (
                      <tr key={c.type} className="border-b border-border">
                        <td className="py-2">{WASTE_INFO[c.type].label}</td>
                        <td className="py-2">{c.count}</td>
                        <td className="py-2">{c.averageConfidence == null ? '—' : `${c.averageConfidence}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UserManagement currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Active Alerts
          </CardTitle>
          <CardDescription>Bins at 80% or more (excluding maintenance)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((bin) => (
              <div
                key={bin.id}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
                  bin.fillLevel >= 90 ? 'border-red-500 bg-red-500/5' : 'border-amber-500 bg-amber-500/5'
                )}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={cn('h-5 w-5', bin.fillLevel >= 90 ? 'text-red-500' : 'text-amber-500')} aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">{bin.name}</p>
                    <p className="text-xs text-muted-foreground">{WASTE_INFO[bin.type].label}</p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <Badge variant={bin.fillLevel >= 90 ? 'destructive' : 'secondary'}>{bin.fillLevel}% Full</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bin.fillLevel >= 90 ? 'Urgent collection needed' : 'Collection recommended'}
                  </p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && <p className="py-4 text-center text-muted-foreground">No active alerts</p>}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch<AppUser[]>('/api/users'));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    // Loader only sets state after its request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const changeRole = async (user: AppUser, role: UserRole) => {
    setSaving(user.id);
    try {
      const updated = await apiFetch<AppUser>(`/api/users/${user.id}`, { method: 'PATCH', json: { role } });
      setUsers((us) => us?.map((u) => (u.id === user.id ? { ...u, role: updated.role } : u)) ?? null);
      toast.success(`${user.name} is now ${ROLE_LABELS[role]}`);
    } catch (err) {
      toast.error('Could not change role', { description: (err as Error).message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users &amp; Roles</CardTitle>
        <CardDescription>
          Admin: manage bins, routes and analytics · Collection Staff: assigned routes and collections · General User:
          waste classification
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : users === null ? (
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Joined</th>
                  <th className="py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border">
                    <td className="py-2 font-medium text-foreground">{u.name}</td>
                    <td className="py-2 text-muted-foreground">{u.email}</td>
                    <td className="py-2 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      {u.id === currentUserId ? (
                        <Badge>{ROLE_LABELS[u.role]} (you)</Badge>
                      ) : (
                        <Select value={u.role} onValueChange={(v) => changeRole(u, v as UserRole)} disabled={saving === u.id}>
                          <SelectTrigger className="h-8 w-44" aria-label={`Role for ${u.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
