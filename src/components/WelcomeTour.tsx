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

const steps = [
  {
    icon: Search,
    title: "ابحث وقارن بسرعة",
    body:
      "اكتب اسم المنتج (مثل RTX 4060 أو iPhone 15) أو اختر فئة، وراح تشوف نتائج من عشرات المحلات بصفحة واحدة. اضغط «قارن» لحد 4 منتجات وشوفهم جنب بعض بالسعر والمواصفات.",
    highlights: ["بحث فوري", "مقارنة لحد 4 منتجات", "فلترة بالسعر والتقييم"],
  },
  {
    icon: Store,
    title: "كل محلات بغداد بمكان واحد",
    body:
      "دليل لشارع الصناعة والربيعي وباقي شوارع الإلكترونيات: موقع المحل على Google Maps، رقم تلفون، واتساب، تقييمات حقيقية، وحتى صفحات إنستغرام — كله بضغطة وحدة.",
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
    title: "من المطور — مرحبا 👋",
    body:
      "تايه مشروع شخصي بنيته لأن دوامة البحث عن سعر أو محل بالعراق تعبتني. لو عندك ملاحظة، اقتراح، أو محل ناقص — راسلني بإنستغرام وراح أرد بأقرب وقت.\n\nوإذا جنت صاحب محل وحاب ترعى الموقع، تثبّت محلك بالواجهة، أو تفتح فرصة شراكة وإعلان — تواصل وياي مباشرة ونتفاهم.",
    instagram: "https://instagram.com/",
    highlights: ["تطوير فردي", "رعاية وشراكات", "تثبيت محلك", "اقتراحاتك تفرق"],
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl">أهلاً بك في تايه</DialogTitle>
          <DialogDescription className="text-center">
            دليل إلكترونيات العراق — جولة سريعة بأربع خطوات
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-xl border border-border bg-muted/40 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold">{current.title}</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground leading-relaxed">{current.body}</p>

          {current.highlights && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
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

          {isLast && (current as any).instagram && (
            <a
              href={(current as any).instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 transition-opacity"
            >
              <Instagram className="h-4 w-4" />
              تواصل مع المطور
            </a>
          )}
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
