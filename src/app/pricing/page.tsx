import type { Metadata } from 'next';

import { PageHero, PublicSiteShell } from '@/components/public-site';

export const metadata: Metadata = {
  title: 'Pricing | QA Copilot',
  description: 'Pricing plans for QA Copilot.',
};

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    blurb: 'For individual testers validating the workflow.',
    features: [
      'Up to 20 generations per month',
      '1 active project',
      'Editable bug reports and test cases',
      'CSV, JSON, and Markdown export',
    ],
  },
  {
    name: 'Pro',
    price: '$29 / user / month',
    blurb: 'For serious individual QA contributors and consultants.',
    features: [
      'Higher monthly generation limits',
      'Unlimited saved projects',
      'Multi-provider AI selection',
      'Priority support and roadmap access',
    ],
  },
  {
    name: 'Team',
    price: 'Custom',
    blurb: 'For agencies and product teams standardizing QA workflows.',
    features: [
      'Shared workspace roadmap',
      'Admin-level usage visibility',
      'Custom onboarding support',
      'Integration planning for Jira and test management tools',
    ],
  },
];

export default function PricingPage() {
  return (
    <PublicSiteShell ctaHref="/sign-up" ctaLabel="Start Free">
      <PageHero
        eyebrow="Pricing"
        title="Start simple, then grow into team QA operations."
        body="The current product is designed to help testers get value quickly before introducing heavier workflow controls."
      />

      <section className="pricing-grid">
        {plans.map((plan) => (
          <article key={plan.name} className="pricing-card">
            <p className="eyebrow">{plan.name}</p>
            <h2>{plan.price}</h2>
            <p className="panel-lead">{plan.blurb}</p>
            <ul className="plain-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </PublicSiteShell>
  );
}
