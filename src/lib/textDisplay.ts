const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;

let decoder: HTMLTextAreaElement | null = null;

export function decodeHtmlEntities(input?: string | null): string {
  if (!input) return "";

  if (typeof document === "undefined") {
    return input
      .replace(/&#0*38;/g, "&")
      .replace(/&#0*8211;/g, "–")
      .replace(/&#0*8217;/g, "'")
      .replace(/&amp;/g, "&");
  }

  decoder ??= document.createElement("textarea");
  decoder.innerHTML = input;
  return decoder.value;
}

export function inferTextDirection(input?: string | null): "rtl" | "ltr" | "auto" {
  const value = decodeHtmlEntities(input);
  if (!value) return "auto";
  if (ARABIC_RE.test(value)) return "rtl";
  if (LATIN_RE.test(value)) return "ltr";
  return "auto";
}
