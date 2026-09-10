"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { auth, signInWithEmailAndPassword } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/components/AuthProvider";
import { useLocalize } from "@/lib/useLocalize";

function LoginPageContent() {
  const { language } = useLanguage();
  const { startGuestSession } = useAuth();
  const localize = useLocalize();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const redirectTarget = nextPath && nextPath.startsWith("/") ? nextPath : "/";

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push(redirectTarget);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : localize("Unable to login right now.", "अभी लॉगिन नहीं हो पाया।")
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleInstantDemoLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    setEmail("demo@robodoctor.ai");
    setPassword("demo1234");
    try {
      await signInWithEmailAndPassword(auth, "demo@robodoctor.ai", "demo1234");
      router.push(redirectTarget);
    } catch (error: unknown) {
      // Fallback to guest session if network issue
      startGuestSession();
      router.push(redirectTarget);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = () => {
    startGuestSession();
    router.push(redirectTarget);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="w-[420px] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{localize("Secure Login", "सुरक्षित लॉगिन")}</h1>
            <p className="text-xs text-[var(--muted)] mt-1">{localize("Access full health intelligence", "संपूर्ण स्वास्थ्य मंच का उपयोग करें")}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 1-Click Instant Demo Login Banner */}
        <button
          type="button"
          onClick={handleInstantDemoLogin}
          disabled={isLoggingIn}
          className="w-full mb-4 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-teal-500/20 p-3.5 text-center font-bold text-cyan-300 hover:from-cyan-500/30 hover:to-teal-500/30 transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
        >
          <span>⚡</span>
          <span>{localize("Instant 1-Click Demo Login", "⚡ एक क्लिक में डेमो लॉगिन")}</span>
        </button>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{localize("Email", "ईमेल")}</label>
            <input
              type="email"
              placeholder={localize("Enter your email", "अपना ईमेल दर्ज करें")}
              className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm focus:border-cyan-400 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{localize("Password", "पासवर्ड")}</label>
            <input
              type="password"
              placeholder={localize("Enter your password", "अपना पासवर्ड दर्ज करें")}
              className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm focus:border-cyan-400 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full rounded-xl bg-cyan-400 p-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 transition cursor-pointer shadow-md"
          >
            {isLoggingIn ? localize("Signing in...", "लॉगिन हो रहा है...") : localize("Login", "लॉगिन")}
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={isLoggingIn}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 font-semibold text-sm hover:opacity-90 transition cursor-pointer"
          >
            {localize("Continue as Guest", "गेस्ट के रूप में जारी रखें")}
          </button>
        </form>

        <p className="mt-4 text-center">
          {localize("Don't have an account?", "क्या आपका अकाउंट नहीं है?")}{" "}
          <a href={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"} className="text-cyan-400">
            {localize("Sign Up", "साइन अप")}
          </a>
        </p>

        <p className="mt-3 text-center text-sm text-[var(--muted)]">
          {localize(
            "After login or guest access, you can open all health sections.",
            "लॉगिन या गेस्ट एक्सेस के बाद आप सभी हेल्थ सेक्शन खोल सकते हैं।"
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <div className="w-[420px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-8 shadow-xl">
            Loading login...
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
