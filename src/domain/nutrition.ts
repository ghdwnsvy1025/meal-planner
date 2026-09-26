import type { Food, Nutrients, NutrientKey } from './types'

export const NUTRIENT_KEYS: NutrientKey[] = ['kcal', 'carb', 'protein', 'fat', 'sugar', 'sodium']

export const NUTRIENT_LABELS: Record<NutrientKey, string> = {
  kcal: '칼로리',
  carb: '탄수화물',
  protein: '단백질',
  fat: '지방',
  sugar: '당류',
  sodium: '나트륨',
}

export const NUTRIENT_UNITS: Record<NutrientKey, string> = {
  kcal: 'kcal',
  carb: 'g',
  protein: 'g',
  fat: 'g',
  sugar: 'g',
  sodium: 'mg',
}

export type Totals = Required<Nutrients>

export const ZERO_TOTALS: Totals = { kcal: 0, carb: 0, protein: 0, fat: 0, sugar: 0, sodium: 0 }

export function scale(n: Nutrients, multiplier: number): Totals {
  return {
    kcal: n.kcal * multiplier,
    carb: n.carb * multiplier,
    protein: n.protein * multiplier,
    fat: n.fat * multiplier,
    sugar: n.sugar * multiplier,
    sodium: (n.sodium ?? 0) * multiplier,
  }
}

export function add(a: Totals, b: Totals): Totals {
  return {
    kcal: a.kcal + b.kcal,
    carb: a.carb + b.carb,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    sugar: a.sugar + b.sugar,
    sodium: a.sodium + b.sodium,
  }
}

export function sumItems(
  items: { foodId: string; multiplier: number }[],
  foods: Map<string, Food>,
): Totals {
  let t = ZERO_TOTALS
  for (const it of items) {
    const f = foods.get(it.foodId)
    if (!f) continue
    t = add(t, scale(f.nutrients, it.multiplier))
  }
  return t
}

/** 탄단지 열량 비율 (%). 4/4/9 kcal 환산. 총량이 0이면 전부 0. */
export function macroPercent(t: Totals): { carb: number; protein: number; fat: number } {
  const c = t.carb * 4
  const p = t.protein * 4
  const f = t.fat * 9
  const sum = c + p + f
  if (sum <= 0) return { carb: 0, protein: 0, fat: 0 }
  return { carb: (c / sum) * 100, protein: (p / sum) * 100, fat: (f / sum) * 100 }
}

/** 목표 칼로리와 비율에서 목표 그램수를 역산 */
export function macroGoalGrams(goalKcal: number, ratio: { carb: number; protein: number; fat: number }) {
  return {
    carb: (goalKcal * ratio.carb) / 100 / 4,
    protein: (goalKcal * ratio.protein) / 100 / 4,
    fat: (goalKcal * ratio.fat) / 100 / 9,
  }
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}
