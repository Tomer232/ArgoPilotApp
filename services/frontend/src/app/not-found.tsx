import Link from "next/link";
import { PageHeader } from "@/components/page-header";

/**
 * Every address with no page, and every unknown plot (src/proxy.ts sends it here).
 * Next.js serves this page with HTTP 404, also in the production build.
 */
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Not found" subtitle="There is no plot or page at this address." />
      <Link href="/plots" className="font-medium text-water underline underline-offset-4">
        Go to the plot list
      </Link>
    </main>
  );
}
