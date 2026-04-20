import { useEffect, useState } from "react";
import {
  Search,
  Scale,
  MapPin,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Instagram,
  Code2,
  Store,
  Tag,
  ShieldCheck,
} from "lucide-react";
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
import developerAvatar from "@/assets/developer-avatar.jpg";

type TourStep = {
  icon: typeof Search;
  title: string;
  body: string;
  highlights: string[];
  instagram?: string;
};

const steps: TourStep[] = [
  {
    icon: Search,
    title: "ابحث وقارن بسرعة",
    body:
      "اكتب اسم المنتج (مثل RTX 4060 أو iPhone 15) أو اختر فئة، وراح تشوف نتائج من عشرات المحلات بصفحة واحدة. اضغط «قارن» لحد 4 منتجات وشوفهم جنب بعض بالسعر والمواصفات.",
    highlights: ["بحث فوري", "مقارنة لحد 4 منتجات", "فلترة بالسعر والتقييم"],
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
    title: "كلمة من المطور",
    body:
      "حاير منصة بنيتها بجهد فردي لتسهيل سوق الإلكترونيات بالعراق وتوحيد المحلات والأسعار بمكان واحد موثوق.\n\nلأصحاب المحلات: نوفر باقات رعاية وشراكات إعلانية تشمل تثبيت متجرك بالصدارة، إبراز منتجاتك، وحملات ترويجية مخصصة. للتعاون أو الاستفسار، تواصل معي مباشرة عبر إنستغرام.",
    instagram: "https://instagram.com/",
    highlights: ["شراكات رسمية", "باقات رعاية", "تثبيت بالصدارة", "دعم مستمر"],
  },
];

export function WelcomeTour() {
  const { onboarded, setOnboarded, tourTrigger } = useUserPrefs();
  const [open, setOpen] = useState(!onboarded);
  const [step, setStep] = useState(0);

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
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-md flex-col gap-3 overflow-hidden rounded-2xl p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow sm:h-14 sm:w-14">
            <Sparkles className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <DialogTitle className="text-center text-base sm:text-xl">أهلاً بك في حاير</DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm">
            دليل إلكترونيات العراق — جولة سريعة بأربع خطوات
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-center sm:p-5">
            {current.icon === Code2 ? (
              <div className="mx-auto mb-3 h-14 w-14 overflow-hidden rounded-full ring-2 ring-primary/30 shadow-glow sm:h-20 sm:w-20">
                <img
                  src={developerAvatar}
                  alt="صورة المطور"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            )}
            <h3 className="text-base font-bold sm:text-lg">{current.title}</h3>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground sm:text-sm">{current.body}</p>

            {current.highlights && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                {current.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/80"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            {isLast && current.instagram && (
              <a
                href={current.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 transition-opacity"
              >
                <Instagram className="h-4 w-4" />
                تواصل مع المطور
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
              }`}
              aria-label={`خطوة ${i + 1}`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-1">
                <ArrowRight className="h-4 w-4" />
                السابق
              </Button>
            )}
            {!isLast ? (
              <Button onClick={() => setStep((s) => s + 1)} className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                التالي
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={close} className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                ابدأ التصفح
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
