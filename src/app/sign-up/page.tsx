import Link from "next/link";

import { GoogleSignInButton, SignUpForm } from "@/components/auth-forms";

export default function SignUpPage() {
  const isGoogleEnabled =
    Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">QA Copilot</p>
        <h1>Create your account</h1>
        <p className="panel-lead">
          Start with email and password or use Google SSO, then create projects and store QA history under your own account.
        </p>
        <div className="stack">
          {isGoogleEnabled ? <GoogleSignInButton /> : null}
          <div className="auth-divider">
            {isGoogleEnabled ? "or create an account with email" : "create an account with email"}
          </div>
          <SignUpForm />
          <p className="meta">
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
