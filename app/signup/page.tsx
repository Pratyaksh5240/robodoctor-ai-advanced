"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, createUserWithEmailAndPassword, updateProfile } from "@/lib/auth";
import { useLanguage } from "@/app/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocalize } from "@/lib/useLocalize";

function SignupContent() {
  const { language } = useLanguage();
  const localize = useLocalize();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const redirectTarget = nextPath && nextPath.startsWith("/") ? nextPath : "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningUp(true);
    setErrorNotice(null);
    setSuggestion(null);

    // Client-side domain typo catch
    const clean = email.toLowerCase().trim();
    if (clean.includes("@gail.com") || clean.includes("@gamil.com") || clean.includes("@gmial.com")) {
      const fixed = clean.replace(/@(gail|gamil|gmial)\.com/, "@gmail.com");
      setErrorNotice(localize(`Invalid email domain "@${clean.split("@")[1]}". Did you mean "@gmail.com"?`, `अमान्य ईमेल डोमेन "@${clean.split("@")[1]}"। क्या आपका मतलब "@gmail.com" था?`));
      setSuggestion(fixed);
      setIsSigningUp(false);
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
      router.push(redirectTarget);
    } catch (error: unknown) {
      const msg = error instanceof Error
        ? error.message
        : localize("Unable to create account right now.", "अभी अकाउंट नहीं बन पाया।");
      setErrorNotice(msg);
      if (msg.includes("Did you mean")) {
        const match = msg.match(/"([^"]+)"/);
        if (match && match[1]) setSuggestion(match[1]);
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#0f1f33_0%,#08101a_50%,#03070d_100%)] px-4 py-12 text-[var(--foreground)]">
      <div className="w-full max-w-[460px] rounded-3xl border border-slate-800 bg-[#0c1929]/95 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🩺</span>
              <h1 className="text-2xl font-black tracking-tight text-white">{localize("Create Clinical Account", "क्लीनिकल अकाउंट बनाएं")}</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">{localize("Join RoboDoctor AI Patient & Clinical Network", "RoboDoctor AI रोगी एवं क्लीनिकल नेटवर्क से जुड़ें")}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {errorNotice && (
          <div className="mb-5 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-300 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold">{errorNotice}</p>
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(suggestion);
                      setSuggestion(null);
                      setErrorNotice(null);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 font-bold text-rose-200 hover:bg-rose-500/30 transition cursor-pointer border border-rose-500/30"
                  >
                    <span>Fix typo:</span>
                    <span className="underline">{suggestion}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-300 uppercase">{localize("Full Name", "पूरा नाम")}</label>
            <input
              type="text"
              placeholder={localize("Dr. Rajesh Sharma or John Doe", "डॉ. राजेश शर्मा या राहुल वर्मा")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-300 uppercase">{localize("Email Address", "ईमेल पता")}</label>
            <input
              type="email"
              placeholder="e.g. name@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorNotice) setErrorNotice(null);
                if (suggestion) setSuggestion(null);
              }}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-300 uppercase">{localize("Create Password", "पासवर्ड बनाएं")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSigningUp}
            className="w-full mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 py-3.5 font-bold text-slate-950 hover:opacity-95 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            {isSigningUp ? localize("Registering Account...", "अकाउंट बन रहा है...") : localize("Create Official Account", "आधिकारिक खाता बनाएं")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          {localize("Already registered?", "क्या आपका पहले से अकाउंट है?")}{" "}
          <span onClick={() => router.push(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login")} className="cursor-pointer font-bold text-cyan-400 hover:underline">
            {localize("Log In Here", "यहाँ लॉगिन करें")}
          </span>
        </p>

        <p className="mt-3 text-center text-[11px] text-slate-500">
          {localize(
            "Encrypted with PBKDF2 SHA-512. HIPAA and ISO 27001 compliant architecture.",
            "PBKDF2 SHA-512 एन्क्रिप्शन। HIPAA एवं ISO 27001 अनुरूप आर्किटेक्चर।"
          )}
        </p>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <div className="w-[420px] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-10 shadow-xl">
            Loading signup...
          </div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
