import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_AREAS, ALL_CATEGORIES, type Area, type Category } from "@/lib/types";

interface Props {
  initialQ?: string;
  initialArea?: Area | "all";
  initialCategory?: Category | "all";
  variant?: "hero" | "compact";
}

export function HeroSearch({
  initialQ = "",
  initialArea = "all",
  initialCategory = "all",
}: Props) {
  const nav = useNavigate();
  const [q, setQ] = useState(initialQ);
  const [area, setArea] = useState<Area | "all">(initialArea);
  const [category, setCategory] = useState<Category | "all">(initialCategory);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (area !== "all") params.set("area", area);
    if (category !== "all") params.set("category", category);
    nav(`/results?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="group/search rounded-3xl border border-border/70 bg-card/80 p-2 shadow-soft-xl backdrop-blur-xl transition-all focus-within:border-primary/50 focus-within:shadow-glow"
    >
      {/* Search input row */}
      <div className="flex items-center gap-2 rounded-2xl bg-background/60 px-4 py-1">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="ابحث عن موديل، براند، أو محل…"
          className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70 sm:h-12 sm:text-base"
        />
      </div>

      {/* Filters + CTA row */}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <Select value={area} onValueChange={(value) => setArea(value as Area | "all")}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background/60 px-3 text-sm text-foreground shadow-none transition-colors hover:bg-surface focus:ring-2 focus:ring-primary/30 sm:h-12">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="المنطقة" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">كل المناطق</SelectItem>
              {ALL_AREAS.map((entry) => (
                <SelectItem key={entry} value={entry}>{entry}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={(value) => setCategory(value as Category | "all")}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background/60 px-3 text-sm text-foreground shadow-none transition-colors hover:bg-surface focus:ring-2 focus:ring-primary/30 sm:h-12">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="الفئة" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">كل الفئات</SelectItem>
              {ALL_CATEGORIES.map((entry) => (
                <SelectItem key={entry} value={entry}>{entry}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          className="group/btn h-11 rounded-2xl bg-gradient-primary px-6 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:h-12 sm:px-8"
        >
          ابحث
          <ArrowLeft className="ms-2 h-4 w-4 transition-transform group-hover/btn:-translate-x-1" />
        </Button>
      </div>
    </form>
  );
}
