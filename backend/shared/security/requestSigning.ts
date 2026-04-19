import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const INTERNAL_SIGNATURE_HEADERS = {
  timestamp: "x-catalog-timestamp",
  nonce: "x-catalog-nonce",
  signature: "x-catalog-signature",
} as const;

export interface SignatureInput {
  token: string;
  method: string;
  requestPath: string;
  timestamp: string;
  nonce: string;
}

export function buildCanonicalRequest(input: Omit<SignatureInput, "token">): string {
  return [input.method.toUpperCase(), input.requestPath, input.timestamp, input.nonce].join("\n");
}

export function buildRequestSignature(input: SignatureInput): string {
  return createHmac("sha256", input.token)
    .update(
      buildCanonicalRequest({
        method: input.method,
        requestPath: input.requestPath,
        timestamp: input.timestamp,
        nonce: input.nonce,
      }),
    )
    .digest("hex");
}

export function verifyRequestSignature(input: SignatureInput & { providedSignature: string }): boolean {
  const expected = Buffer.from(buildRequestSignature(input), "hex");
  const provided = Buffer.from(input.providedSignature, "hex");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function buildNonceHash(tokenHash: string, nonce: string): string {
  return createHash("sha256").update(`${tokenHash}:${nonce}`).digest("hex");
}

export function buildSignedHeaders(token: string, method: string, requestPath: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("hex");
  const signature = buildRequestSignature({
    token,
    method,
    requestPath,
    timestamp,
    nonce,
  });

  return {
    authorization: `Bearer ${token}`,
    [INTERNAL_SIGNATURE_HEADERS.timestamp]: timestamp,
    [INTERNAL_SIGNATURE_HEADERS.nonce]: nonce,
    [INTERNAL_SIGNATURE_HEADERS.signature]: signature,
  };
}
