import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Instagram,
  Code2,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserPrefs } from "@/lib/userPrefs";
import developerAvatar from "@/assets/developer-avatar.webp";

type TourStep = {
  icon: LucideIcon;
  title: string;
  body: string;
  highlights: string[];
  instagram?: string;
};

const steps: TourStep[] = [
  {
    icon: Sparkles,
    title: "هذه نسخة أولية تتحسن يومياً",
    body:
      "حاير حالياً بإصدار Beta: نجمع بيانات المتاجر والمنتجات والأسعار من مصادر متعددة ونراجعها باستمرار. استخدم النتائج للمقارنة السريعة، وتأكد من السعر والتوفر داخل صفحة العرض قبل الشراء.",
    highlights: ["Beta مفتوح للتجربة", "تحديثات مستمرة", "تأكيد السعر من المتجر"],
  },
  {
    icon: Store,
    title: "كل محلات العراق بمكان واحد",
    body:
      "دليل شامل لشوارع الإلكترونيات بكل محافظات العراق — شارع الصناعة، الربيعي، وغيرهم: موقع المحل على Google Maps، رقم تلفون، واتساب، تقييمات حقيقية، وصفحات إنستغرام — كله بضغطة وحدة.",
    highlights: ["خرائط Google", "واتساب مباشر", "تقييمات موثقة"],
  },
  {
    icon: MapPin,
    title: "تغطية لكل العراق",
    body:
      "مو بس بغداد — أربيل، البصرة، الموصل، النجف، كربلاء، السليمانية، كركوك، بعقوبة، والناصرية. افتح الأطلس وشوف أهم محلات كل محافظة.",
    highlights: ["10 محافظات", "وكلاء رسميون", "تحديث مستمر"],
  },
  {
    icon: Code2,
    title: "رعاية حاير للمتاجر الجادة",
    body:
      "حاير مبني حتى يخلّي قرار الشراء أوضح: المتجر، السعر، المنتج، ورابط العرض بمكان واحد. إذا عندك متجر إلكترونيات وتريد تظهر للزبون وقت المقارنة، نقدر نبني لك ظهور منظم داخل المنصة بدون إعلانات مزعجة.",
    instagram: "https://instagram.com/hamadalaatech",
    highlights: ["ظهور داخل البحث", "تثبيت متاجر مختارة", "تقارير شهرية", "باقات رعاية"],
  },
];

const sponsorBenefits = [
  {
    label: "ظهور",
    title: "متجرك وقت القرار",
    body: "بطاقات واضحة داخل الصفحة الرئيسية والبحث عندما يكون الزبون يقارن فعلاً.",
  },
  {
    label: "ثقة",
    title: "تمييز رسمي",
    body: "شارة متجر موثّق أو راعٍ مع روابط مباشرة للعرض، الهاتف، والموقع.",
  },
  {
    label: "متابعة",
    title: "أرقام شهرية",
    body: "ملخص بسيط عن الظهور والنقرات حتى تعرف شنو يشتغل فعلاً.",
  },
];

type WelcomeTourProps = {
  autoOpen?: boolean;
};

