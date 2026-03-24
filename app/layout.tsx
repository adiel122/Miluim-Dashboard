import type { Metadata } from "next";
import { Rubik } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מילואים סיפוח",
  description: "לוח התאמות בין מילואימניקים ליחידות",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="min-h-screen antialiased font-sans">
        {children}
        <Toaster richColors dir="rtl" position="top-center" />
      </body>
    </html>
  );
}
