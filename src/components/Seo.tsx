import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
  makeSeoTitle,
  truncateMeta,
} from "@/lib/seo";

type StructuredData = Record<string, unknown> | Array<Record<string, unknown>>;

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "product" | "profile" | "article";
  noindex?: boolean;
  structuredData?: StructuredData;
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertLink(rel: string, href: string, hrefLang?: string) {
  const selector = hrefLang
    ? `link[rel="${rel}"][hreflang="${hrefLang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    if (hrefLang) element.hreflang = hrefLang;
    document.head.appendChild(element);
  }
  element.href = href;
}

function stableJson(data?: StructuredData) {
  if (!data) return "";
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function Seo({
  title = "حاير — دليل إلكترونيات العراق",
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  structuredData,
}: SeoProps) {
  const location = useLocation();
  const canonical = absoluteUrl(path ?? `${location.pathname}${location.search}`);
  const finalTitle = useMemo(() => makeSeoTitle(title), [title]);
  const finalDescription = useMemo(() => truncateMeta(description), [description]);
  const finalImage = absoluteUrl(image);
  const json = useMemo(() => stableJson(structuredData), [structuredData]);

  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    document.title = finalTitle;

    upsertMeta("name", "description", finalDescription);
    upsertMeta("name", "robots", noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large");
    upsertMeta("name", "author", SITE_NAME);
    upsertMeta("name", "theme-color", "#eef9ff");

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "ar_IQ");
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:title", finalTitle);
    upsertMeta("property", "og:description", finalDescription);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", finalImage);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", finalTitle);
    upsertMeta("name", "twitter:description", finalDescription);
    upsertMeta("name", "twitter:image", finalImage);

    upsertLink("canonical", canonical);
    upsertLink("alternate", canonical, "ar-IQ");
    upsertLink("alternate", canonical, "x-default");

    const scriptId = "hayr-structured-data";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!json) {
      script?.remove();
      return;
    }
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.text = json;
  }, [canonical, finalDescription, finalImage, finalTitle, json, noindex, type]);

  return null;
}
