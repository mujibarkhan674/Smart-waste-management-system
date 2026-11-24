import { Navigation } from '@/components/navigation';
import { RouteOptimizer } from '@/components/route-optimizer';
import { AccessDenied } from '@/components/access-denied';
import { guardPage } from '@/lib/page-auth';

export const metadata = {
  title: 'Route Optimizer - Smart Waste Management',
  description: 'Optimize waste collection routes for maximum efficiency',
};

export default async function RoutesPage() {
  const { role, allowed } = await guardPage('/routes', ['admin', 'staff']);
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {allowed ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">
                {role === 'admin' ? 'Route Optimizer' : 'My Collection Routes'}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {role === 'admin'
                  ? 'Select bins that need collection and generate an ordered route using the Nearest Neighbour algorithm.'
                  : 'Routes assigned to you. Start a route when you set off and complete it to mark every bin as collected.'}
              </p>
            </div>
            <RouteOptimizer role={role} />
          </>
        ) : (
          <AccessDenied role={role} required={['admin', 'staff']} />
        )}
      </main>
    </div>
  );
}
