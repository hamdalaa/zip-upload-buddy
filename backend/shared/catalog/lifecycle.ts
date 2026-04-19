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
  hints?: { httpStatus?: number; category?: string },
): DomainBlockerEvidence {
  const normalizedReason = reason.toLowerCase();
  const explicitStatus = hints?.httpStatus;
  const httpStatusMatch = normalizedReason.match(/(?:http\s*|status[\s:]+|:\s*)(\d{3})/i);
  const httpStatus = explicitStatus ?? (httpStatusMatch ? Number(httpStatusMatch[1]) : undefined);

  // Prefer the structured category produced by CatalogHttpError when available.
  const categoryToBlocker: Record<string, DomainBlockerEvidence["blockerType"]> = {
    password_wall: "password_wall",
    login_wall: "login_wall",
    challenge: "challenge",
    rate_limited: "rate_limited",
    not_found: "dead_site",
    dns_failure: "dead_site",
    timeout: "network_failure",
    network_failure: "network_failure",
    server_error: "network_failure",
    client_error: "network_failure",
  };

  const mappedFromCategory = hints?.category ? categoryToBlocker[hints.category] : undefined;
  const blockerType: DomainBlockerEvidence["blockerType"] =
    mappedFromCategory ?? inferBlockerFromReason(normalizedReason, httpStatus);

  return {
    id: createId("blk"),
    storeId: store.id,
    blockerType,
    reason,
    httpStatus,
    observedUrl,
    observedAt: nowIso(),
    retryAfterHours:
      blockerType === "rate_limited"
        ? 6
        : blockerType === "challenge" || blockerType === "login_wall" || blockerType === "password_wall"
          ? 24
          : blockerType === "dead_site"
            ? 168 // weekly retry on dead sites
            : 12,
    details: hints?.category ? { category: hints.category } : {},
  };
}

function inferBlockerFromReason(
  normalizedReason: string,
  httpStatus?: number,
): DomainBlockerEvidence["blockerType"] {
  if (httpStatus === 401 || /please log in|login required/i.test(normalizedReason)) return "login_wall";
  if (httpStatus === 402 || /password/i.test(normalizedReason)) return "password_wall";
  if (httpStatus === 403 || /challenge|cloudflare|captcha|just a moment|bot detection/i.test(normalizedReason)) {
    return "challenge";
  }
  if (httpStatus === 429 || /rate[\s-]*limit/i.test(normalizedReason)) return "rate_limited";
  if (
    httpStatus === 404 ||
    httpStatus === 410 ||
    /dns|enotfound|getaddrinfo|domain (not|no longer)/i.test(normalizedReason)
  ) {
    return "dead_site";
  }
  if (
    (httpStatus !== undefined && httpStatus >= 500) ||
    /timeout|fetch failed|aborted|econnreset|econnrefused/i.test(normalizedReason)
  ) {
    return "network_failure";
  }
  return "network_failure";
}

function safeRootDomain(url: string): string | undefined {
  const domain = extractDomain(url);
  return domain ? extractRootDomain(domain) : undefined;
}
