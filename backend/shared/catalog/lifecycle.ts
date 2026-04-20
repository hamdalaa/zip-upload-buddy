import { createId, extractDomain, extractRootDomain, nowIso } from "./normalization.js";
import type {
  CatalogCoverageState,
  ConnectorProfileRecord,
  DomainAcquisitionProfile,
  DomainBlockerEvidence,
  PartnerFeedRecord,
  SessionWorkflowRecord,
  StoreRecord,
  StoreSizeSummaryRecord,
} from "./types.js";

export function buildAcquisitionProfile(args: {
  store: StoreRecord;
  connectorProfile?: ConnectorProfileRecord;
  size?: StoreSizeSummaryRecord;
  blockerEvidence?: DomainBlockerEvidence[];
  sessionWorkflow?: SessionWorkflowRecord;
  partnerFeed?: PartnerFeedRecord;
  duplicateOfStoreId?: string;
}): DomainAcquisitionProfile {
  const rootDomain = safeRootDomain(args.store.website ?? "") ?? "unknown";
  const latestBlocker = args.blockerEvidence?.[0];
  const lifecycleState = resolveCoverageState(args);
  const requiresSession =
    lifecycleState === "anti_bot_requires_session" ||
    args.sessionWorkflow?.status === "ready";
  const requiresFeed =
    lifecycleState === "partner_feed_required" ||
    args.partnerFeed?.status === "ready";

  return {
    storeId: args.store.id,
    rootDomain,
    websiteType: args.store.websiteType ?? "missing",
    connectorType: args.connectorProfile?.connectorType,
    strategy: requiresFeed
      ? "partner_feed"
      : requiresSession
        ? "browser_session"
        : args.connectorProfile?.capabilities.supportsStructuredApi
          ? "structured_api"
          : args.connectorProfile
            ? "html_catalog"
            : "manual_review",
    lifecycleState,
    publicCatalogDetected: (args.size?.indexedProductCount ?? 0) > 0,
    requiresSession,
    requiresFeed,
    duplicateOfStoreId: args.duplicateOfStoreId,
    notes: latestBlocker?.reason,
    lastClassifiedAt: nowIso(),
    details: {
      status: args.store.status,
      lastSyncAt: args.store.lastSyncAt,
      lastProbeAt: args.store.lastProbeAt,
      blockerType: latestBlocker?.blockerType,
      connectorSignals: args.connectorProfile?.platformSignals ?? [],
    },
  };
}

export function resolveCoverageState(args: {
  store: StoreRecord;
  size?: StoreSizeSummaryRecord;
  blockerEvidence?: DomainBlockerEvidence[];
  sessionWorkflow?: SessionWorkflowRecord;
  partnerFeed?: PartnerFeedRecord;
  duplicateOfStoreId?: string;
}): CatalogCoverageState {
  if (args.duplicateOfStoreId) return "duplicate_domain";
  if ((args.size?.indexedProductCount ?? 0) > 0) return "indexed";
  if (args.partnerFeed?.status === "ready") return "partner_feed_required";
  const latestBlocker = args.blockerEvidence?.[0];
  if (latestBlocker) {
    switch (latestBlocker.blockerType) {
      case "non_catalog":
        return "non_catalog";
      case "duplicate_domain":
        return "duplicate_domain";
      case "challenge":
      case "password_wall":
      case "login_wall":
      case "rate_limited":
        return "anti_bot_requires_session";
      case "feed_required":
        return "partner_feed_required";
      case "dead_site":
        return "dead_site";
      default:
        break;
    }
  }
  if (args.store.status === "failed") return "probed";
  if (args.size && args.size.indexedProductCount === 0) return "zero_products";
  if (args.store.status === "probe_pending" || args.store.status === "discovered") return "seeded";
  return "probed";
}

export function classifyBlockerEvidence(
  store: StoreRecord,
  reason: string,
  observedUrl?: string,
): DomainBlockerEvidence {
  const normalizedReason = reason.toLowerCase();
  const httpStatusMatch = normalizedReason.match(/:\s*(\d{3})/);
  const httpStatus = httpStatusMatch ? Number(httpStatusMatch[1]) : undefined;
  const blockerType =
    /password/i.test(reason)
      ? "password_wall"
      : /login|please log in/i.test(reason)
        ? "login_wall"
        : /403|challenge|cloudflare/i.test(reason)
          ? "challenge"
          : /429|rate/i.test(reason)
            ? "rate_limited"
            : /404|500|503|timeout|fetch failed/i.test(reason)
              ? "dead_site"
              : "network_failure";

  return {
    id: createId("blk"),
    storeId: store.id,
    blockerType,
    reason,
    httpStatus,
    observedUrl,
    observedAt: nowIso(),
    retryAfterHours: blockerType === "rate_limited" ? 12 : blockerType === "challenge" ? 24 : 72,
    details: {},
  };
}

function safeRootDomain(url: string): string | undefined {
  const domain = extractDomain(url);
  return domain ? extractRootDomain(domain) : undefined;
}
