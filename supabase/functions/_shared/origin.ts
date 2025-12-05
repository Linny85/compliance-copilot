const DEFAULT_ORIGIN = "https://app.compliance-copilot.eu";
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "compliance-copilot.eu"]);
const ALLOWED_SUFFIXES = [".compliance-copilot.eu", ".github.dev", ".app.github.dev"];

function stripPort(host: string): string {
  return host.replace(/:\d+$/, "").toLowerCase();
}

export function extractHost(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return stripPort(url.host);
  } catch {
    return stripPort(value);
  }
}

export function extractOriginHost(req: Request): string | null {
  const originHost = extractHost(req.headers.get("origin"));
  if (originHost) return originHost;
  const refererHost = extractHost(req.headers.get("referer"));
  if (refererHost) return refererHost;
  return null;
}

function isAllowedHost(host: string | null): boolean {
  if (!host) return false;
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export function allowedOriginForRequest(req?: Request): string {
  if (!req) return DEFAULT_ORIGIN;

  const originHeader = req.headers.get("origin");
  const originHost = extractHost(originHeader);
  if (originHeader && isAllowedHost(originHost)) {
    return originHeader;
  }

  const referer = req.headers.get("referer");
  const refererHost = extractHost(referer);
  if (referer && isAllowedHost(refererHost)) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch {
      /* ignore malformed referer */
    }
  }

  const hostHeader = req.headers.get("host");
  const host = extractHost(hostHeader);
  if (host && isAllowedHost(host)) {
    const protocol = host === "localhost" || host === "127.0.0.1" ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return DEFAULT_ORIGIN;
}

export function assertOrigin(req: Request): Response | null {
  const originHeader = req.headers.get("origin");
  if (!originHeader) return null;
  const originHost = extractHost(originHeader);
  if (isAllowedHost(originHost)) return null;
  return new Response("Forbidden origin", { status: 403 });
}
