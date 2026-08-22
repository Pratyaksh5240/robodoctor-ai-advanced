"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useAuth } from "@/components/AuthProvider";
import { translateUi } from "@/lib/uiI18n";

const publicRoutes = new Set(["/", "/login", "/signup"]);

function isProtectedRoute(pathname: string) {
  return !publicRoutes.has(pathname);
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, guestMode, loading, startGuestSession } = useAuth();
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);

  if (!pathname || !isProtectedRoute(pathname)) {
    return <>{children}</>;
  }

  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="w-full max-w-xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-bold">
            {localize("Checking your login", "लॉगिन स्थिति जाँची जा रही है")}
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            {localize(
              "We are verifying your sign-in status before opening this section.",
              "सुरक्षित सेक्शन खोलने से पहले हम आपका साइन-इन स्टेटस देख रहे हैं।"
            )}
          </p>
        </div>
      </div>
    );
  }

  if (!user && !guestMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="w-full max-w-2xl rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            {localize("Protected Access", "सुरक्षित एक्सेस")}
          </p>
          <h1 className="mt-3 text-3xl font-black md:text-4xl">
            {localize("Login is required for this section", "इस सेक्शन के लिए लॉगिन ज़रूरी है")}
          </h1>
          <p className="mt-4 text-[var(--muted)]">
            {localize(
              "All health modules now use sign-in so your reports, history, and progress stay protected across the whole app.",
              "अब सभी हेल्थ मॉड्यूल साइन-इन के पीछे हैं ताकि आपकी रिपोर्ट, हिस्ट्री और प्रोग्रेस हर जगह सुरक्षित रहे।"
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              {localize("Login", "लॉगिन करें")}
            </Link>
            <button
              type="button"
              onClick={startGuestSession}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-6 py-3 hover:opacity-90"
            >
              {localize("Continue as guest", "गेस्ट के रूप में जारी रखें")}
            </button>
            <Link
              href={`/signup?next=${encodeURIComponent(nextPath)}`}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-6 py-3 hover:opacity-90"
            >
              {localize("Create account", "अकाउंट बनाएँ")}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] px-6 py-3 hover:opacity-90"
            >
              {localize("Back home", "होम पर वापस जाएँ")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
