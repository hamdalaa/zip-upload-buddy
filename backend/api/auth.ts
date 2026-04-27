import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { catalogConfig } from "../shared/config.js";
import { hashServiceToken } from "../shared/security/tokenHash.js";
import type { CatalogRepository, ServiceTokenRecord } from "../shared/repositories/contracts.js";
import {
  buildNonceHash,
  INTERNAL_SIGNATURE_HEADERS,
  verifyRequestSignature,
} from "../shared/security/requestSigning.js";

const ADMIN_COOKIE_NAME = "hayr_admin_session";
export const ADMIN_CSRF_HEADER = "x-admin-csrf";
const ADMIN_SCOPES = ["catalog.read", "catalog.queue", "catalog.session", "catalog.feed", "catalog.settings"];

interface AdminSessionPayload {
  sub: "admin";
  scopes: string[];
  csrfToken: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSessionPayload(encodedPayload: string): string {
  return createHmac("sha256", catalogConfig.admin.sessionSecret)
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const index = entry.indexOf("=");
        if (index === -1) return [entry, ""];
        return [entry.slice(0, index), decodeURIComponent(entry.slice(index + 1))];
      }),
  );
}

function readAdminSession(request: FastifyRequest): AdminSessionPayload | undefined {
  const token = parseCookieHeader(request.headers.cookie)[ADMIN_COOKIE_NAME];
  if (!token) return undefined;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return undefined;
  if (!safeEqual(signSessionPayload(encodedPayload), signature)) return undefined;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;
    if (payload.sub !== "admin") return undefined;
    if (!Array.isArray(payload.scopes)) return undefined;
    if (typeof payload.csrfToken !== "string" || !payload.csrfToken) return undefined;
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) return undefined;
    return payload;
  } catch {
    return undefined;
  }
}

export function createAdminSessionCookie() {
  const now = Date.now();
  const maxAgeSeconds = catalogConfig.admin.sessionTtlHours * 60 * 60;
  const expiresAt = now + maxAgeSeconds * 1000;
  const payload: AdminSessionPayload = {
    sub: "admin",
    scopes: ADMIN_SCOPES,
    csrfToken: randomBytes(24).toString("base64url"),
    iat: now,
    exp: expiresAt,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const value = `${encodedPayload}.${signSessionPayload(encodedPayload)}`;
  return {
    cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    csrfToken: payload.csrfToken,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export function clearAdminSessionCookie() {
  return `${ADMIN_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function readAdminSessionState(request: FastifyRequest) {
  const session = readAdminSession(request);
  if (!session) return { authenticated: false as const };
  return {
    authenticated: true as const,
    csrfToken: session.csrfToken,
    expiresAt: new Date(session.exp).toISOString(),
  };
}

export function createInternalAuth(repository: CatalogRepository) {
  return async function internalAuth(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      const session = readAdminSession(request);
      if (!session) {
        reply.code(401).send({ error: "missing_authenticated_admin_session" });
        return;
      }

      if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
        const csrfHeader = request.headers[ADMIN_CSRF_HEADER];
        if (typeof csrfHeader !== "string" || !safeEqual(csrfHeader, session.csrfToken)) {
          reply.code(403).send({ error: "invalid_admin_csrf" });
          return;
        }
      }

      request.catalogToken = {
        name: "admin-session",
        tokenHash: "admin-session",
        scopes: session.scopes,
      };
      return;
    }

    const token = header.slice("Bearer ".length).trim();
    const tokenHash = hashServiceToken(token, catalogConfig.tokenPepper);
    const serviceToken = await repository.getServiceTokenByHash(tokenHash);
    if (!serviceToken) {
      reply.code(403).send({ error: "invalid_service_token" });
      return;
    }

    if (!catalogConfig.requireSignedInternalRequests) return;

    const timestamp = request.headers[INTERNAL_SIGNATURE_HEADERS.timestamp];
    const nonce = request.headers[INTERNAL_SIGNATURE_HEADERS.nonce];
    const signature = request.headers[INTERNAL_SIGNATURE_HEADERS.signature];

    if (
      typeof timestamp !== "string" ||
      typeof nonce !== "string" ||
      typeof signature !== "string"
    ) {
      reply.code(401).send({ error: "missing_request_signature_headers" });
      return;
    }

    const requestTimestamp = Number(timestamp);
    if (!Number.isFinite(requestTimestamp)) {
      reply.code(401).send({ error: "invalid_request_timestamp" });
      return;
    }

    const skewMs = Math.abs(Date.now() - requestTimestamp);
    if (skewMs > catalogConfig.requestMaxSkewSeconds * 1000) {
      reply.code(401).send({ error: "stale_request_signature" });
      return;
    }

    const requestPath = request.raw.url ?? request.url;
    const validSignature = verifyRequestSignature({
      token,
      method: request.method,
      requestPath,
      timestamp,
      nonce,
      providedSignature: signature,
    });
    if (!validSignature) {
      reply.code(403).send({ error: "invalid_request_signature" });
      return;
    }

    const nonceHash = buildNonceHash(tokenHash, nonce);
    const acceptedNonce = await repository.registerRequestNonce(
      nonceHash,
      new Date(requestTimestamp + catalogConfig.requestMaxSkewSeconds * 1000).toISOString(),
    );
    if (!acceptedNonce) {
      reply.code(409).send({ error: "replayed_request_signature" });
      return;
    }

    request.catalogToken = serviceToken;
  };
}

export function requireCatalogScopes(
  request: FastifyRequest,
  reply: FastifyReply,
  requiredScopes: string[],
): request is FastifyRequest & { catalogToken: ServiceTokenRecord } {
  const serviceToken = request.catalogToken;
  if (!serviceToken) {
    reply.code(401).send({ error: "missing_authenticated_token_context" });
    return false;
  }

  const allowed = requiredScopes.some((scope) => serviceToken.scopes.includes(scope));
  if (!allowed) {
    reply.code(403).send({ error: "insufficient_token_scope", requiredScopes });
    return false;
  }

  return true;
}
