import type { Category } from "@/lib/types";

/** Semantic color chip per category (Tailwind class pulled from index.css `.chip-*`). */
export function categoryChipClass(cat: Category): string {
  switch (cat) {
    case "Computing":
    case "PC Parts":
    case "Networking":
      return "chip-cyan";
    case "Phones":
    case "Tablets":
    case "Smart Devices":
      return "chip-violet";
    case "Gaming":
    case "Cameras":
      return "chip-rose";
    case "Chargers":
    case "Accessories":
      return "chip-amber";
    case "Printers":
      return "chip-emerald";
    default:
      return "chip-primary";
  }
}
