"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/components/AuthProvider";
import { translateUi } from "@/lib/uiI18n";

function LoginPageContent() {
  const { language } = useLanguage();
  const { startGuestSession } = useAuth();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const redirectTarget = nextPath && nextPath.startsWith("/") ? nextPath : "/";

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert(localize("Login successful!", "लॉगिन सफल रहा।"));
      router.push(redirectTarget);
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : localize("Unable to login right now.", "अभी लॉगिन नहीं हो पाया।")
      );
    }
  };

  const handleGuestLogin = () => {
    startGuestSession();
    router.push(redirectTarget);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="w-[420px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{localize("Secure Login", "सुरक्षित लॉगिन")}</h1>
          <LanguageSwitcher />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label>{localize("Email", "ईमेल")}</label>
            <input
              type="email"
              placeholder={localize("Enter your email", "अपना ईमेल दर्ज करें")}
              className="mt-1 w-full rounded bg-[color:var(--surface)] p-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label>{localize("Password", "पासवर्ड")}</label>
            <input
              type="password"
              placeholder={localize("Enter your password", "अपना पासवर्ड दर्ज करें")}
              className="mt-1 w-full rounded bg-[color:var(--surface)] p-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="w-full rounded bg-cyan-500 p-3 font-semibold text-black">
            {localize("Login", "लॉगिन")}
          </button>
          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-3 font-semibold"
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
