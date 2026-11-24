import { Navigation } from '@/components/navigation';
import { BinStatus } from '@/components/bin-status';
import { AccessDenied } from '@/components/access-denied';
import { guardPage } from '@/lib/page-auth';

export const metadata = {
  title: 'Bin Status - Smart Waste Management',
  description: 'Monitor and manage fill levels of all waste bins',
};

export default async function BinsPage() {
  const { role, allowed } = await guardPage('/bins', ['admin', 'staff']);
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {allowed ? <BinStatus role={role} /> : <AccessDenied role={role} required={['admin', 'staff']} />}
      </main>
    </div>
  );
}
