// Runs before /plots/<id> renders. The page streams, so once it starts it can only answer 200;
// this check runs first, so an unknown plot gets a real 404.

import { NextResponse, type NextRequest } from "next/server";
import { getConfig } from "@/lib/config";

// An address with no page: rewriting to it makes Next.js serve src/app/not-found.tsx with 404.
// A rewrite's own `status` is lost in the production build, so we rely on the missing route.
const NO_PAGE = "/plot-not-found";

/**
 * Ask the registry for the plot. Only a 404 from the registry turns into the 404 page.
 * Any other answer, an error or a timeout lets the page render and handle it as before.
 */
export async function proxy(request: NextRequest) {
  const plotId = request.nextUrl.pathname.split("/")[2];
  const config = getConfig();
  try {
    const response = await fetch(`${config.registryUrl}/v1/plots/${encodeURIComponent(plotId)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(config.registryTimeoutSeconds * 1000),
    });
    if (response.status === 404) {
      // Keeps the address the grower typed.
      return NextResponse.rewrite(new URL(NO_PAGE, request.url));
    }
  } catch {
    // The registry did not answer: the page shows its own error.
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/plots/:id"],
};
