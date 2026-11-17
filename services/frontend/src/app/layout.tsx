import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sprout } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { StatusCard, StatusCardFallback } from "@/components/status-card";
import "./globals.css";

// The same family as the P1 registry dashboard.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgroPilot",
  description: "Daily irrigation plan for each plot",
};

/**
 * The shell shared by every page, in the P1 dashboard style: a sidebar with the name and the
 * service status on wide screens, a top bar with the same two on a phone, and the page in a
 * light panel next to it.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full text-sm">
        <div className="flex min-h-screen flex-col gap-3 lg:flex-row lg:p-3">
          <aside className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:w-56 lg:shrink-0 lg:flex-col lg:items-stretch lg:justify-start lg:rounded-2xl lg:border lg:p-3">
            <Brand />
            <nav aria-label="Main" className="hidden lg:mt-3 lg:block">
              <Link
                href="/"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-muted"
              >
                <Sprout aria-hidden className="size-4 text-muted-foreground" />
                Plots
              </Link>
            </nav>
            <div className="lg:mt-auto">
              <Suspense fallback={<StatusCardFallback />}>
                <StatusCard />
              </Suspense>
            </div>
          </aside>
          <div className="min-w-0 flex-1 bg-background lg:rounded-2xl lg:border">{children}</div>
        </div>
      </body>
    </html>
  );
}

/** The green mark and the name, a link to the plot list. */
function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 lg:border-b lg:px-1.5 lg:pb-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground">
        <Sprout aria-hidden className="size-4" />
      </span>
      <span>
        <b className="block leading-tight font-semibold">AgroPilot</b>
        <span className="hidden text-xs text-muted-foreground lg:block">Irrigation planner</span>
      </span>
    </Link>
  );
}
