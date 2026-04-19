import { createHash } from "node:crypto";

export function hashServiceToken(token: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}
