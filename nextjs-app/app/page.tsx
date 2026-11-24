import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Camera, 
  Trash2, 
  Map, 
  LayoutDashboard, 
  Leaf, 
  Recycle, 
  Truck,
  ArrowRight
} from 'lucide-react';
import { getPublicStats } from '@/lib/services/stats';

const features = [
  {
    title: 'AI Waste Classification',
    description: 'Upload a photo of a waste item and an image-recognition model identifies its category and suggests the correct disposal bin.',
    icon: Camera,
    href: '/classify',
    color: 'bg-primary',
  },
  {
    title: 'Bin Status Monitor',
    description: 'Track bin fill levels across all locations, with status badges and collection alerts.',
    icon: Trash2,
    href: '/bins',
    color: 'bg-blue-500',
  },
  {
    title: 'Route Optimizer',
    description: 'Plan collection routes with the Nearest Neighbour algorithm over geographic distances.',
    icon: Map,
    href: '/routes',
    color: 'bg-amber-500',
  },
  {
    title: 'Admin Dashboard',
    description: 'Analytics from real collection and classification records, with date filters.',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'bg-green-600',
  },
];

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const live = await getPublicStats();
  const stats = [
    { label: 'Bins Monitored', value: live ? String(live.bins) : '—', icon: Trash2 },
    { label: 'Images Classified', value: live ? String(live.classifications) : '—', icon: Camera },
    { label: 'Collections (30 days)', value: live ? String(live.collections30d) : '—', icon: Truck },
    {
      label: 'Diversion Rate (30 days)',
      value: live?.diversionRate30d != null ? `${live.diversionRate30d}%` : '—',
      icon: Recycle,
    },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Leaf className="h-4 w-4" />
                Smart City Solution
              </div>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Smart Waste Management
                <span className="block text-primary">for a Cleaner Future</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
                Image-based waste classification, bin fill-level monitoring and optimised collection routes —
                a digital platform for smarter, cleaner city waste management.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/classify">
                    <Camera className="mr-2 h-5 w-5" />
                    Classify Waste
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-5 w-5" />
                    View Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border bg-card py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              {live === null
                ? 'Live statistics are unavailable — the database is not connected.'
                : `Live figures from this system's database${live.hasSampleData ? ', currently including seeded sample data' : ''}. Diversion rate = estimated volume from recyclable, organic and e-waste bins ÷ all collected volume.`}
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Complete Waste Management Platform
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Everything you need to manage waste efficiently, from classification to collection.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="group relative overflow-hidden transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${feature.color}`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base">{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="ghost" className="group/btn p-0 text-primary hover:bg-transparent">
                        <Link href={feature.href} className="flex items-center gap-2">
                          Get Started
                          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-card py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How It Works
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Simple, efficient, and intelligent waste management in four steps.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: '01', title: 'Upload Image', description: 'Take a photo or upload an image of your waste item.' },
                { step: '02', title: 'AI Analysis', description: 'An image model predicts the waste category and reports its confidence.' },
                { step: '03', title: 'Get Guidance', description: 'Receive disposal instructions and bin suggestions.' },
                { step: '04', title: 'Proper Disposal', description: 'Dispose of waste correctly and keep a history of your results.' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-primary p-8 text-center sm:p-12 lg:p-16">
              <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
                Ready to Transform Waste Management?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
                Classify a waste item in seconds and learn exactly which bin it belongs in.
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-8">
                <Link href="/classify">
                  Start Classifying Waste
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Recycle className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">SmartWaste</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Smart Waste Management System - Building a cleaner future together.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
