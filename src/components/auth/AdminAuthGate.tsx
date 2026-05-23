"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_EMAIL, isAdminUserId } from "@/lib/auth/adminAuth";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type GatePhase = "loading" | "login" | "otp" | "denied" | "ready";

const RESEND_SECONDS = 30;

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "#0a0a0a"
};

const cardStyle: CSSProperties = {
  width: "min(380px, 90vw)",
  background: "#111",
  borderRadius: 20,
  padding: "40px 32px",
  boxSizing: "border-box"
};

const titleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "#fff",
  textAlign: "center",
  margin: 0
};

const subtitleStyle: CSSProperties = {
  fontSize: 12,
  color: "#555",
  textAlign: "center",
  margin: "8px 0 28px"
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#888",
  marginBottom: 8
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 48,
  padding: "0 14px",
  fontSize: 15,
  color: "#fff",
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: 10,
  outline: "none"
};

const otpInputStyle: CSSProperties = {
  ...inputStyle,
  fontSize: 24,
  letterSpacing: "0.35em",
  textAlign: "center",
  fontVariantNumeric: "tabular-nums"
};

const primaryBtnStyle: CSSProperties = {
  width: "100%",
  height: 48,
  marginTop: 20,
  border: "none",
  borderRadius: 10,
  background: "#7c3aed",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer"
};

const errorStyle: CSSProperties = {
  fontSize: 13,
  color: "#ef4444",
  marginTop: 12,
  textAlign: "center"
};

const mutedStyle: CSSProperties = {
  fontSize: 13,
  color: "#888",
  textAlign: "center",
  marginTop: 16,
  lineHeight: 1.5
};

const linkBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "#7c3aed",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0
};

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div style={shellStyle}>
      <div style={cardStyle}>{children}</div>
    </div>
  );
}

async function startAdminBrowserSession() {
  await fetch("/api/auth/admin-session", { method: "POST", credentials: "include" });
}

async function clearAdminBrowserSession() {
  await fetch("/api/auth/admin-session", { method: "DELETE", credentials: "include" });
}

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<GatePhase>("loading");
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const emailRef = useRef(email);

  const resolveSession = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setPhase("login");
      return;
    }

    if (!isAdminUserId(session.user.id)) {
      await supabase.auth.signOut();
      await clearAdminBrowserSession();
      setPhase("denied");
      return;
    }

    await startAdminBrowserSession();
    setPhase("ready");
  }, []);

  useEffect(() => {
    void resolveSession();
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void resolveSession();
    });
    return () => subscription.unsubscribe();
  }, [resolveSession]);

  useEffect(() => {
    if (phase !== "otp" || resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, resendIn]);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const normalized = email.trim().toLowerCase();
    if (normalized !== ADMIN_EMAIL) {
      setError("Access denied.");
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: { shouldCreateUser: false }
    });
    setBusy(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    emailRef.current = ADMIN_EMAIL;
    setResendIn(RESEND_SECONDS);
    setPhase("otp");
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const token = otp.replace(/\D/g, "").slice(0, 6);
    if (token.length !== 6) {
      setError("Incorrect code.");
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: emailRef.current,
      token,
      type: "email"
    });
    setBusy(false);

    if (verifyError) {
      setError("Incorrect code.");
      return;
    }

    const userId = data.user?.id ?? data.session?.user?.id;
    if (!isAdminUserId(userId)) {
      await supabase.auth.signOut();
      await clearAdminBrowserSession();
      setPhase("denied");
      return;
    }

    await startAdminBrowserSession();
    setPhase("ready");
    router.replace("/dashboard");
    router.refresh();
  };

  const resendCode = async () => {
    if (resendIn > 0 || busy) return;
    setError("");
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: { shouldCreateUser: false }
    });
    setBusy(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setResendIn(RESEND_SECONDS);
  };

  const signOutDenied = async () => {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    await clearAdminBrowserSession();
    setBusy(false);
    setOtp("");
    setError("");
    setPhase("login");
  };

  if (phase === "loading") {
    return (
      <AuthCard>
        <p style={{ ...mutedStyle, marginTop: 0 }}>Checking session…</p>
      </AuthCard>
    );
  }

  if (phase === "ready") {
    return <>{children}</>;
  }

  if (phase === "denied") {
    return (
      <AuthCard>
        <h1 style={titleStyle}>Access denied</h1>
        <p style={subtitleStyle}>This account is not authorized for the Control System.</p>
        <p style={{ ...mutedStyle, marginTop: 0 }}>
          Only the designated admin operator may sign in. Your session has been cleared.
        </p>
        <button
          type="button"
          style={{ ...primaryBtnStyle, marginTop: 28 }}
          onClick={() => void signOutDenied()}
          disabled={busy}
        >
          {busy ? "Signing out…" : "Return to sign in"}
        </button>
      </AuthCard>
    );
  }

  if (phase === "otp") {
    return (
      <AuthCard>
        <h1 style={titleStyle}>2MRRW Control System</h1>
        <p style={subtitleStyle}>Admin access only.</p>
        <p style={{ ...mutedStyle, marginTop: 0, marginBottom: 20 }}>Check your email — we sent a 6-digit code to {ADMIN_EMAIL}.</p>
        <form onSubmit={(event) => void verifyCode(event)}>
          <label style={labelStyle} htmlFor="admin-otp">
            Verification code
          </label>
          <input
            id="admin-otp"
            style={otpInputStyle}
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            required
          />
          {error ? <p style={errorStyle}>{error}</p> : null}
          <button type="submit" style={primaryBtnStyle} disabled={busy || otp.length !== 6}>
            {busy ? "Verifying…" : "Verify code"}
          </button>
        </form>
        <p style={mutedStyle}>
          {resendIn > 0 ? (
            <>Resend code in {resendIn}s</>
          ) : (
            <button type="button" style={linkBtnStyle} onClick={() => void resendCode()} disabled={busy}>
              Resend code
            </button>
          )}
        </p>
        <p style={{ ...mutedStyle, marginTop: 8 }}>
          <button
            type="button"
            style={linkBtnStyle}
            onClick={() => {
              setPhase("login");
              setOtp("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 style={titleStyle}>2MRRW Control System</h1>
      <p style={subtitleStyle}>Admin access only.</p>
      <form onSubmit={(event) => void sendCode(event)}>
        <label style={labelStyle} htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          style={inputStyle}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={ADMIN_EMAIL}
          required
        />
        {error ? <p style={errorStyle}>{error}</p> : null}
        <button type="submit" style={primaryBtnStyle} disabled={busy}>
          {busy ? "Sending…" : "Send Code"}
        </button>
      </form>
    </AuthCard>
  );
}
