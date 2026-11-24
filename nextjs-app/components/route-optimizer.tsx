'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Map,
  Route,
  Clock,
  Ruler,
  Truck,
  CheckCircle,
  RefreshCw,
  Play,
  AlertCircle,
  Loader2,
  Navigation as NavIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/client-api';
import {
  Bin,
  CollectionRoute,
  ROUTE_STATUS_LABELS,
  RouteStatus,
  UserRole,
  WASTE_INFO,
} from '@/lib/types';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const STATUS_BADGE: Record<RouteStatus, string> = {
  pending: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-amber-500 text-white',
  completed: 'bg-green-500 text-white',
};

export function RouteOptimizer({ role }: { role: UserRole }) {
  const isAdmin = role === 'admin';
  const [bins, setBins] = useState<Bin[]>([]);
  const [routes, setRoutes] = useState<CollectionRoute[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [threshold, setThreshold] = useState(70);
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [assignee, setAssignee] = useState<string>('unassigned');
  const [currentRoute, setCurrentRoute] = useState<CollectionRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<CollectionRoute | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const eligible = useMemo(() => bins.filter((b) => b.status !== 'maintenance'), [bins]);

  // Sets state only after the requests settle (safe to call from an effect).
  const loadData = useCallback(async (applyThreshold?: number) => {
    try {
      const [routesData, binsData, staffData] = await Promise.all([
        apiFetch<CollectionRoute[]>('/api/routes'),
        isAdmin ? apiFetch<Bin[]>('/api/bins') : Promise.resolve([] as Bin[]),
        isAdmin ? apiFetch<StaffUser[]>('/api/users?role=staff,admin') : Promise.resolve([] as StaffUser[]),
      ]);
      setRoutes(routesData);
      setBins(binsData);
      setStaff(staffData);
      setError(null);
      if (applyThreshold !== undefined) {
        setSelected(binsData.filter((b) => b.status !== 'maintenance' && b.fillLevel >= applyThreshold).map((b) => b.id));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    // Loader only sets state after its request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(70);
  }, [loadData]);

  const fetchData = () => {
    setLoading(true);
    loadData();
  };

  // Changing the threshold re-selects the bins at or above it.
  const changeThreshold = (value: number) => {
    setThreshold(value);
    setSelected(eligible.filter((b) => b.fillLevel >= value).map((b) => b.id));
  };

  const sortedEligible = useMemo(() => [...eligible].sort((a, b) => b.fillLevel - a.fillLevel), [eligible]);

  const toggle = (id: number, checked: boolean) =>
    setSelected((s) => (checked ? [...new Set([...s, id])] : s.filter((x) => x !== id)));

  const handleSelectAll = () =>
    setSelected(selected.length === eligible.length ? [] : eligible.map((b) => b.id));

  const optimizeRoute = async () => {
    if (selected.length === 0) return;
    const hasStart = startLat.trim() !== '' || startLng.trim() !== '';
    const lat = Number(startLat);
    const lng = Number(startLng);
    if (hasStart && (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
      toast.error('Invalid start point', { description: 'Enter a valid latitude and longitude, or leave both empty.' });
      return;
    }
    setOptimizing(true);
    try {
      const { route } = await apiFetch<{ route: CollectionRoute }>('/api/routes', {
        method: 'POST',
        json: {
          binIds: selected,
          threshold,
          start: hasStart ? { latitude: lat, longitude: lng } : null,
          assignedTo: assignee === 'unassigned' ? null : assignee,
        },
      });
      setCurrentRoute(route);
      setRoutes((r) => [route, ...r]);
      toast.success('Route generated', { description: `${route.stops.length} stops saved as ${route.name}` });
    } catch (err) {
      toast.error('Route generation failed', { description: (err as Error).message });
    } finally {
      setOptimizing(false);
    }
  };

  const updateStatus = async (route: CollectionRoute, status: RouteStatus) => {
    setUpdating(route.id);
    try {
      const updated = await apiFetch<CollectionRoute>('/api/routes', {
        method: 'PATCH',
        json: { routeId: route.id, status },
      });
      setRoutes((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
      if (currentRoute?.id === updated.id) setCurrentRoute(updated);
      toast.success(status === 'completed' ? 'Route completed' : 'Route started', {
        description:
          status === 'completed'
            ? `${updated.stops.filter((s) => s.binId).length} bins marked as collected.`
            : updated.name,
      });
      if (status === 'completed' && isAdmin) {
        setBins(await apiFetch<Bin[]>('/api/bins'));
      }
    } catch (err) {
      toast.error('Could not update route', { description: (err as Error).message });
    } finally {
      setUpdating(null);
      setConfirmComplete(null);
    }
  };

  if (loading && routes.length === 0 && bins.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-2" aria-busy>
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="font-medium text-foreground">Could not load routes</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={fetchData}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bin Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                Select Bins for Collection
              </CardTitle>
              <CardDescription>
                Bins at or above the threshold are selected automatically. Adjust the selection manually if needed.
                Bins under maintenance are excluded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="threshold">Collection threshold</Label>
                  <span className="text-sm font-semibold text-foreground">{threshold}%</span>
                </div>
                <Slider
                  id="threshold"
                  min={0}
                  max={100}
                  step={5}
                  value={[threshold]}
                  onValueChange={([v]) => changeThreshold(v)}
                  aria-label="Collection threshold"
                />
              </div>

              {eligible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="mb-2 h-12 w-12 text-green-500" />
                  <p className="text-muted-foreground">No bins available. Add bins on the Bin Status page.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {selected.length === eligible.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selected.length} of {eligible.length} selected
                    </span>
                  </div>
                  <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {sortedEligible.map((bin) => {
                      const checked = selected.includes(bin.id);
                      return (
                        <label
                          key={bin.id}
                          htmlFor={`route-bin-${bin.id}`}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                            checked ? 'border-primary bg-primary/5' : 'border-border'
                          )}
                        >
                          <Checkbox
                            id={`route-bin-${bin.id}`}
                            checked={checked}
                            onCheckedChange={(c) => toggle(bin.id, c === true)}
                          />
                          <div className={cn('h-8 w-8 shrink-0 rounded-md', WASTE_INFO[bin.type].color)} aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{bin.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{bin.address}</p>
                          </div>
                          <Badge variant={bin.fillLevel >= 90 ? 'destructive' : bin.fillLevel >= threshold ? 'default' : 'secondary'}>
                            {bin.fillLevel}%
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="start-lat">Start latitude (optional)</Label>
                  <Input id="start-lat" inputMode="decimal" placeholder="Depot latitude" value={startLat} onChange={(e) => setStartLat(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="start-lng">Start longitude (optional)</Label>
                  <Input id="start-lng" inputMode="decimal" placeholder="Depot longitude" value={startLng} onChange={(e) => setStartLng(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Without a start point (or DEPOT_LATITUDE/LONGITUDE on the server) the route starts at the fullest bin.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignee">Assign to</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger id="assignee" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.role === 'admin' ? 'Admin' : 'Staff'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={optimizeRoute} disabled={selected.length === 0 || optimizing}>
                {optimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Route className="mr-2 h-4 w-4" />
                    Generate Route ({selected.length} {selected.length === 1 ? 'bin' : 'bins'})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Optimized Route */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                Optimized Route
              </CardTitle>
              <CardDescription>
                Ordered with the Nearest Neighbour heuristic over straight-line (Haversine) distances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentRoute ? (
                <RouteDetails route={currentRoute} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Select bins and generate a route to see the collection sequence</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Route History */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{isAdmin ? 'Route History' : 'Assigned Routes'}</CardTitle>
            <CardDescription>
              {isAdmin ? 'Saved collection routes and their status' : 'Collection routes assigned to you'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} aria-label="Refresh routes">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </CardHeader>
        <CardContent>
          {routes.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Truck className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'No routes yet. Generate one above.' : 'No routes are assigned to you yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {routes.map((route) => (
                <div key={route.id} className="rounded-lg border border-border">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-4 text-left"
                      onClick={() => setExpanded(expanded === route.id ? null : route.id)}
                      aria-expanded={expanded === route.id}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{route.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {route.stops.length} stops · {distanceLabel(route)} · ~{route.estimatedTimeMinutes} min
                          {route.assignedTo ? ` · ${route.assignedTo.name}` : ' · Unassigned'}
                        </p>
                        <p className="text-xs text-muted-foreground">Created {new Date(route.createdAt).toLocaleString()}</p>
                      </div>
                      {expanded === route.id ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex items-center gap-3">
                      <Badge className={STATUS_BADGE[route.status]}>{ROUTE_STATUS_LABELS[route.status]}</Badge>
                      {route.status === 'pending' && (
                        <Button size="sm" onClick={() => updateStatus(route, 'in_progress')} disabled={updating === route.id}>
                          {updating === route.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                          Start
                        </Button>
                      )}
                      {route.status === 'in_progress' && (
                        <Button size="sm" onClick={() => setConfirmComplete(route)} disabled={updating === route.id}>
                          {updating === route.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  {expanded === route.id && (
                    <div className="border-t border-border p-4">
                      <RouteDetails route={route} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmComplete !== null} onOpenChange={(o) => !o && setConfirmComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete {confirmComplete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              All {confirmComplete?.stops.filter((s) => s.binId).length} bins on this route will be marked as collected:
              their fill level is reset to 0% and a collection-history record is saved for each one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmComplete && updateStatus(confirmComplete, 'completed')}>
              Complete route
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function distanceLabel(route: CollectionRoute) {
  return route.roadDistanceKm != null
    ? `${route.roadDistanceKm.toFixed(1)} km road`
    : `${route.straightLineDistanceKm.toFixed(1)} km straight-line`;
}

function RouteDetails({ route }: { route: CollectionRoute }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Truck} value={String(route.stops.length)} label="Stops" />
        <Stat icon={Ruler} value={route.straightLineDistanceKm.toFixed(2)} label="km straight-line" />
        <Stat
          icon={NavIcon}
          value={route.roadDistanceKm != null ? route.roadDistanceKm.toFixed(2) : '—'}
          label={route.roadDistanceKm != null ? 'km est. road' : 'road n/a'}
        />
        <Stat icon={Clock} value={String(route.estimatedTimeMinutes)} label="min estimated" />
      </div>
      <p className="text-xs text-muted-foreground">
        {route.distanceMethod === 'road'
          ? 'Time is based on the routing service’s estimated driving duration plus service time per stop.'
          : 'Straight-line distance is the direct “as the crow flies” distance, not road distance. Time assumes an average speed plus service time per stop.'}
      </p>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Collection Sequence</h4>
        <ol className="relative">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-border" aria-hidden />
          {route.startLatitude != null && route.startLongitude != null && (
            <li className="relative flex items-center gap-3 py-2">
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-card text-xs font-medium text-primary">
                S
              </div>
              <p className="text-sm text-muted-foreground">
                Start point ({route.startLatitude.toFixed(4)}, {route.startLongitude.toFixed(4)})
              </p>
            </li>
          )}
          {route.stops.map((stop) => (
            <li key={stop.sequence} className="relative flex items-center gap-3 py-2">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {stop.sequence}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {stop.binName}
                  {!stop.bin && <span className="ml-1 text-xs text-muted-foreground">(deleted)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{stop.bin?.address}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <p>{stop.fillLevelAtPlanning}% at planning</p>
                {stop.legDistanceKm > 0 && <p>+{stop.legDistanceKm.toFixed(2)} km</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Truck; value: string; label: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3 text-center">
      <Icon className="mx-auto mb-1 h-5 w-5 text-primary" aria-hidden />
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
