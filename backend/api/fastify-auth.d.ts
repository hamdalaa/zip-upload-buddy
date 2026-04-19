import "fastify";
import type { ServiceTokenRecord } from "../shared/repositories/contracts.js";

declare module "fastify" {
  interface FastifyRequest {
    catalogToken?: ServiceTokenRecord;
  }
}
