import { catalogConfig } from "../shared/config.js";
import { createCatalogApiServer } from "./server.js";

const app = await createCatalogApiServer();

await app.listen({
  port: catalogConfig.port,
  host: catalogConfig.bindHost,
});
