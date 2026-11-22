import Link from "next/link";
import { PageHeader } from "@/components/page-header";

/** Shown for an address that is not a plot, with the way back to the list. */
export function PlotNotFound() {
  return (
    <>
      <PageHeader title="Plot not found" subtitle="There is no plot with this address." />
      <Link href="/plots" className="font-medium text-water underline underline-offset-4">
        Go to the plot list
      </Link>
    </>
  );
}
