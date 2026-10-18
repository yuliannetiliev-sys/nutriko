// Общото за магазина, което трябва и на браузъра (формата за поръчка), и на
// сървъра. Тук няма тайни и няма достъп до базата.

export type DeliveryType = "office" | "apt" | "address";

export const DELIVERY_TYPES: DeliveryType[] = ["office", "apt", "address"];

export const DELIVERY_LABEL: Record<DeliveryType, string> = {
  office: "До офис на Спиди",
  apt: "До автомат на Спиди",
  address: "До адрес с куриер",
};

export type ShopSettings = {
  enabled: boolean;
  /** null = този начин на доставка не се предлага */
  shipping: Record<DeliveryType, number | null>;
  /** над тази сума на артикулите доставката е безплатна; null = никога */
  freeFrom: number | null;
};

export type DeliveryOption = { type: DeliveryType; label: string; price: number };

export function deliveryOptions(s: ShopSettings): DeliveryOption[] {
  return DELIVERY_TYPES.filter((t) => s.shipping[t] != null).map((t) => ({
    type: t,
    label: DELIVERY_LABEL[t],
    price: s.shipping[t]!,
  }));
}

/** Доставката при дадена сума на артикулите. null = начинът не се предлага. */
export function shippingPrice(s: ShopSettings, type: DeliveryType, itemsTotal: number): number | null {
  const p = s.shipping[type];
  if (p == null) return null;
  if (s.freeFrom != null && itemsTotal >= s.freeFrom) return 0;
  return p;
}

// Сумите се смятат в центове: 0,1 + 0,2 в евро с плаваща запетая не е 0,3.
export const toCents = (eur: number) => Math.round(eur * 100);
export const fromCents = (c: number) => c / 100;

export type OrderStatus =
  | "pending"
  | "paid"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Чака плащане",
  paid: "Платена — за опаковане",
  packed: "Опакована",
  shipped: "Изпратена",
  delivered: "Доставена",
  cancelled: "Отказана",
  refunded: "Върната сума",
};

export type NutrKind = "energy" | "macro" | "saturates" | "salt";

/**
 * Хранителна стойност за таблицата — закръглена по указанията на Европейската
 * комисия за етикетите (2012): от 10 г нагоре — цели грамове, под 10 — до 0,1;
 * наситените под 0,1 и солта под 0,0125 г се пишат „<0,1“ / „<0,01“. Същото
 * правило ползва и скриптът за етикета на кутията — сайтът и етикетът казват едно.
 */
export function nutr(v: number | null | undefined, kind: NutrKind = "macro"): string {
  if (v == null) return "—";
  const f = (x: number, d: number) => x.toFixed(d).replace(".", ",");
  if (v === 0) return "0";
  switch (kind) {
    case "energy":
      return String(Math.round(v));
    case "salt":
      return v >= 1 ? f(v, 1) : v > 0.0125 ? f(v, 2) : "<0,01";
    case "saturates":
      return v >= 10 ? f(v, 0) : v > 0.1 ? f(v, 1) : "<0,1";
    default:
      return v >= 10 ? f(v, 0) : v > 0.5 ? f(v, 1) : "<0,5";
  }
}

/** Текст с алергени между **…** → части за удебеляване. */
export function splitBold(s: string): { text: string; bold: boolean }[] {
  return s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith("**") && part.endsWith("**")
      ? { text: part.slice(2, -2), bold: true }
      : { text: part, bold: false }
  );
}
