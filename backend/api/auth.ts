import type { FastifyReply, FastifyRequest } from "fastify";
import { catalogConfig } from "../shared/config.js";
import { hashServiceToken } from "../shared/security/tokenHash.js";
import type { CatalogRepository, ServiceTokenRecord } from "../shared/repositories/contracts.js";
import {
  buildNonceHash,
  INTERNAL_SIGNATURE_HEADERS,
  verifyRequestSignature,
} from "../shared/security/requestSigning.js";

export function createInternalAuth(repository: CatalogRepository) {
  return async function internalAuth(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      reply.code(401).send({ error: "missing_bearer_token" });
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
