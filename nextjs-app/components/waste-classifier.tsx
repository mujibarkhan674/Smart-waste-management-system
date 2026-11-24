'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Camera,
  Loader2,
  Leaf,
  Recycle,
  AlertTriangle,
  Trash2,
  Cpu,
  CheckCircle,
  Info,
  History,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/client-api';
import { WasteClassification, WasteType, WASTE_INFO } from '@/lib/types';

const WASTE_ICONS: Record<WasteType, typeof Leaf> = {
  organic: Leaf,
  recyclable: Recycle,
  hazardous: AlertTriangle,
  general: Trash2,
  electronic: Cpu,
};

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 4;
const LOW_CONFIDENCE = 0.5;

const CONFIDENCE_LABEL: Record<WasteClassification['confidenceSource'], string> = {
  'model-probability': 'Model probability',
  'self-reported': "Model's own estimate",
  simulated: 'Simulated',
};

export function WasteClassifier({ provider }: { provider: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<WasteClassification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState<WasteClassification[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await apiFetch<WasteClassification[]>('/api/classify?limit=10'));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    // loadHistory only sets state after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, [loadHistory]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFile = useCallback((f: File) => {
    setError(null);
    setResult(null);
    if (!ACCEPTED.includes(f.type)) {
      setError('Unsupported file type. Please choose a JPG, PNG or WebP image.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`This image is ${(f.size / 1024 / 1024).toFixed(1)} MB. The maximum size is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const classifyWaste = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const classification = await apiFetch<WasteClassification>('/api/classify', { method: 'POST', body: form });
      setResult(classification);
      setHistory((h) => [classification, ...(h ?? [])].slice(0, 10));
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error('Classification failed', { description: message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetClassifier = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {provider === 'demo' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Demo mode — results are simulated</AlertTitle>
          <AlertDescription>
            CLASSIFIER_PROVIDER is set to &quot;demo&quot;. Categories are picked from a hash of the file, not predicted by
            an AI model. Configure <code>clip-local</code> or <code>anthropic</code> for real classification.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Upload Waste Image
          </CardTitle>
          <CardDescription>
            Upload or drag and drop a photo of a single waste item to identify its type and proper disposal method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!preview ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose an image to upload"
              className={cn(
                'relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[300px]',
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium text-foreground">Drop your image here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <p className="mt-4 text-xs text-muted-foreground">Supports: JPG, PNG, WebP · up to {MAX_MB} MB</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Uploaded waste item preview" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={classifyWaste} disabled={isAnalyzing} className="flex-1">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing… (first run may take up to a minute)
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Identify Waste Type
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetClassifier} disabled={isAnalyzing}>
                  Upload New Image
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Could not classify image</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && <ResultCard result={result} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Your Recent Classifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No classifications yet. Upload an image to get started.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h) => {
                const Icon = WASTE_ICONS[h.wasteType];
                return (
                  <li key={h.id} className="flex items-center gap-3 py-3">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', WASTE_INFO[h.wasteType].color)}>
                      <Icon className="h-4 w-4 text-white" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {WASTE_INFO[h.wasteType].label}
                        {h.matchedLabel && <span className="font-normal text-muted-foreground"> · {h.matchedLabel}</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {h.imageName ?? 'Image'} · {new Date(h.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {h.isDemo ? (
                      <Badge variant="outline">Demo</Badge>
                    ) : (
                      <span className="text-sm font-semibold text-foreground">{Math.round(h.confidence * 100)}%</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCard({ result }: { result: WasteClassification }) {
  const info = WASTE_INFO[result.wasteType];
  const Icon = WASTE_ICONS[result.wasteType];
  const pct = Math.round(result.confidence * 100);
  const low = !result.isDemo && result.confidence < LOW_CONFIDENCE;

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500" aria-live="polite">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Classification Result
        </CardTitle>
        <CardDescription>
          {result.isDemo ? 'Simulated result (demo mode — not an AI prediction)' : `Predicted by ${result.model} (${result.provider})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-xl', info.color)}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground">{info.label} Waste</h3>
            <p className="text-sm text-muted-foreground">{info.description}</p>
            {result.matchedLabel && (
              <p className="mt-1 text-sm text-foreground">
                Closest match: <span className="font-medium">{result.matchedLabel}</span>
              </p>
            )}
          </div>
          {!result.isDemo && (
            <div className="sm:text-right">
              <div className="text-2xl font-bold text-primary">{pct}%</div>
              <div className="text-xs text-muted-foreground">{CONFIDENCE_LABEL[result.confidenceSource]}</div>
            </div>
          )}
        </div>

        {low && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Low confidence</AlertTitle>
            <AlertDescription>
              The model is not sure about this image. Try a clearer photo of a single item on a plain background, and
              double-check local disposal rules.
            </AlertDescription>
          </Alert>
        )}

        {result.scores.length > 1 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Scores by category</h4>
            <div className="space-y-2">
              {result.scores.map((s) => (
                <div key={s.type} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">{WASTE_INFO[s.type].label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="presentation">
                    <div className={cn('h-full', WASTE_INFO[s.type].color)} style={{ width: `${Math.round(s.score * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right font-medium text-foreground">{Math.round(s.score * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-secondary p-4">
          <h4 className="mb-2 font-semibold text-secondary-foreground">Suggested Disposal</h4>
          <p className="text-lg font-medium text-foreground">{result.suggestedBin}</p>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-foreground">Disposal Tips</h4>
          <ul className="space-y-2">
            {result.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
