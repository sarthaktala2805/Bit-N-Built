import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/navigation/app-shell";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  title: "StageX AI — Smart Anchor & Stage Flow Management",
  description:
    "Plan. Perform. Adapt. Powered by NeuroX. Real-time stage operations, dynamic schedule recalculation, and context-aware AI assistance.",
  icons: {
    icon: "/brand/favicon.png",
    shortcut: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070B14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070B14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
