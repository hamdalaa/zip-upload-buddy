import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { sha256Hex } from "../catalog/normalization.js";

export interface EncryptedBlob {
  buffer: Buffer;
  sha256: string;
}

export function encryptSnapshot(payload: unknown, key: Buffer): EncryptedBlob {
  const plaintext = Buffer.from(JSON.stringify(payload, null, 2));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const buffer = Buffer.concat([iv, authTag, encrypted]);

  return {
    buffer,
    sha256: sha256Hex(buffer),
  };
}

export function decryptSnapshot(buffer: Buffer, key: Buffer): unknown {
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}
