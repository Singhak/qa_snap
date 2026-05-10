import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { FeatureBand, LandingHero, PublicSiteShell, UseCaseBand } from '@/components/public-site';

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return (
    <PublicSiteShell ctaHref="/sign-up" ctaLabel="Start Free">
      <LandingHero />
      <FeatureBand />
      <UseCaseBand />
    </PublicSiteShell>
  );
}
