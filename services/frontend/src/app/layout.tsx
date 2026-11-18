import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Sprout } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AppNav, AppNavFallback } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";
import { StatusCard, StatusCardFallback } from "@/components/status-card";
import "./globals.css";

// Geist: crisp at small sizes, with good fixed-width digits for the plan's numbers.
const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgroPilot",
  description: "Daily irrigation plan for each plot",
};

/**
 * The shell shared by every page, in the P1 dashboard style. Wide screens: a sidebar with the
 * name, the sections and the service status, and the page in a light panel next to it.
 * Phones: a top bar with a menu button (the sections in a drawer), the name and the status.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      {/* wrap-break-word: a word longer than its line (a long farm or plot name) breaks instead of overflowing (QA-3). */}
      <body className="min-h-full text-sm tabular-nums wrap-break-word">
        <div className="flex min-h-screen flex-col lg:flex-row lg:gap-3 lg:p-3">
          <aside className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background px-4 py-2.5 lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:w-56 lg:shrink-0 lg:flex-col lg:items-stretch lg:gap-0 lg:rounded-2xl lg:border lg:p-3">
            <div className="lg:hidden">
              <MobileNav>
                <Suspense fallback={<AppNavFallback />}>
                  <AppNav />
                </Suspense>
              </MobileNav>
            </div>
            <Brand />
            <div className="hidden lg:mt-3 lg:block">
              <Suspense fallback={<AppNavFallback />}>
                <AppNav />
              </Suspense>
            </div>
            <div className="ml-auto lg:mt-auto lg:ml-0">
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

/** The green mark and the name, a link to the overview. */
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
