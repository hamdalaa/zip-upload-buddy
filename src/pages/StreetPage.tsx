import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { StreetShopsSection } from "@/components/StreetShopsSection";
import type { Area } from "@/lib/types";

interface Props {
  area: Area;
  title: string;
  subtitle: string;
  emoji: string;
}

/**
 * Dedicated landing page for a single street.
 * Shows ALL shops on that street (no 15-shop preview limit) plus its filter chips.
 */
export function StreetPage({ area, title, subtitle, emoji }: Props) {
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopNav />

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <div className="container py-2.5 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
            <Home className="h-3 w-3" />
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground">{area}</span>
        </div>
      </div>

      <main className="flex-1 container py-5 md:py-8">
        <StreetShopsSection
          area={area}
          title={title}
          subtitle={subtitle}
          limit={null}
          hideHeaderCta
        />

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => nav("/")}
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            ← رجوع للرئيسية
          </button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function SinaaPage() {
  return (
    <StreetPage
      area="شارع الصناعة"
      title="محلات شارع الصناعة"
      subtitle="حاسبات، قطع، شبكات، طابعات وأكثر — فلتر حسب اللي تريده"
      emoji=""
    />
  );
}

export function RubaiePage() {
  return (
    <StreetPage
      area="شارع الربيعي"
      title="محلات شارع الربيعي"
      subtitle="هواتف، شواحن، إكسسوارات، تابلت — فلتر حسب اختصاص المحل"
      emoji=""
    />
  );
}

/**
 * Combined streets page — shows both Sinaa & Rubaie shops with full filters.
 * Used by the bottom-tab "الشوارع" entry.
 */
export function StreetsIndexPage() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopNav />

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <div className="container py-2.5 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
            <Home className="h-3 w-3" />
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground">الشوارع</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" aria-hidden />
        <div className="container relative py-8 md:py-12 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            شوارع التقنية في بغداد
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl tracking-tight">
            الصناعة <span className="text-muted-foreground">و</span> الربيعي
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            أهم شارعين للإلكترونيات بالعاصمة — كل المحلات بمكان واحد مع فلاتر حسب الفئة.
          </p>
        </div>
      </section>

      <main className="flex-1 container space-y-8 py-6 md:space-y-12 md:py-10">
        <StreetShopsSection
          area="شارع الصناعة"
          title="محلات شارع الصناعة"
          subtitle="حاسبات، قطع، شبكات، طابعات وأكثر."
          limit={null}
        />

        <StreetShopsSection
          area="شارع الربيعي"
          title="محلات شارع الربيعي"
          subtitle="هواتف، شواحن، إكسسوارات، تابلت."
          limit={null}
        />

        <div className="flex justify-center">
          <button
            onClick={() => nav("/")}
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            ← رجوع للرئيسية
          </button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
