import "./globals.css";
import { Suspense } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";

export const metadata = {
  title: "RoboDoctor AI",
  description: "AI Powered Health Intelligence System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <AuthProvider>
            <Suspense fallback={children}>
              <AuthGate>{children}</AuthGate>
            </Suspense>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
