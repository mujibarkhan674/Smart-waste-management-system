'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Trash2,
  Leaf,
  Recycle,
  AlertTriangle,
  Cpu,
  RefreshCw,
  MapPin,
  Plus,
  Pencil,
  Loader2,
  PackageCheck,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/client-api';
import { fillLevelColor } from '@/lib/bin-status';
import { Bin, BIN_STATUSES, BIN_STATUS_INFO, UserRole, WASTE_INFO, WASTE_TYPES, WasteType } from '@/lib/types';

const WASTE_ICONS: Record<WasteType, typeof Leaf> = {
  organic: Leaf,
  recyclable: Recycle,
  hazardous: AlertTriangle,
  general: Trash2,
  electronic: Cpu,
};

export function BinStatus({ role }: { role: UserRole }) {
  const isAdmin = role === 'admin';
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState<number | null>(null);
  const [editing, setEditing] = useState<Bin | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Bin | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | WasteType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | (typeof BIN_STATUSES)[number]>('all');

  // Sets state only after the request settles (safe to call from an effect).
  const loadBins = useCallback(async () => {
    try {
      const data = await apiFetch<Bin[]>('/api/bins');
      setBins(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBins = () => {
    setLoading(true);
    loadBins();
  };

  useEffect(() => {
    // Loader only sets state after its request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBins();
  }, [loadBins]);

  const filtered = useMemo(
    () =>
      bins.filter(
        (b) =>
          (typeFilter === 'all' || b.type === typeFilter) &&
          (statusFilter === 'all' || b.status === statusFilter) &&
          (!query || `${b.name} ${b.address}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [bins, typeFilter, statusFilter, query],
  );

  const handleCollect = async (bin: Bin) => {
    setCollecting(bin.id);
    try {
      const updated = await apiFetch<Bin>(`/api/bins/${bin.id}`, { method: 'PATCH', json: { action: 'collect' } });
      setBins((prev) => prev.map((b) => (b.id === bin.id ? updated : b)));
      toast.success(`${bin.name} marked as collected`, { description: `Recorded ${bin.fillLevel}% fill in collection history.` });
    } catch (err) {
      toast.error('Could not mark as collected', { description: (err as Error).message });
    } finally {
      setCollecting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/api/bins/${deleting.id}`, { method: 'DELETE' });
      setBins((prev) => prev.filter((b) => b.id !== deleting.id));
      toast.success(`Deleted ${deleting.name}`);
      setDeleting(null);
    } catch (err) {
      toast.error('Could not delete bin', { description: (err as Error).message });
    } finally {
      setDeleteBusy(false);
    }
  };

  const onSaved = (bin: Bin, isNew: boolean) => {
    setBins((prev) => (isNew ? [...prev, bin] : prev.map((b) => (b.id === bin.id ? bin : b))));
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bin Status Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Fill levels for all waste bins as recorded in the database
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBins} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          {isAdmin && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Bin
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Search bins"
            placeholder="Search name or address"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger aria-label="Filter by waste type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All waste types</SelectItem>
            {WASTE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{WASTE_INFO[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger aria-label="Filter by status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BIN_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {BIN_STATUS_INFO[s].label} ({BIN_STATUS_INFO[s].range})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && bins.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="font-medium text-foreground">Could not load bins</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchBins}>Try again</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Trash2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">{bins.length === 0 ? 'No bins yet' : 'No bins match your filters'}</p>
            <p className="text-sm text-muted-foreground">
              {bins.length === 0
                ? isAdmin
                  ? 'Add your first bin, or run `pnpm db:seed` to load sample data.'
                  : 'An administrator has not added any bins yet.'
                : 'Try clearing the search or filters.'}
            </p>
            {bins.length === 0 && isAdmin && (
              <Button onClick={() => setEditing('new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Bin
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((bin) => {
            const Icon = WASTE_ICONS[bin.type];
            const status = BIN_STATUS_INFO[bin.status];
            return (
              <Card key={bin.id} className={cn('flex flex-col', bin.status === 'needs_collection' && 'ring-2 ring-red-500')}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', WASTE_INFO[bin.type].color)}>
                      <Icon className="h-5 w-5 text-white" aria-label={WASTE_INFO[bin.type].label} />
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {bin.isSample && <Badge variant="outline">Sample</Badge>}
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                  </div>
                  <CardTitle className="text-base">{bin.name}</CardTitle>
                  <CardDescription className="flex items-start gap-1 text-xs">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    {bin.address}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fill Level</span>
                      <span className="font-semibold text-foreground">{bin.fillLevel}%</span>
                    </div>
                    <div
                      className="h-3 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={bin.fillLevel}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${bin.name} fill level`}
                    >
                      <div
                        className={cn('h-full transition-all duration-500', fillLevelColor(bin.fillLevel))}
                        style={{ width: `${bin.fillLevel}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>{WASTE_INFO[bin.type].binName} · {bin.capacityLiters} L</p>
                    <p>
                      Last collected:{' '}
                      {bin.lastCollected ? new Date(bin.lastCollected).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div className="mt-auto space-y-2">
                    {bin.fillLevel > 0 && (
                      <Button
                        size="sm"
                        className="w-full"
                        variant={bin.fillLevel >= 70 ? 'default' : 'outline'}
                        onClick={() => handleCollect(bin)}
                        disabled={collecting === bin.id}
                      >
                        {collecting === bin.id ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <PackageCheck className="mr-2 h-3 w-3" />
                        )}
                        {collecting === bin.id ? 'Collecting...' : 'Mark as Collected'}
                      </Button>
                    )}
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" aria-label={`Edit ${bin.name}`} onClick={() => setEditing(bin)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" aria-label={`Delete ${bin.name}`} onClick={() => setDeleting(bin)}>
                          <Trash2 className="mr-1 h-3 w-3 text-destructive" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <BinFormDialog
          key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
          bin={editing === 'new' ? null : editing}
          open={editing !== null}
          onOpenChange={(o) => !o && setEditing(null)}
          onSaved={onSaved}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && !deleteBusy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The bin will be removed permanently. Its past collection records are kept (with the bin name) for
              statistics. Bins on a pending or in-progress route cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleteBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete bin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FormState {
  name: string;
  type: WasteType;
  address: string;
  latitude: string;
  longitude: string;
  fillLevel: string;
  capacityLiters: string;
  maintenance: boolean;
}

const emptyForm: FormState = {
  name: '',
  type: 'general',
  address: '',
  latitude: '',
  longitude: '',
  fillLevel: '0',
  capacityLiters: '240',
  maintenance: false,
};

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
  if (f.name.trim().length < 2) errors.name = 'Enter a name (at least 2 characters).';
  if (f.address.trim().length < 3) errors.address = 'Enter the location or address.';
  const lat = num(f.latitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude must be between -90 and 90.';
  const lng = num(f.longitude);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.longitude = 'Longitude must be between -180 and 180.';
  const fill = num(f.fillLevel);
  if (!Number.isInteger(fill) || fill < 0 || fill > 100) errors.fillLevel = 'Fill level must be a whole number 0–100.';
  const cap = num(f.capacityLiters);
  if (!Number.isInteger(cap) || cap < 1 || cap > 10000) errors.capacityLiters = 'Capacity must be 1–10000 litres.';
  return errors;
}

function BinFormDialog({
  bin,
  open,
  onOpenChange,
  onSaved,
}: {
  bin: Bin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (bin: Bin, isNew: boolean) => void;
}) {
  // The parent remounts this dialog (via `key`) whenever the edited bin changes.
  const [form, setForm] = useState<FormState>(() =>
    bin
        ? {
            name: bin.name,
            type: bin.type,
            address: bin.address,
            latitude: String(bin.latitude),
            longitude: String(bin.longitude),
            fillLevel: String(bin.fillLevel),
            capacityLiters: String(bin.capacityLiters),
            maintenance: bin.status === 'maintenance',
          }
        : emptyForm,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      fillLevel: Number(form.fillLevel),
      capacityLiters: Number(form.capacityLiters),
      maintenance: form.maintenance,
    };
    try {
      const saved = bin
        ? await apiFetch<Bin>(`/api/bins/${bin.id}`, { method: 'PATCH', json: payload })
        : await apiFetch<Bin>('/api/bins', { method: 'POST', json: payload });
      toast.success(bin ? 'Bin updated' : 'Bin added', { description: saved.name });
      onSaved(saved, !bin);
    } catch (err) {
      toast.error(bin ? 'Could not update bin' : 'Could not add bin', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof FormState, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`bin-${key}`}>{label}</Label>
      <Input
        id={`bin-${key}`}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `bin-${key}-error` : undefined}
        {...props}
      />
      {errors[key] && (
        <p id={`bin-${key}-error`} className="text-xs text-destructive">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bin ? `Edit ${bin.name}` : 'Add a new bin'}</DialogTitle>
          <DialogDescription>
            Status is calculated from the fill level (Active &lt;50%, Monitoring 50–69%, Almost Full 70–89%, Needs
            Collection 90%+). Maintenance overrides it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {field('name', 'Bin name', { placeholder: 'e.g. Park Street Recycling' })}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bin-type">Waste category</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v as WasteType)}>
              <SelectTrigger id="bin-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WASTE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{WASTE_INFO[t].binName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field('address', 'Location / address', { placeholder: 'Street, area, city' })}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('latitude', 'Latitude', { inputMode: 'decimal', placeholder: '22.5726' })}
            {field('longitude', 'Longitude', { inputMode: 'decimal', placeholder: '88.3639' })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('fillLevel', bin ? 'Fill level (%)' : 'Initial fill level (%)', { type: 'number', min: 0, max: 100 })}
            {field('capacityLiters', 'Capacity (litres)', { type: 'number', min: 1 })}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="bin-maintenance">Under maintenance</Label>
              <p className="text-xs text-muted-foreground">Excluded from automatic route generation</p>
            </div>
            <Switch id="bin-maintenance" checked={form.maintenance} onCheckedChange={(c) => set('maintenance', c)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bin ? 'Save changes' : 'Add bin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
