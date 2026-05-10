import type { Metadata } from "next";

import { ContentSection, PageHero, PublicSiteShell } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Privacy Policy | QA Copilot",
  description: "Privacy policy for QA Copilot.",
};

export default function PrivacyPage() {
  return (
    <PublicSiteShell ctaHref="/sign-up" ctaLabel="Create Account">
      <PageHero
        eyebrow="Privacy"
        title="We treat QA artifacts like product data, not throwaway prompts."
        body="This policy page gives teams a clear starting point before public launch. Update legal copy with counsel before broad commercial release."
      />

      <div className="policy-stack">
        <ContentSection title="Information we collect">
          <p>
            We collect account details such as name, email, and authentication provider data.
            We also collect workspace content you submit, including project names, bug notes,
            requirements, uploaded source materials, generated outputs, and usage metadata.
          </p>
        </ContentSection>

        <ContentSection title="How we use information">
          <p>
            We use your information to authenticate users, generate QA artifacts, persist saved
            project history, improve product reliability, and monitor abuse or service failures.
          </p>
        </ContentSection>

        <ContentSection title="AI provider processing">
          <p>
            When you run a generation, relevant prompt content may be sent to the AI provider you
            selected, such as OpenAI, Anthropic, Gemini, or OpenRouter. Provider handling is also
            subject to that provider&apos;s own privacy terms.
          </p>
        </ContentSection>

        <ContentSection title="Retention and deletion">
          <p>
            Saved projects and generated outputs remain available in your workspace until they are
            deleted or retention policies change. Before public launch, you should define concrete
            retention and deletion SLAs for production customers.
          </p>
        </ContentSection>

        <ContentSection title="Contact">
          <p>
            For privacy questions or deletion requests, use the support path on the contact page or
            replace this placeholder with your production privacy contact.
          </p>
        </ContentSection>
      </div>
    </PublicSiteShell>
  );
}
