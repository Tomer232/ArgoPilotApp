import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { StatusLine, StatusLineFallback } from "@/components/status-line";
import "./globals.css";

// One family for the whole app. The width axis lets the big "38 min" use a wide cut.
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "AgroPilot",
  description: "Daily irrigation plan for each plot",
};

/** The HTML shell shared by every page: the name (a link home) and the service status line. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
          <Link href="/" className="font-semibold">
            AgroPilot
          </Link>
          <Suspense fallback={<StatusLineFallback />}>
            <StatusLine />
          </Suspense>
        </header>
        {children}
      </body>
    </html>
  );
}
