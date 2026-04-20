import type { ProbeResult, StoreRecord, SyncResult } from "../shared/catalog/types.js";

export interface ConnectorHttpClient {
  fetchText(url: string): Promise<string>;
  fetchJson(url: string, init?: RequestInit): Promise<unknown>;
}

export interface ConnectorProbeContext {
  store: StoreRecord;
  homepageUrl: string;
  homepageHtml: string;
}

export interface ConnectorSyncContext {
  store: StoreRecord;
  profile: ProbeResult;
  client: ConnectorHttpClient;
}

export interface CatalogConnector {
  readonly type: ProbeResult["connectorType"];
  probe(context: ConnectorProbeContext): Promise<ProbeResult | null>;
  sync(context: ConnectorSyncContext): Promise<SyncResult>;
}
