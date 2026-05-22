"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ADMIN_SESSION_EXPIRED_MESSAGE } from "@/server/auth/adminSession";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      setError(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("Access denied. Admin account required.");
      setLoading(false);
      return;
    }

    const sessionResponse = await fetch("/api/auth/admin-session", { method: "POST", credentials: "include" });
    if (!sessionResponse.ok) {
      await supabase.auth.signOut();
      setError("Could not start admin session. Please try again.");
      setLoading(false);
      return;
    }

    const returnTo = searchParams.get("returnTo");
    const destination =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
    router.push(destination);
    router.refresh();
  };

  return (
    <div className="login-card card">
      <div className="login-brand">
        <div className="sb-mark">2M</div>
        <div>
          <div className="login-title">2MRRW</div>
          <div className="login-sub">Control System</div>
        </div>
      </div>
      <p className="login-desc">Admin sign-in required</p>
      <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="input-group">
          <span className="input-label">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@2mrrw.com"
            required
          />
        </label>
        <label className="input-group">
          <span className="input-label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="login-error">{error}</p> : null}
        <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="login-page">
      <Suspense fallback={<div className="login-card card">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
