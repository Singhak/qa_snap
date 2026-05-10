import type { Metadata } from "next";

import { ContentSection, PageHero, PublicSiteShell } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Support | QA Copilot",
  description: "Contact and support information for QA Copilot.",
};

export default function ContactPage() {
  return (
    <PublicSiteShell ctaHref="/sign-up" ctaLabel="Start Free">
      <PageHero
        eyebrow="Support"
        title="A clear support path for prospects, beta users, and pilot customers."
        body="This gives your launch surface a concrete place to send product questions, rollout requests, and issue reports."
      />

      <div className="marketing-two-column">
        <ContentSection title="Contact routes">
          <ul className="plain-list">
            <li>General product questions: support@qacopilot.app</li>
            <li>Beta onboarding and pilots: founders@qacopilot.app</li>
            <li>Privacy and data concerns: privacy@qacopilot.app</li>
          </ul>
        </ContentSection>

        <ContentSection title="Suggested support policy">
          <ul className="plain-list">
            <li>Beta email responses within 2 business days</li>
            <li>Critical access issues prioritized first</li>
            <li>Feature requests reviewed during weekly roadmap triage</li>
          </ul>
        </ContentSection>
      </div>
    </PublicSiteShell>
  );
}
