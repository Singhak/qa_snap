import Link from 'next/link';

import { GoogleSignInButton, SignInForm } from '@/components/auth-forms';
import { DEV_USER_EMAIL, DEV_USER_PASSWORD, ensureDevUser } from '@/server/auth/dev-user';

export default async function SignInPage() {
  await ensureDevUser();

  const isGoogleEnabled =
    Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);
  const showDevLogin = process.env.NODE_ENV !== 'production';

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">QA Copilot</p>
        <h1>Sign in to your workspace</h1>
        <p className="panel-lead">
          Use email and password, or continue with Google SSO to access your saved QA projects.
        </p>
        <div className="stack">
          {isGoogleEnabled ? <GoogleSignInButton /> : null}
          <div className="auth-divider">
            {isGoogleEnabled ? 'or sign in with email' : 'sign in with email'}
          </div>
          {showDevLogin ? (
            <div className="dev-auth-hint">
              <strong>Dev login</strong>
              <span>Email: {DEV_USER_EMAIL}</span>
              <span>Password: {DEV_USER_PASSWORD}</span>
            </div>
          ) : null}
          <SignInForm />
          <p className="meta">
            New here? <Link href="/sign-up">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
