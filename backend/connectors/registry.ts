import { alwafiApiConnector } from "./alwafiApiConnector.js";
import type { CatalogConnector } from "./base.js";
import { genericJsonCatalogConnector } from "./genericJsonCatalogConnector.js";
import { genericSitemapHtmlConnector } from "./genericSitemapHtmlConnector.js";
import { jibalzoneStorefrontConnector } from "./jibalzoneStorefrontConnector.js";
import { magentoVsfConnector } from "./magentoVsfConnector.js";
import { masterstoreNextConnector } from "./masterstoreNextConnector.js";
import { miswagNuxtConnector } from "./miswagNuxtConnector.js";
import { shopifyConnector } from "./shopifyConnector.js";
import { socialOnlyConnector } from "./socialOnlyConnector.js";
import { threedIraqConnector } from "./threedIraqConnector.js";
import { tlcommerceConnector } from "./tlcommerceConnector.js";
import { unknownConnector } from "./unknownConnector.js";
import { woocommerceConnector } from "./woocommerceConnector.js";

export const connectorRegistry: CatalogConnector[] = [
  socialOnlyConnector,
  shopifyConnector,
  threedIraqConnector,
  tlcommerceConnector,
  alwafiApiConnector,
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
