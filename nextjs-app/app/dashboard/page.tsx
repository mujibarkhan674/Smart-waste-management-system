import { Navigation } from '@/components/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AccessDenied } from '@/components/access-denied';
import { guardPage } from '@/lib/page-auth';

export const metadata = {
  title: 'Admin Dashboard - Smart Waste Management',
  description: 'Comprehensive analytics and management for waste operations',
};

export default async function DashboardPage() {
  const { role, user, allowed } = await guardPage('/dashboard', ['admin']);
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {allowed ? <AdminDashboard currentUserId={user.id} /> : <AccessDenied role={role} required={['admin']} />}
      </main>
    </div>
  );
}
