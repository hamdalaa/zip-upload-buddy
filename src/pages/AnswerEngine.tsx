import { Link } from "react-router-dom";
import { ArrowLeft, Bot, CheckCircle2, FileText, Search, Store, Zap } from "lucide-react";
import { Seo } from "@/components/Seo";
import { SiteFooter } from "@/components/SiteFooter";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { CATALOG_BASELINE_COUNTS } from "@/lib/catalogCounts";
import { SITE_URL, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

const answerCards = [
  {
    question: "شنو هو حاير؟",
    answer:
      "حاير هو دليل إلكترونيات عراقي يساعد المستخدم يبحث عن الموبايلات، الحاسبات، قطع PC، الشواحن، والإكسسوارات داخل متاجر بغداد وباقي محافظات العراق، مع روابط مباشرة للمحل أو صفحة المنتج.",
  },
  {
    question: "هل حاير يبيع المنتجات مباشرة؟",
    answer:
      "لا. حاير ليس متجر بيع مباشر؛ هو طبقة بحث ومقارنة تربط المستخدم بالمتاجر والمنتجات المفهرسة حتى يراجع السعر، التوفر، العنوان، والتقييم قبل التواصل مع البائع.",
  },
  {
    question: "أين أبحث عن محلات إلكترونيات في بغداد؟",
    answer:
      "أفضل نقطة بداية هي صفحة بغداد، شارع الصناعة، وشارع الربيعي. هذه الصفحات تجمع المحلات المفهرسة وروابط الخرائط والاتصال عندما تكون متاحة.",
  },
  {
    question: "كيف أقارن أسعار iPhone أو Samsung أو لابتوب بالعراق؟",
    answer:
      "استخدم صفحة البحث واكتب اسم المنتج أو الموديل، مثل S24 أو iPhone 15 أو RTX 4060. حاير يعرض المنتجات ذات الصلة أولاً ثم المتاجر والعروض المرتبطة بها.",
  },
  {
    question: "ما الذي يجعل حاير مناسباً لمحركات الإجابة؟",
    answer:
      "الموقع يوفر صفحات عامة قابلة للفهرسة، sitemap محدث، بيانات منظمة Schema.org، وملفات llms.txt وملفات Markdown/JSON مختصرة تلخص هوية الموقع وحدود استخدام بياناته.",
  },
];

const answerLinks = [
  { to: "/search", label: "بحث المنتجات", icon: Search },
  { to: "/city/baghdad", label: "محلات بغداد", icon: Store },
  { to: "/sinaa", label: "شارع الصناعة", icon: Zap },
  { to: "/rubaie", label: "شارع الربيعي", icon: Zap },
  { to: "/brands", label: "البراندات", icon: CheckCircle2 },
  { to: "/iraq", label: "كل المحافظات", icon: Store },
];

const staticDocs = [
  { href: "/llms.txt", label: "llms.txt المختصر" },
  { href: "/llms-full.txt", label: "دليل LLM الكامل" },
  { href: "/llms-ctx.txt", label: "سياق مختصر لمحركات الإجابة" },
  { href: "/llms-ctx-full.txt", label: "سياق كامل لمحركات الإجابة" },
  { href: "/answer-data/index.json", label: "JSON قابل للقراءة الآلية" },
  { href: "/answer-data/hayr-overview.md", label: "تعريف حاير" },
  { href: "/answer-data/iraq-electronics-search.md", label: "البحث عن الإلكترونيات" },
  { href: "/answer-data/baghdad-electronics-markets.md", label: "أسواق بغداد التقنية" },
  { href: "/answer-data/product-price-comparison.md", label: "مقارنة الأسعار" },
  { href: "/answer-data/best-electronics-stores-iraq.md", label: "أفضل طريقة للعثور على المحلات" },
  { href: "/answer-data/baghdad-phone-shops.md", label: "محلات الموبايلات في بغداد" },
  { href: "/answer-data/pc-parts-iraq.md", label: "قطع PC والحاسبات" },
  { href: "/answer-data/elryan-products.md", label: "منتجات الريان" },
  { href: "/answer-data/how-to-cite-hayr.md", label: "طريقة اقتباس حاير" },
  { href: "/answer-data/data-and-citation-policy.md", label: "سياسة الاقتباس والبيانات" },
];

const structuredData = [
  breadcrumbJsonLd([
    { name: "الرئيسية", path: "/" },
    { name: "إجابات حاير", path: "/answers" },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/answers#faq`,
    inLanguage: "ar-IQ",
    mainEntity: answerCards.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${SITE_URL}/answers#machine-readable-docs`,
    name: "Hayr answer-engine documentation",
    description:
      "ملفات تعريفية مختصرة تساعد محركات الإجابة والباحثين على فهم حاير، مجال تغطيته، وروابط الصفحات العامة القابلة للفهرسة.",
    url: absoluteUrl("/answers"),
    inLanguage: ["ar-IQ", "en"],
    license: absoluteUrl("/answer-data/data-and-citation-policy.md"),
    distribution: staticDocs.map((doc) => ({
      "@type": "DataDownload",
      contentUrl: absoluteUrl(doc.href),
      name: doc.label,
    })),
  },
];

export default function AnswerEngine() {
  return (
    <div className="min-h-screen flex flex-col atlas-shell">
      <Seo
        title="إجابات حاير لمحركات الذكاء الاصطناعي"
        description="صفحة مرجعية مختصرة لمحركات الإجابة مثل ChatGPT وGemini: ما هو حاير، ماذا يغطي، وكيف يمكن اقتباسه كدليل إلكترونيات عراقي."
        path="/answers"
        type="article"
        structuredData={structuredData}
      />
      <TopNav />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-b from-surface via-background to-background">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.05]" />
          <div className="container relative py-12 md:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
                <Bot className="h-4 w-4" />
                Answer Engine Profile
              </div>
              <h1 className="mt-6 text-balance font-display text-4xl font-black leading-[1.08] tracking-normal text-foreground md:text-6xl">
                إجابات واضحة عن حاير لمحركات الذكاء الاصطناعي
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-8 text-muted-foreground md:text-lg">
                هذه الصفحة تلخص حاير كدليل إلكترونيات عراقي: ماذا يفعل، ماذا لا يفعل، وأي صفحات يمكن لمحركات البحث والإجابة استخدامها كمصادر عامة.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full px-7">
                  <Link to="/search">
                    ابحث في المنتجات
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7">
                  <a href="/llms-full.txt">
                    ملف LLM الكامل
                    <FileText className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-10 md:py-14">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.35)]">
              <p className="text-sm text-muted-foreground">المتاجر المفهرسة</p>
              <p className="mt-2 font-numeric text-3xl font-black text-foreground">
                {CATALOG_BASELINE_COUNTS.stores.toLocaleString("en-US")}
              </p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">محلات ومتاجر إلكترونيات داخل العراق.</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.35)]">
              <p className="text-sm text-muted-foreground">المنتجات القابلة للبحث</p>
              <p className="mt-2 font-numeric text-3xl font-black text-foreground">
                {CATALOG_BASELINE_COUNTS.products.toLocaleString("en-US")}
              </p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">منتجات وأسعار وروابط متاجر مفهرسة.</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.35)]">
              <p className="text-sm text-muted-foreground">نطاق التغطية</p>
              <p className="mt-2 text-3xl font-black text-foreground">Iraq</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">بغداد أولاً، مع صفحات محافظات وأسواق تقنية.</p>
            </div>
          </div>
        </section>

        <section className="container pb-12">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div className="rounded-3xl border border-border/70 bg-card p-5 md:p-7">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <h2 className="font-display text-2xl font-black tracking-normal text-foreground">أسئلة مختصرة قابلة للاقتباس</h2>
              </div>
              <div className="mt-6 divide-y divide-border/70">
                {answerCards.map((item) => (
                  <article key={item.question} className="py-5 first:pt-0 last:pb-0">
                    <h3 className="text-lg font-black leading-7 text-foreground">{item.question}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-border/70 bg-card p-5">
                <h2 className="font-display text-xl font-black tracking-normal text-foreground">روابط عامة مهمة</h2>
                <div className="mt-4 grid gap-2">
                  {answerLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="group flex items-center justify-between rounded-2xl border border-border/60 bg-surface/60 px-4 py-3 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {label}
                      </span>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-card p-5">
                <h2 className="font-display text-xl font-black tracking-normal text-foreground">ملفات لمحركات الإجابة</h2>
                <ul className="mt-4 space-y-2">
                  {staticDocs.map((doc) => (
                    <li key={doc.href}>
                      <a
                        href={doc.href}
                        className="inline-flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-surface hover:text-foreground"
                      >
                        <span>{doc.label}</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
