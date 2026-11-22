// The one place that sends HTTP requests to the services.

/** What went wrong, in words a page can show. `code` is the service's own error code, if any. */
export type Problem = {
  status: number | null;
  code: string | null;
  detail: string;
};

/** Either the data, or the problem. Callers check `ok` instead of catching exceptions. */
export type Result<T> = { ok: true; data: T } | { ok: false; problem: Problem };

/**
 * GET a JSON body from one of the services. Never throws: no answer, a timeout,
 * an error status and a body that isn't JSON all come back as a Problem that names the service.
 */
export async function getJson<T>(
  service: string,
  url: string,
  timeoutSeconds: number,
): Promise<Result<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    const detail = timedOut
      ? `${service} did not answer within ${timeoutSeconds} s`
      : `${service} is not reachable`;
    return { ok: false, problem: { status: null, code: null, detail } };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return { ok: false, problem: problemFromBody(service, response.status, body) };
  }
  if (body === null) {
    const detail = `${service} sent an answer that is not JSON`;
    return { ok: false, problem: { status: response.status, code: null, detail } };
  }
  return { ok: true, data: body as T };
}

/** Turn an error answer into a Problem, using its problem+json `detail` and `code` when present. */
function problemFromBody(service: string, status: number, body: unknown): Problem {
  const fields = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const detail =
    typeof fields.detail === "string" ? fields.detail : `${service} answered with status ${status}`;
  const code = typeof fields.code === "string" ? fields.code : null;
  return { status, code, detail };
}
