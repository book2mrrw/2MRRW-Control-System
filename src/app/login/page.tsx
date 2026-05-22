"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="login-page">
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
    </main>
  );
}
