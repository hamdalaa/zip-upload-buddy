import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      className="rounded-2xl border border-border bg-card shadow-soft-xl overflow-hidden"
    >
      <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
        <div className="relative bg-card">
          <Search className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="ابحث عن موديل، براند، أو اسم محل…"
            className="h-14 rounded-none border-0 bg-transparent pe-12 text-base text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
          />
        </div>

        <Select value={area} onValueChange={(value) => setArea(value as Area | "all")}>
          <SelectTrigger className="h-14 rounded-none border-0 bg-card text-foreground shadow-none focus:ring-0 hover:bg-surface transition-colors">
            <SelectValue placeholder="المنطقة" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">كل المناطق</SelectItem>
            {ALL_AREAS.map((entry) => (
              <SelectItem key={entry} value={entry}>{entry}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(value) => setCategory(value as Category | "all")}>
          <SelectTrigger className="h-14 rounded-none border-0 bg-card text-foreground shadow-none focus:ring-0 hover:bg-surface transition-colors">
            <SelectValue placeholder="الفئة" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">كل الفئات</SelectItem>
            {ALL_CATEGORIES.map((entry) => (
              <SelectItem key={entry} value={entry}>{entry}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="submit"
          className="h-14 rounded-none bg-gradient-primary px-6 md:px-8 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity shadow-glow"
        >
          ابحث
          <ArrowLeft className="ms-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
