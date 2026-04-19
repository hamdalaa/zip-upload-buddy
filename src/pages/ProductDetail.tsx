import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Award,
  ExternalLink,
  Package,
  Truck,
  Clock,
  TrendingDown,
  Share2,
  Heart,
  Store as StoreIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";

import { cn } from "@/lib/utils";
import {
  formatIQD,
  getProduct,
  getProductOffers,
  type UnifiedOffer,
  type UnifiedProduct,
} from "@/lib/unifiedSearch";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<UnifiedProduct | null>(null);
  const [offers, setOffers] = useState<UnifiedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getProduct(id), getProductOffers(id)]).then(([p, o]) => {
      setProduct(p);
      setOffers(o);
      setLoading(false);
      document.title = p ? `${p.title} | حاير` : "المنتج | حاير";
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="container mx-auto grid gap-8 px-4 py-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">المنتج غير موجود</h1>
          <Button asChild className="mt-4"><Link to="/search">العودة للبحث</Link></Button>
        </div>
      </div>
    );
  }

  const inStockOffers = offers.filter((o) => o.stock === "in_stock");
  const bestOffer = inStockOffers[0];
  const savings = product.highestPrice && product.lowestPrice
    ? Math.round(((product.highestPrice - product.lowestPrice) / product.highestPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />


      {/* Breadcrumb */}
      <div className="border-b border-border bg-card/30">
        <div className="container mx-auto flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">الرئيسية</Link>
          <span>/</span>
          <Link to="/search" className="hover:text-foreground">البحث الموحّد</Link>
          {product.brand && (
            <>
              <span>/</span>
              <span className="hover:text-foreground">{product.brand}</span>
            </>
          )}
          <span>/</span>
          <span className="line-clamp-1 text-foreground">{product.title}</span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-surface shadow-soft-lg">
              <img
                src={product.images[activeImage]}
                alt={product.title}
                className="h-full w-full object-contain p-6"
              />
              {savings > 5 && (
                <div className="absolute start-4 top-4 flex items-center gap-1 rounded-full bg-accent-rose px-3 py-1.5 text-xs font-bold text-white shadow-soft-md">
                  <TrendingDown className="h-3.5 w-3.5" />
                  وفّر حتى {savings}%
                </div>
              )}
              <div className="absolute end-4 top-4 flex flex-col gap-2">
                <button className="rounded-full bg-card/95 p-2 text-foreground shadow-soft-sm backdrop-blur-sm transition hover:scale-110 hover:text-primary">
                  <Heart className="h-4 w-4" />
                </button>
                <button className="rounded-full bg-card/95 p-2 text-foreground shadow-soft-sm backdrop-blur-sm transition hover:scale-110 hover:text-primary">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-surface transition-all",
                      activeImage === i ? "border-primary shadow-soft-md" : "border-border hover:border-muted-foreground",
                    )}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {product.brand && (
                  <Badge variant="outline" className="rounded-full border-border bg-surface px-3 py-1 text-xs font-bold uppercase">
                    {product.brand}
                  </Badge>
                )}
                {product.category && (
                  <Badge className="bg-accent-cyan-soft text-accent-cyan hover:bg-accent-cyan-soft">
                    {product.category}
                  </Badge>
                )}
                <Badge className="gap-1 bg-primary-soft text-primary hover:bg-primary-soft">
                  <Sparkles className="h-3 w-3" />
                  مقارنة من {offers.length} متجر
                </Badge>
              </div>

              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
                {product.title}
              </h1>

              {product.rating != null && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-4 w-4",
                          s <= Math.round(product.rating!) ? "fill-warning text-warning" : "text-muted",
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({product.reviewCount} تقييم)</span>
                </div>
              )}
            </div>

            {/* Best price card */}
            {bestOffer && (
              <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-soft via-card to-card p-5 shadow-soft-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">أفضل سعر متوفر</p>
                    <p className="mt-1 text-3xl font-extrabold text-foreground sm:text-4xl">
                      {formatIQD(bestOffer.price)}
                    </p>
                    {bestOffer.originalPrice && (
                      <p className="mt-1 text-sm text-muted-foreground line-through">
                        {formatIQD(bestOffer.originalPrice)}
                      </p>
                    )}
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-muted-foreground">من</p>
                    <p className="font-bold text-foreground">{bestOffer.storeName}</p>
                    {bestOffer.storeCity && (
                      <p className="text-xs text-muted-foreground">{bestOffer.storeCity}</p>
                    )}
                  </div>
                </div>
                <Button asChild className="mt-4 h-12 w-full rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <a href={bestOffer.productUrl} target="_blank" rel="noopener noreferrer">
                    اشتر من {bestOffer.storeName}
                    <ExternalLink className="ms-2 h-4 w-4" />
                  </a>
                </Button>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {bestOffer.shippingNote && (
                    <span className="flex items-center gap-1"><Truck className="h-3 w-3 text-accent-emerald" />{bestOffer.shippingNote}</span>
                  )}
                  {bestOffer.freshnessLabel && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{bestOffer.freshnessLabel}</span>
                  )}
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <StoreIcon className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-lg font-bold text-foreground">{offers.length}</p>
                <p className="text-[10px] text-muted-foreground">عرض</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-accent-emerald" />
                <p className="text-lg font-bold text-foreground">{inStockOffers.length}</p>
                <p className="text-[10px] text-muted-foreground">متوفر</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <TrendingDown className="mx-auto mb-1 h-4 w-4 text-accent-rose" />
                <p className="text-lg font-bold text-foreground">{savings}%</p>
                <p className="text-[10px] text-muted-foreground">فرق السعر</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: offers / specs / description */}
        <div className="mt-10">
          <Tabs defaultValue="offers" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl">
              <TabsTrigger value="offers">العروض ({offers.length})</TabsTrigger>
              <TabsTrigger value="specs">المواصفات</TabsTrigger>
              <TabsTrigger value="description">الوصف</TabsTrigger>
            </TabsList>

            <TabsContent value="offers" className="mt-5">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft-sm">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-4 text-start">المتجر</th>
                      <th className="hidden p-4 text-start sm:table-cell">المدينة</th>
                      <th className="p-4 text-start">الحالة</th>
                      <th className="p-4 text-end">السعر</th>
                      <th className="p-4 text-end"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer, idx) => (
                      <tr
                        key={offer.id}
                        className={cn(
                          "border-t border-border transition-colors hover:bg-surface/50",
                          idx === 0 && offer.stock === "in_stock" && "bg-primary-soft/40",
                        )}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-xs font-bold text-foreground">
                              {offer.storeName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{offer.storeName}</span>
                                {offer.officialDealer && (
                                  <Badge className="h-5 gap-0.5 bg-accent-violet-soft px-1.5 text-[10px] text-accent-violet hover:bg-accent-violet-soft">
                                    <Award className="h-2.5 w-2.5" />
                                    رسمي
                                  </Badge>
                                )}
                                {offer.verified && !offer.officialDealer && (
                                  <ShieldCheck className="h-3.5 w-3.5 text-accent-emerald" />
                                )}
                              </div>
                              {offer.storeRating != null && (
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                                  {offer.storeRating.toFixed(1)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden p-4 text-muted-foreground sm:table-cell">{offer.storeCity ?? "—"}</td>
                        <td className="p-4">
                          {offer.stock === "in_stock" ? (
                            <Badge className="gap-1 bg-accent-emerald-soft text-accent-emerald hover:bg-accent-emerald-soft">
                              <Package className="h-3 w-3" />
                              متوفر
                            </Badge>
                          ) : offer.stock === "preorder" ? (
                            <Badge variant="outline">طلب مسبق</Badge>
                          ) : (
                            <Badge variant="outline" className="border-destructive/30 text-destructive">نفد</Badge>
                          )}
                        </td>
                        <td className="p-4 text-end">
                          <div className="font-bold text-foreground">{formatIQD(offer.price)}</div>
                          {offer.originalPrice && (
                            <div className="text-xs text-muted-foreground line-through">{formatIQD(offer.originalPrice)}</div>
                          )}
                        </td>
                        <td className="p-4 text-end">
                          <Button asChild size="sm" variant={idx === 0 && offer.stock === "in_stock" ? "default" : "outline"} className="rounded-lg">
                            <a href={offer.productUrl} target="_blank" rel="noopener noreferrer">
                              زيارة
                              <ArrowLeft className="ms-1 h-3 w-3" />
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="specs" className="mt-5">
              {product.specs && Object.keys(product.specs).length > 0 ? (
                <div className="grid gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft-sm sm:grid-cols-2">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 odd:bg-surface/50">
                      <span className="text-sm text-muted-foreground">{k}</span>
                      <span className="text-sm font-semibold text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  لا توجد مواصفات تفصيلية لهذا المنتج بعد.
                </p>
              )}
            </TabsContent>

            <TabsContent value="description" className="mt-5">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-sm">
                <p className="text-sm leading-7 text-foreground">
                  {product.description ?? "لا يوجد وصف متاح لهذا المنتج بعد."}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
