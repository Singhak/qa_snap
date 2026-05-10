import type { Metadata } from "next";

import { ContentSection, PageHero, PublicSiteShell } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Terms of Service | QA Copilot",
  description: "Terms of service for QA Copilot.",
};

export default function TermsPage() {
  return (
    <PublicSiteShell ctaHref="/sign-up" ctaLabel="Get Started">
      <PageHero
        eyebrow="Terms"
        title="A clean placeholder terms surface for beta and launch prep."
        body="This page should be reviewed with legal counsel before full public release, but it now gives the product a credible support and compliance surface."
      />

      <div className="policy-stack">
        <ContentSection title="Use of service">
          <p>
            QA Copilot is provided for generating and managing QA-related artifacts such as test
            cases and bug reports. Users are responsible for reviewing outputs before using them in
            product, compliance, or release decisions.
          </p>
        </ContentSection>

        <ContentSection title="Accounts and access">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and
            for activity performed through your account. We may suspend access for abuse, fraud, or
            behavior that threatens service reliability.
          </p>
        </ContentSection>

        <ContentSection title="Acceptable use">
          <p>
            You may not use the service to upload unlawful content, attempt unauthorized access,
            reverse engineer protected systems, or submit material you do not have the right to
            process.
          </p>
        </ContentSection>

        <ContentSection title="Service availability">
          <p>
            Features may depend on third-party AI providers and infrastructure services. We do not
            guarantee uninterrupted availability, especially during beta or while provider quotas
            are constrained.
          </p>
        </ContentSection>

        <ContentSection title="Limitation of liability">
          <p>
            Generated outputs are assistive in nature and may contain omissions or errors. Teams
            should validate results before acting on them in production environments.
          </p>
        </ContentSection>
      </div>
    </PublicSiteShell>
  );
}