export function WelcomeTour({ autoOpen = false }: WelcomeTourProps) {
  const { setOnboarded, tourTrigger } = useUserPrefs();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const didAutoOpenRef = useRef(false);

  useEffect(() => {
    if (!autoOpen || didAutoOpenRef.current) return;
    didAutoOpenRef.current = true;
    setStep(0);
    setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (tourTrigger > 0) {
      setStep(0);
      setOpen(true);
    }
  }, [tourTrigger]);

  const close = () => {
    setOpen(false);
    setOnboarded(true);
  };

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="left-1/2 top-1/2 max-h-[min(88dvh,760px)] w-[calc(100dvw-1.25rem)] max-w-[44rem] overflow-hidden rounded-[1.55rem] border-0 bg-transparent p-0 shadow-[0_48px_140px_-64px_rgba(6,22,36,0.72)] data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 sm:w-[calc(100dvw-3rem)] sm:max-w-[52rem] sm:rounded-[2.5rem]">
        <div className="relative rounded-[1.55rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(14,165,233,0.22)_42%,rgba(15,23,42,0.16))] p-[1px] sm:rounded-[2.5rem]">
          <div className="relative flex max-h-[min(88dvh,760px)] min-h-0 flex-col overflow-hidden rounded-[calc(1.55rem-1px)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(246,252,254,0.96)_46%,rgba(231,244,249,0.94)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.96)] sm:rounded-[calc(2.5rem-1px)]">
            <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-cyan-200/42 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 left-4 h-72 w-72 rounded-full bg-slate-200/58 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.045)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />

            <DialogHeader className="relative space-y-2.5 px-4 pb-3 pt-5 text-center sm:space-y-3 sm:px-8 sm:pt-8">
              <div className="mx-auto inline-flex items-center gap-2 rounded-[0.95rem] bg-slate-950 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.9)] ring-1 ring-white/12">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" strokeWidth={1.65} />
                Beta Preview
              </div>
              <DialogTitle className="mx-auto max-w-[34rem] text-balance text-center font-display text-[2rem] font-black leading-[1.02] tracking-normal text-slate-950 sm:text-5xl sm:leading-[0.98]">
                أهلاً بك في حاير
              </DialogTitle>
              <DialogDescription className="mx-auto max-w-[36rem] text-pretty text-center text-[13px] font-medium leading-6 text-slate-600 sm:max-w-[38rem] sm:text-[15px] sm:leading-7">
                منصة عراقية تقرأ سوق الإلكترونيات بسرعة: منتجات، متاجر، أسعار، وروابط عروض. النتائج للمقارنة الذكية، والشراء النهائي يبقى بعد تأكيد السعر والتوفر من المتجر.
              </DialogDescription>
            </DialogHeader>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-3 sm:px-8">
              <div className="mx-auto max-w-[38rem]">
                <section className="rounded-[1.35rem] bg-white/70 p-1 shadow-[0_22px_70px_-58px_rgba(8,35,52,0.65)] ring-1 ring-slate-950/[0.055] sm:rounded-[2rem] sm:p-1.5">
                  <div className="relative overflow-hidden rounded-[calc(1.35rem-0.25rem)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(238,248,251,0.86))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:rounded-[calc(2rem-0.375rem)] sm:p-7">
                    <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
                    {current.icon === Code2 ? (
                      <div className="text-start" dir="rtl">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 text-center sm:text-start">
                            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black tracking-normal text-white shadow-[0_18px_38px_-28px_rgba(15,23,42,0.9)] sm:mx-0">
                              <Sparkles className="h-3.5 w-3.5 text-cyan-200" strokeWidth={1.6} />
                              فرص رعاية محدودة
                            </div>
                            <h3 className="mx-auto mt-4 max-w-[31rem] text-balance text-center font-display text-[2rem] font-black leading-[0.98] text-slate-950 sm:mx-0 sm:text-start sm:text-5xl">
                              خلّي متجرك يطلع قدّام الزبون وقت المقارنة.
                            </h3>
                          </div>
                          <div className="mx-auto shrink-0 rounded-[1.55rem] bg-slate-950/6 p-1.5 ring-1 ring-slate-950/5 sm:mx-0">
                            <div className="relative h-20 w-20 overflow-hidden rounded-[1.12rem] shadow-[0_22px_44px_-24px_rgba(15,23,42,0.72)] sm:h-24 sm:w-24">
                              <img
                                src={developerAvatar}
                                alt="صورة المطور"
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-slate-950/72 px-2 py-1 text-center text-[9px] font-black text-white">
                                Hayr
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="mx-auto mt-5 max-w-[39rem] text-pretty text-center text-sm font-medium leading-8 text-slate-600 sm:mx-0 sm:text-start sm:text-[15px]">
                          {current.body}
                        </p>

                        <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-3">
                          {sponsorBenefits.map((item) => (
                            <div
                              key={item.title}
                              className="rounded-[1.35rem] bg-white/74 p-4 text-center shadow-[inset_0_0_0_1px_rgba(15,23,42,0.055),0_18px_44px_-34px_rgba(8,35,52,0.45)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 sm:text-start"
                            >
                              <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700 ring-1 ring-cyan-200/60">
                                {item.label}
                              </span>
                              <h4 className="mt-3 font-display text-xl font-black leading-tight text-slate-950">
                                {item.title}
                              </h4>
                              <p className="mt-2 text-xs font-medium leading-6 text-slate-600">
                                {item.body}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 rounded-[1.5rem] bg-slate-950 p-1.5 text-white shadow-[0_24px_56px_-34px_rgba(15,23,42,0.9)]">
                          <div className="rounded-[calc(1.5rem-0.375rem)] bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
                            <div className="text-center sm:text-start">
                              <div className="text-[11px] font-black text-cyan-200">للرعاة والوكلاء والمتاجر</div>
                              <div className="mt-1 font-display text-2xl font-black leading-tight">مكان واضح بدون تشويش.</div>
                            </div>
                            {current.instagram && (
                              <a
                                href={current.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group mt-4 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-white py-1.5 pe-2 ps-5 text-sm font-black text-slate-950 shadow-[0_18px_40px_-26px_rgba(255,255,255,0.55)] transition-[transform,box-shadow,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] sm:mt-0 sm:w-auto"
                              >
                                تواصل للرعاية
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:-translate-x-0.5">
                                  <Instagram className="h-4 w-4" strokeWidth={1.7} />
                                </span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-cyan-50 text-cyan-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_18px_34px_-28px_rgba(8,145,178,0.8)] ring-1 ring-cyan-200/55">
                        <Icon className="h-7 w-7" strokeWidth={1.6} />
                      </div>
                    )}
                    {current.icon !== Code2 && (
                      <>
                        <h3 className="mx-auto max-w-[31rem] text-balance font-display text-[1.55rem] font-black leading-[1.08] text-slate-950 sm:text-3xl">
                          {current.title}
                        </h3>
                        <p className="mx-auto mt-3 max-w-[35rem] whitespace-pre-line text-pretty text-[13px] font-medium leading-7 text-slate-600 sm:mt-4 sm:text-[15px] sm:leading-8">
                          {current.body}
                        </p>
                      </>
                    )}

                    {current.icon !== Code2 && current.highlights && (
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        {current.highlights.map((h) => (
                          <span
                            key={h}
                            className="rounded-full bg-white px-3.5 py-2 text-[11px] font-black text-slate-700 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06),0_10px_24px_-22px_rgba(15,23,42,0.5)]"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="relative flex items-center justify-center gap-1.5 px-4 py-3 sm:py-4">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-[transform,background-color,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/70 active:scale-95"
                  aria-label={`خطوة ${i + 1}`}
                >
                  <span
                    className={`h-1.5 rounded-full transition-[width,background-color,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      i === step ? "w-8 bg-cyan-500" : "w-1.5 bg-slate-300/80"
                    }`}
                  />
                </button>
              ))}
            </div>

            <DialogFooter className="relative flex-row items-center justify-between gap-2 border-t border-slate-950/[0.055] bg-white/54 px-3 py-3 sm:justify-between sm:px-8 sm:py-4">
              <Button
                variant="ghost"
                onClick={close}
                className="text-slate-500 transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/70 hover:text-slate-950 active:scale-[0.98]"
              >
                تخطي
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep((s) => s - 1)}
                    className="group gap-2 bg-white/70 px-4 text-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white active:scale-[0.98]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    السابق
                  </Button>
                )}
                {!isLast ? (
                  <Button
                    onClick={() => setStep((s) => s + 1)}
                    className="group gap-3 bg-slate-950 py-1.5 pe-2 ps-5 text-white shadow-[0_22px_44px_-30px_rgba(15,23,42,0.9)] transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-slate-900 active:scale-[0.98]"
                  >
                    التالي
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:-translate-x-0.5">
                      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                  </Button>
                ) : (
                  <Button
                    onClick={close}
                    className="group gap-3 bg-slate-950 py-1.5 pe-2 ps-5 text-white shadow-[0_22px_44px_-30px_rgba(15,23,42,0.9)] transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-slate-900 active:scale-[0.98]"
                  >
                    ابدأ التصفح
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:-translate-x-0.5">
                      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
