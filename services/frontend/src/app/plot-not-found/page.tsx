import { PlotNotFound } from "@/components/plot-not-found";

/** Where src/proxy.ts sends an unknown plot, with status 404. */
export default function PlotNotFoundPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <PlotNotFound />
    </main>
  );
}
