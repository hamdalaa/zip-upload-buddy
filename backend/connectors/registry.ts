import type { CatalogConnector } from "./base.js";
import { genericJsonCatalogConnector } from "./genericJsonCatalogConnector.js";
import { genericSitemapHtmlConnector } from "./genericSitemapHtmlConnector.js";
import { jibalzoneStorefrontConnector } from "./jibalzoneStorefrontConnector.js";
import { magentoVsfConnector } from "./magentoVsfConnector.js";
import { masterstoreNextConnector } from "./masterstoreNextConnector.js";
import { miswagNuxtConnector } from "./miswagNuxtConnector.js";
import { socialOnlyConnector } from "./socialOnlyConnector.js";
import { unknownConnector } from "./unknownConnector.js";
import { woocommerceConnector } from "./woocommerceConnector.js";

export const connectorRegistry: CatalogConnector[] = [
  socialOnlyConnector,
  masterstoreNextConnector,
  jibalzoneStorefrontConnector,
  miswagNuxtConnector,
  magentoVsfConnector,
  woocommerceConnector,
  genericJsonCatalogConnector,
  genericSitemapHtmlConnector,
  unknownConnector,
];

export function findConnector(type: CatalogConnector["type"]): CatalogConnector {
  return connectorRegistry.find((connector) => connector.type === type) ?? unknownConnector;
}
