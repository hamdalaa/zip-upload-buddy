import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Search, Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_AREAS, ALL_CATEGORIES, type Area, type Category } from "@/lib/types";

interface Props {
  initialQ?: string;
  initialArea?: Area | "all";
  initialCategory?: Category | "all";
  variant?: "hero" | "compact";
}

type Mode = "unified" | "shops";

export function HeroSearch({
  initialQ = "",
  initialArea = "all",
  initialCategory = "all",
}: Props) {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("unified");
  const [q, setQ] = useState(initialQ);
  const [area, setArea] = useState<Area | "all">(initialArea);
  const [category, setCategory] = useState<Category | "all">(initialCategory);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());

    if (mode === "unified") {
      nav(`/search?${params.toString()}`);
      return;
    }
    if (area !== "all") params.set("area", area);
    if (category !== "all") params.set("category", category);
    nav(`/results?${params.toString()}`);
  }

  return (
    <div className="w-full">
      {/* Mode toggle */}
      <div className="mx-auto mb-3 inline-flex rounded-full border border-border bg-card/80 p-1 shadow-soft-sm backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setMode("unified")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
            mode === "unified"
              ? "bg-gradient-primary text-primary-foreground shadow-soft-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          بحث موحّد بكل المواقع
        </button>
        <button
          type="button"
          onClick={() => setMode("shops")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
            mode === "shops"
              ? "bg-foreground text-background shadow-soft-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          محلات وعناوين
        </button>
      </div>

      <form
        onSubmit={submit}
        className="group/search w-full rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-soft-xl backdrop-blur-xl transition-all focus-within:border-primary/50 focus-within:shadow-glow sm:rounded-3xl sm:p-2"
      >
        {/* Search input row */}
        <div className="flex w-full items-center gap-2 rounded-xl bg-background/60 px-3 sm:rounded-2xl sm:px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={mode === "unified" ? "iPhone 15، PlayStation 5، MacBook…" : "ابحث عن موديل، براند، أو محل…"}
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-base"
          />
        </div>

        {/* Filters + CTA row */}
        <div className="mt-1.5 flex w-full flex-col gap-1.5 sm:mt-2 sm:flex-row sm:items-stretch sm:gap-2">
          {mode === "shops" && (
            <div className="flex w-full min-w-0 flex-1 gap-1.5 sm:gap-2">
              <Select value={area} onValueChange={(value) => setArea(value as Area | "all")}>
                <SelectTrigger className="h-11 w-0 min-w-0 flex-1 rounded-xl border-border/70 bg-background/60 px-3 text-[13px] text-foreground shadow-none transition-colors hover:bg-surface focus:ring-2 focus:ring-primary/30 sm:h-12 sm:rounded-2xl sm:text-sm">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <MapPin className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
                    <span className="truncate"><SelectValue placeholder="المنطقة" /></span>
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
                <SelectTrigger className="h-11 w-0 min-w-0 flex-1 rounded-xl border-border/70 bg-background/60 px-3 text-[13px] text-foreground shadow-none transition-colors hover:bg-surface focus:ring-2 focus:ring-primary/30 sm:h-12 sm:rounded-2xl sm:text-sm">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <Tag className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
                    <span className="truncate"><SelectValue placeholder="الفئة" /></span>
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
          )}

          {mode === "unified" && (
            <p className="flex flex-1 items-center justify-center px-3 text-[12px] text-muted-foreground sm:text-sm">
              <Sparkles className="me-1 h-3.5 w-3.5 text-primary" />
              نقارن أسعار المنتج بكل المتاجر العراقية
            </p>
          )}

          <Button
            type="submit"
            className="group/btn h-12 w-full shrink-0 rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto sm:rounded-2xl sm:px-8"
          >
            ابحث
            <ArrowLeft className="ms-2 h-4 w-4 transition-transform group-hover/btn:-translate-x-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}
