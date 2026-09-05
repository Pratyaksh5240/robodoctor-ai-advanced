import "./globals.css";
import { Suspense } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "@/components/AuthProvider";
import { ActiveProfileProvider } from "./context/ActiveProfileContext";
import AuthGate from "@/components/AuthGate";
import FloatingChatbot from "@/components/FloatingChatbot";

export const metadata = {
  title: "RoboDoctor AI",
  description: "AI Powered Health Intelligence System",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <LanguageProvider>
          <AuthProvider>
            <ActiveProfileProvider>
              <Suspense fallback={children}>
                <AuthGate>{children}</AuthGate>
              </Suspense>
              <FloatingChatbot />
            </ActiveProfileProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}


