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
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMessage(null);
    setSuggestion(null);

    // Basic domain typo check
    const clean = email.toLowerCase().trim();
    if (clean.includes("@gail.com") || clean.includes("@gamil.com") || clean.includes("@gmial.com")) {
      const fixed = clean.replace(/@(gail|gamil|gmial)\.com/, "@gmail.com");
      setErrorMessage(localize(`Invalid email domain. Did you mean "${fixed}"?`, `अमान्य ईमेल डोमेन। क्या आपका मतलब "${fixed}" था?`));
      setSuggestion(fixed);
      setIsLoggingIn(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push(redirectTarget);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : localize("Unable to login right now.", "अभी लॉगिन नहीं हो पाया।");
      setErrorMessage(msg);
      if (msg.includes("Did you mean")) {
        const match = msg.match(/"([^"]+)"/);
        if (match && match[1]) setSuggestion(match[1]);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    setSuggestion(null);
  };

  const handleGuestLogin = () => {
    startGuestSession();
    router.push(redirectTarget);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#0f1f33_0%,#08101a_50%,#03070d_100%)] px-4 py-12 text-[var(--foreground)]">
      <div className="w-full max-w-[460px] rounded-3xl border border-slate-800 bg-[#0c1929]/95 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏥</span>
              <h1 className="text-2xl font-black tracking-tight text-white">{localize("Clinical Portal Login", "क्लीनिकल पोर्टल लॉगिन")}</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">{localize("Secure, encrypted health intelligence system", "सुरक्षित एवं एन्क्रिप्टेड स्वास्थ्य प्रणाली")}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Error / Typo Notice Box */}
        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-300 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(suggestion);
                      setSuggestion(null);
                      setErrorMessage(null);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 font-bold text-rose-200 hover:bg-rose-500/30 transition cursor-pointer border border-rose-500/30"
                  >
                    <span>✓</span>
                    <span>{localize(`Click to use "${suggestion}"`, `"${suggestion}" का उपयोग करें`)}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Official Verified Demo Credentials Box */}
        <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span>⚡</span>
              <span>{localize("Official Demo Accounts", "आधिकारिक डेमो खाते")}</span>
            </span>
            <span className="text-[10px] text-slate-400">{localize("1-Click Auto Fill", "1-क्लिक ऑटो फिल")}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => fillCredentials("doctor@robodoctor.ai", "Doctor@2026")}
              className="rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-left hover:border-cyan-400 hover:bg-cyan-500/10 transition cursor-pointer"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>👨‍⚕️</span>
                <span>{localize("Doctor Profile", "डॉक्टर प्रोफाइल")}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">doctor@robodoctor.ai</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("demo@robodoctor.ai", "Demo@2026")}
              className="rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-left hover:border-cyan-400 hover:bg-cyan-500/10 transition cursor-pointer"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>🧑‍🤝‍🧑</span>
                <span>{localize("Patient Profile", "रोगी प्रोफाइल")}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">demo@robodoctor.ai</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">{localize("Email Address", "ईमेल पता")}</label>
            <input
              type="email"
              placeholder={localize("name@example.com", "name@example.com")}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                  setSuggestion(null);
                }
              }}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">{localize("Password", "पासवर्ड")}</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                {showPassword ? localize("Hide", "छिपाएं") : localize("Show", "दिखाएं")}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={localize("Enter your password", "अपना पासवर्ड दर्ज करें")}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                  setSuggestion(null);
                }
              }}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full rounded-xl bg-cyan-400 p-3.5 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-98 flex items-center justify-center gap-2"
          >
            <span>🔐</span>
            <span>{isLoggingIn ? localize("Authenticating...", "प्रमाणीकरण हो रहा है...") : localize("Sign In Securely", "सुरक्षित लॉगिन करें")}</span>
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={isLoggingIn}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 font-semibold text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            {localize("Continue as Guest (No Password Required)", "गेस्ट के रूप में जारी रखें (पासवर्ड की आवश्यकता नहीं)")}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800/80 pt-5 text-center text-xs text-slate-400">
          {localize("Don't have an account yet?", "क्या आपका खाता अभी नहीं बना है?")}{" "}
          <a href={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"} className="font-bold text-cyan-400 hover:underline">
            {localize("Sign Up for New Account", "नया खाता बनाएं")}
          </a>
        </div>

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
