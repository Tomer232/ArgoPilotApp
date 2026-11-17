import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";

/** The frame of a section page: the same width and padding everywhere, then the title. */
export function ListPage({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </main>
  );
}

/** "1 plot", "2 plots": a count with its word, in the right number. */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
