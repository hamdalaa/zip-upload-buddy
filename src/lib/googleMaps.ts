export function buildGoogleMapsUrl(input: {
  googleMapsUrl?: string;
  lat?: number | null;
  lng?: number | null;
  name?: string;
  address?: string;
}) {
  if (input.googleMapsUrl) return input.googleMapsUrl;

  if (typeof input.lat === "number" && typeof input.lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${input.lat},${input.lng}`;
  }

  const query = [input.name, input.address].filter(Boolean).join(" ").trim();
  if (!query) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
