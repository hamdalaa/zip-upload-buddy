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
  variant = "hero",
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

  const isHero = variant === "hero";

  return (
    <form
      onSubmit={submit}
      className={
        isHero
          ? "rounded-[1.7rem] border border-white/16 bg-[hsl(var(--background)_/_0.94)] p-2.5 shadow-[0_32px_80px_-42px_rgba(6,17,28,0.55)] backdrop-blur-xl md:rounded-[2rem] md:p-4"
          : "rounded-[1.5rem] border border-border/75 bg-card/90 p-3 shadow-soft-lg"
      }
    >
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="ابحث عن موديل، براند، أو اسم محل"
            className="h-12 rounded-[1.1rem] border-border/80 bg-white/95 pe-11 text-sm text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-secondary"
          />
        </div>

        <Select value={area} onValueChange={(value) => setArea(value as Area | "all")}>
          <SelectTrigger className="h-12 rounded-[1.1rem] border-border/80 bg-white/95 text-foreground shadow-none">
            <SelectValue placeholder="المنطقة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المناطق</SelectItem>
            {ALL_AREAS.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {entry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(value) => setCategory(value as Category | "all")}>
          <SelectTrigger className="h-12 rounded-[1.1rem] border-border/80 bg-white/95 text-foreground shadow-none">
            <SelectValue placeholder="الفئة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {ALL_CATEGORIES.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {entry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="submit"
          size="lg"
          className="h-12 rounded-[1.1rem] bg-secondary px-5 text-sm font-bold text-secondary-foreground hover:bg-secondary/94"
        >
          <Search className="h-4 w-4" />
          ابحث الآن
        </Button>
      </div>

      <div
        className={
          isHero
            ? "mt-3 flex flex-col gap-3 border-t border-border/55 pt-3 md:flex-row md:items-center md:justify-between"
            : "mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        }
      >
        <p className={isHero ? "hidden text-xs leading-6 text-muted-foreground sm:block" : "text-xs leading-6 text-muted-foreground"}>
          ابحث مرّة واحدة، ثم ضيّق النتيجة حسب الشارع أو الفئة بدون ما تبدّل بين واجهات مختلفة.
        </p>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5 rounded-full px-3 text-foreground/72 hover:bg-secondary/8 hover:text-foreground"
          onClick={() => nav("/results")}
        >
          كل النتائج
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}
