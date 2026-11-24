import { Navigation } from '@/components/navigation';
import { WasteClassifier } from '@/components/waste-classifier';
import { guardPage } from '@/lib/page-auth';

export const metadata = {
  title: 'Classify Waste - Smart Waste Management',
  description: 'Upload an image to identify waste type and get disposal instructions',
};

export default async function ClassifyPage() {
  await guardPage('/classify');
  const provider = (process.env.CLASSIFIER_PROVIDER || 'clip-local').toLowerCase();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">AI Waste Classification</h1>
          <p className="mt-2 text-muted-foreground">
            Upload an image of waste to identify its type and learn the proper disposal method.
          </p>
        </div>
        <WasteClassifier provider={provider} />
      </main>
    </div>
  );
}
