import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Problem } from "@/lib/http";

/** Says what the page could not do, and why, in the service's own words (FR-2.18). */
export function ProblemNotice({ title, problem }: { title: string; problem: Problem }) {
  return (
    <Alert variant="destructive" className="rounded-xl border-alarm/20 bg-alarm-soft p-4 text-alarm">
      <CircleAlert aria-hidden />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="text-foreground">{problem.detail}.</AlertDescription>
    </Alert>
  );
}
