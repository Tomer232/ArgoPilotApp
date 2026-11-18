// Runs before /plots/<id> renders. The page streams, so once it starts it can only answer 200;
// this check runs first, so an unknown plot gets a real 404.

import { NextResponse, type NextRequest } from "next/server";
import { getConfig } from "@/lib/config";

const NOT_FOUND_PAGE = "/plot-not-found";

/**
 * Ask the registry for the plot. Only a 404 from the registry turns into our 404 page.
 * Any other answer, an error or a timeout lets the page render and handle it as before.
 * The 404 page opened by its own address is a 404 too (QA-8); the proxy doesn't run again on its own rewrite.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === NOT_FOUND_PAGE) {
    return notFoundPage(request);
  }
  const plotId = request.nextUrl.pathname.split("/")[2];
  const config = getConfig();
  try {
    const response = await fetch(`${config.registryUrl}/v1/plots/${encodeURIComponent(plotId)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(config.registryTimeoutSeconds * 1000),
    });
    if (response.status === 404) {
      return notFoundPage(request);
    }
  } catch {
    // The registry did not answer: the page shows its own error.
  }
  return NextResponse.next();
}

/** Show the "Plot not found" page with status 404, keeping the address the grower typed. */
function notFoundPage(request: NextRequest): NextResponse {
  return NextResponse.rewrite(new URL(NOT_FOUND_PAGE, request.url), { status: 404 });
}

export const config = {
  matcher: ["/plots/:id", "/plot-not-found"],
};
