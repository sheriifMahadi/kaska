import { timingSafeEqual } from "node:crypto";
import { Receiver } from "@upstash/qstash";

type Environment = Readonly<Record<string, string | undefined>>;

function bearerAuthorized(authorization: string | null, secret?: string) {
  const expected = secret?.trim();
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const provided = authorization.slice("Bearer ".length).trim();
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length
    && timingSafeEqual(expectedBytes, providedBytes);
}

async function qstashAuthorized(
  request: Request,
  body: string,
  environment: Environment
) {
  const signature = request.headers.get("upstash-signature");
  const currentSigningKey = environment.QSTASH_CURRENT_SIGNING_KEY?.trim();
  const nextSigningKey = environment.QSTASH_NEXT_SIGNING_KEY?.trim();
  if (!signature || !currentSigningKey || !nextSigningKey) return false;

  try {
    return await new Receiver({
      currentSigningKey,
      nextSigningKey,
      devMode: false,
    }).verify({ signature, body });
  } catch {
    return false;
  }
}

export async function internalWorkerAuthorized(
  request: Request,
  body: string,
  environment: Environment = process.env
) {
  // The bearer secret is only a local-development escape hatch. Production
  // delivery must carry a valid rotating QStash signature.
  if (
    environment.NODE_ENV !== "production"
    && bearerAuthorized(
      request.headers.get("authorization"),
      environment.INTERNAL_WORKER_SECRET
    )
  ) {
    return true;
  }

  return qstashAuthorized(request, body, environment);
}
