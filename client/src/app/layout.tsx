import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IPO Tracker — Allotment Status",
    template: "%s | IPO Tracker",
  },
  description:
    "Track IPO allotment status for all family members in one clean, centralized dashboard.",
  keywords: ["IPO", "allotment", "tracker", "BSE", "NSE", "India"],
  authors: [{ name: "IPO Tracker" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "font-sans text-sm shadow-lg",
            },
          }}
        />
      </body>
    </html>
  );
}
