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
