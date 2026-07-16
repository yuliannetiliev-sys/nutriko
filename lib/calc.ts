import type { Ingredient } from "./types";

export const round = (n: number, d = 2): number => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};

export type LineInput = { ingredient: Ingredient; grams: number };

export type Totals = {
  totalGrams: number;
  totalCost: number;
  costComplete: boolean;
  costPerServing: number;
  suggested: number | null;
  effective: number | null;
  whole: number | null;
  margin: number | null;
  marginPct: number | null;
  servingWeight: number;
  gi: number | null; // референтен гликемичен индекс на продукта
  gl: number | null; // референтен гликемичен товар на порция
  per100: { p: number; c: number; f: number; k: number };
  perServing: { p: number; c: number; f: number; k: number };
  totals: { p: number; c: number; f: number; k: number };
};

// Същата логика като SQL view-а product_costs_v — за жива сметка в браузъра.
export function computeTotals(
  lines: LineInput[],
  opts: {
    servings: number;
    finishedWeight: number | null;
    multiplier: number | null;
    sellPrice: number | null;
    purchasePrice?: number | null;
    wholePrice?: number | null;
  }
): Totals {
  let g = 0,
    cost = 0,
    p = 0,
    c = 0,
    f = 0,
    k = 0,
    giW = 0, // Σ(въглехидрати × ГИ) за съставки с известен ГИ
    giC = 0, // Σ(въглехидрати) за същите съставки
    complete = true;

  for (const { ingredient: i, grams } of lines) {
    g += grams;
    if (i.price_entered && i.price_eur_100 != null) {
      cost += (grams / 100) * i.price_eur_100;
    } else {
      complete = false;
    }
    p += (grams / 100) * (i.protein_100 ?? 0);
    c += (grams / 100) * (i.carbs_100 ?? 0);
    f += (grams / 100) * (i.fat_100 ?? 0);
    k += (grams / 100) * (i.kcal_100 ?? 0);
    if (i.gi != null && (i.carbs_100 ?? 0) > 0) {
      const carbG = (grams / 100) * (i.carbs_100 ?? 0);
      giW += carbG * i.gi;
      giC += carbG;
    }
  }

  const servings = opts.servings || 1;
  // Референтен ГИ = въглехидратно претеглена средна; ГТ на порция = ГИ × въгл./порция ÷ 100
  const gi = giC > 0 ? round(giW / giC, 0) : null;
  const gl = gi != null ? round((gi * (c / servings)) / 100, 1) : null;
  const hasRecipe = g > 0;
  // Себестойност: от рецептата (ако има съставки) ИЛИ ръчна доставна цена/порция
  const effCost = hasRecipe ? cost : opts.purchasePrice != null ? opts.purchasePrice * servings : 0;
  const effComplete = hasRecipe ? complete : opts.purchasePrice != null;
  const basis = opts.finishedWeight ?? (g || 0);
  const cps = effCost / servings;
  const suggested =
    opts.multiplier != null ? round(cps * opts.multiplier, 2) : null;
  const effective = opts.sellPrice ?? suggested;
  const whole =
    opts.wholePrice ?? (effective != null ? round(effective * servings, 2) : null);
  const margin = effective != null ? effective - cps : null;
  const marginPct =
    effective && effective > 0 ? (100 * (effective - cps)) / effective : null;
  const servingWeight = basis > 0 ? round(basis / servings, 0) : 0;

  const per = (x: number) => (basis > 0 ? (x / basis) * 100 : 0);
  return {
    totalGrams: g,
    totalCost: effCost,
    costComplete: effComplete,
    costPerServing: cps,
    suggested,
    effective,
    whole,
    margin,
    marginPct,
    servingWeight,
    gi,
    gl,
    per100: { p: per(p), c: per(c), f: per(f), k: per(k) },
    perServing: { p: p / servings, c: c / servings, f: f / servings, k: k / servings },
    totals: { p, c, f, k },
  };
}

// грамове -> въвеждане в единицата на съставката (g или бр.)
export function gramsToUnit(grams: number, i: Ingredient): number {
  if (i.unit === "бр." && i.grams_per_unit) return round(grams / i.grams_per_unit, 2);
  return grams;
}
export function unitToGrams(qty: number, i: Ingredient): number {
  if (i.unit === "бр." && i.grams_per_unit) return round(qty * i.grams_per_unit, 2);
  return qty;
}
