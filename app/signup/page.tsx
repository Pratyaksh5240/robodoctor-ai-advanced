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
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningUp(true);
    setErrorNotice(null);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
      router.push(redirectTarget);
    } catch (error: unknown) {
      setErrorNotice(
        error instanceof Error
          ? error.message
          : localize("Unable to create account right now.", "अभी अकाउंट नहीं बन पाया।")
      );
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="w-[420px] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{localize("Create Account", "अकाउंट बनाएं")}</h1>
          <LanguageSwitcher />
        </div>

        {errorNotice && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            ⚠️ {errorNotice}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="mb-2 block">{localize("Full Name", "पूरा नाम")}</label>
            <input
              type="text"
              placeholder={localize("Enter your full name", "अपना पूरा नाम दर्ज करें")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
            />
          </div>

          <div>
            <label className="mb-2 block">{localize("Email", "ईमेल")}</label>
            <input
              type="email"
              placeholder={localize("Enter your email", "अपना ईमेल दर्ज करें")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
            />
          </div>

          <div>
            <label className="mb-2 block">{localize("Password", "पासवर्ड")}</label>
            <input
              type="password"
              placeholder={localize("Create a password", "एक पासवर्ड बनाएं")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSigningUp}
            className="w-full rounded-xl bg-cyan-400 py-3.5 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 transition cursor-pointer shadow-md"
          >
            {isSigningUp ? localize("Creating Account...", "अकाउंट बन रहा है...") : localize("Sign Up", "साइन अप")}
          </button>
        </form>

        <p className="mt-6 text-center text-[var(--muted)]">
          {localize("Already have an account?", "क्या आपका पहले से अकाउंट है?")}{" "}
          <span onClick={() => router.push(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login")} className="cursor-pointer text-cyan-400">
            {localize("Login", "लॉगिन")}
          </span>
        </p>

        <p className="mt-3 text-center text-sm text-[var(--muted)]">
          {localize(
            "Signed-in users can save reports to the cloud and view them later in My Reports.",
            "साइन-इन उपयोगकर्ता रिपोर्ट को क्लाउड में सेव कर सकते हैं और बाद में My Reports में देख सकते हैं।"
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
