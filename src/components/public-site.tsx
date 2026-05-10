'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type PublicSiteShellProps = {
  children: ReactNode;
  ctaHref: string;
  ctaLabel: string;
};

export function PublicSiteShell({ children, ctaHref, ctaLabel }: PublicSiteShellProps) {
  const pathname = usePathname();

  return (
    <div className="marketing-shell">
      <header className="marketing-topbar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark">QA</span>
          <div>
            <p className="eyebrow">QA Copilot</p>
            <strong>AI workspace for testers</strong>
          </div>
        </Link>

        <nav className="marketing-nav" aria-label="Public">
          <PublicNavLink href="/" label="Product" currentPath={pathname} />
          <PublicNavLink href="/pricing" label="Pricing" currentPath={pathname} />
          <PublicNavLink href="/privacy" label="Privacy" currentPath={pathname} />
          <PublicNavLink href="/terms" label="Terms" currentPath={pathname} />
          <PublicNavLink href="/contact" label="Support" currentPath={pathname} />
        </nav>

        <div className="marketing-actions">
          <Link href="/sign-in" className="button ghost">
            Sign In
          </Link>
          <Link href={ctaHref} className="button">
            {ctaLabel}
          </Link>
        </div>
      </header>

      {children}

      <footer className="marketing-footer">
        <div>
          <p className="eyebrow">Launch surface</p>
          <h3>QA Copilot</h3>
          <p className="meta-line">
            Turn rough notes, designs, and requirement docs into saved bug reports and test cases.
          </p>
        </div>
        <div className="marketing-footer-links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </div>
      </footer>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="marketing-hero">
      <div className="marketing-copy">
        <div className="hero-badges">
          <span className="badge">Manual QA teams</span>
          <span className="badge">Bug reports</span>
          <span className="badge">Test design</span>
        </div>
        <h1>Convert messy QA inputs into launch-ready testing assets.</h1>
        <p>
          QA Copilot helps testers upload notes, designs, and requirement docs, then turns them into
          structured bug reports and high-coverage test cases they can edit, save, and export.
        </p>
        <div className="button-row">
          <Link href="/sign-up" className="button">
            Start Free
          </Link>
          <Link href="/pricing" className="button secondary">
            View Plans
          </Link>
        </div>
        <div className="marketing-proof">
          <span>Multi-provider AI</span>
          <span>Project memory</span>
          <span>Exports for QA workflows</span>
        </div>
      </div>

      <div className="marketing-showcase">
        <div className="showcase-card accent-card">
          <p className="eyebrow">Input stack</p>
          <h3>Requirements, screenshots, notes, logs</h3>
          <p className="meta-line">
            Bring the raw material QA already has instead of starting from a blank template.
          </p>
        </div>
        <div className="showcase-grid">
          <div className="showcase-card">
            <span className="meta-chip">Bug Reports</span>
            <strong>Structured repro steps, expected vs actual, severity, assumptions</strong>
          </div>
          <div className="showcase-card">
            <span className="meta-chip">Test Cases</span>
            <strong>
              Positive, negative, edge, and boundary coverage with export-ready output
            </strong>
          </div>
          <div className="showcase-card">
            <span className="meta-chip">Workspace</span>
            <strong>Projects, saved history, provider selection, and editable drafts</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeatureBand() {
  return (
    <section className="marketing-section">
      <SectionIntro
        eyebrow="Why teams buy"
        title="Built for QA work that usually gets delayed, duplicated, or skipped."
        body="The product focus is narrow on purpose: help testers document faster, surface better coverage, and keep outputs usable in the rest of the delivery workflow."
      />

      <div className="marketing-card-grid">
        <ValueCard
          title="Bug reports that devs can actually work with"
          body="Generate cleaner summaries, reproducible steps, expected and actual behavior, environment detail, and assumptions from rough notes."
        />
        <ValueCard
          title="Test cases from real product artifacts"
          body="Use acceptance criteria, screenshots, support logs, and design context to produce more realistic coverage than generic prompt-only tools."
        />
        <ValueCard
          title="Outputs that stay editable and exportable"
          body="Review, tune, save, reopen, and export QA assets instead of locking teams into an opaque AI chat transcript."
        />
      </div>
    </section>
  );
}

export function UseCaseBand() {
  return (
    <section className="marketing-section marketing-section-muted">
      <SectionIntro
        eyebrow="Best fit"
        title="Ideal for startups, QA agencies, and product teams without heavyweight test management."
        body="Launch with a practical workflow first, then grow into integrations and team operations once usage patterns are proven."
      />

      <div className="marketing-two-column">
        <div className="panel">
          <h3>Great early users</h3>
          <ul className="plain-list">
            <li>Manual QA teams that spend too much time writing artifacts by hand</li>
            <li>QA leads standardizing bug report quality across junior testers</li>
            <li>Agencies producing repeatable test documentation for multiple clients</li>
            <li>Startup teams that need faster release coverage without adding headcount</li>
          </ul>
        </div>
        <div className="panel">
          <h3>What they get immediately</h3>
          <ul className="plain-list">
            <li>Cleaner regression packs and exploratory prompts</li>
            <li>Less back-and-forth on bug clarity</li>
            <li>Saved project memory for repeated releases</li>
            <li>CSV, JSON, and Markdown outputs for real downstream use</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function PageHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="section-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="policy-section">
      <h2>{title}</h2>
      <div className="policy-copy">{children}</div>
    </section>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="value-card">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function PublicNavLink({
  href,
  label,
  currentPath,
}: {
  href: string;
  label: string;
  currentPath: string;
}) {
  const active = href === '/' ? currentPath === '/' : currentPath.startsWith(href);

  return (
    <Link href={href} className={`public-nav-link ${active ? 'active' : ''}`}>
      {label}
    </Link>
  );
}
