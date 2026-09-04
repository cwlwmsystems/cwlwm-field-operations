"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { configured, loading, user, organization, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && organization) {
      router.replace("/connection");
    }
  }, [loading, user, organization, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace("/connection");
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="eyebrow">Cwlwm Field Operations</div>
      <h1>Sign in</h1>
      <p className="muted">
        Authenticate with the user you created in Supabase. Organization access is checked through RLS after login.
      </p>

      {!configured && <div className="error-banner">
        <strong>Supabase is not configured</strong>
        <span>Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.</span>
      </div>}

      <form onSubmit={submit}>
        <label>Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="button" type="submit" disabled={!configured || submitting || loading}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  </main>;
}
