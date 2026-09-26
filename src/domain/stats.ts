import type { DayPlan, DayItem, Food, Settings, StatsBasis } from './types'
import { sumItems, add, ZERO_TOTALS, macroPercent, type Totals } from './nutrition'
import { dateRange, type ISODate } from './dates'

/**
 * 통계에 포함할 항목을 고른다.
 * - 기록 모드 꺼짐: planned 항목 전부 (계획 = 실제).
 * - 기록 모드 켜짐, 실제 기준: eaten === true 인 항목 (계획이든 추가든).
 * - 기록 모드 켜짐, 계획 기준: planned 항목 전부.
 */
export function selectItems(items: DayItem[], settings: Pick<Settings, 'recordMode'>, basis: StatsBasis): DayItem[] {
  if (!settings.recordMode || basis === 'planned') return items.filter((i) => i.planned)
  return items.filter((i) => i.eaten === true)
}

export function dayTotals(
  plan: DayPlan | undefined,
  foods: Map<string, Food>,
  settings: Pick<Settings, 'recordMode'>,
  basis: StatsBasis,
): Totals {
  if (!plan) return ZERO_TOTALS
  let t = ZERO_TOTALS
  for (const meal of plan.meals) {
    t = add(t, sumItems(selectItems(meal.items, settings, basis), foods))
  }
  return t
}

export function mealTotals(
  items: DayItem[],
  foods: Map<string, Food>,
  settings: Pick<Settings, 'recordMode'>,
  basis: StatsBasis,
): Totals {
  return sumItems(selectItems(items, settings, basis), foods)
}

/** 하루가 "기록된 날"인지. 선택된 항목이 하나라도 있으면 기록된 날로 본다. */
export function isRecordedDay(plan: DayPlan | undefined, settings: Pick<Settings, 'recordMode'>, basis: StatsBasis): boolean {
  if (!plan) return false
  return plan.meals.some((m) => selectItems(m.items, settings, basis).length > 0)
}

export interface DayStat {
  date: ISODate
  recorded: boolean
  totals: Totals
  /** 목표 칼로리 대비 비율 (0~) */
  goalRatio: number
  /** 목표 칼로리의 ±tolerance 안이면 달성 */
  goalHit: boolean
}

export interface PeriodStats {
  from: ISODate
  to: ISODate
  days: DayStat[]
  recordedDays: number
  /** 기록된 날 기준 일평균 */
  avg: Totals
  avgMacroPercent: { carb: number; protein: number; fat: number }
  goalHitDays: number
  /** recordedDays 기준 달성률 (0~1). 기록된 날이 없으면 0 */
  goalHitRate: number
}

export const GOAL_TOLERANCE = 0.1

export function computePeriodStats(
  from: ISODate,
  to: ISODate,
  plans: Map<ISODate, DayPlan>,
  foods: Map<string, Food>,
  settings: Pick<Settings, 'recordMode' | 'goalKcal'>,
  basis: StatsBasis,
  tolerance: number = GOAL_TOLERANCE,
): PeriodStats {
  const days: DayStat[] = []
  let sum = ZERO_TOTALS
  let recordedDays = 0
  let goalHitDays = 0
  for (const date of dateRange(from, to)) {
    const plan = plans.get(date)
    const recorded = isRecordedDay(plan, settings, basis)
    const totals = recorded ? dayTotals(plan, foods, settings, basis) : ZERO_TOTALS
    const goalRatio = settings.goalKcal > 0 ? totals.kcal / settings.goalKcal : 0
    const goalHit = recorded && Math.abs(goalRatio - 1) <= tolerance
    if (recorded) {
      recordedDays++
      sum = add(sum, totals)
      if (goalHit) goalHitDays++
    }
    days.push({ date, recorded, totals, goalRatio, goalHit })
  }
  const avg: Totals = recordedDays
    ? {
        kcal: sum.kcal / recordedDays,
        carb: sum.carb / recordedDays,
        protein: sum.protein / recordedDays,
        fat: sum.fat / recordedDays,
        sugar: sum.sugar / recordedDays,
        sodium: sum.sodium / recordedDays,
      }
    : ZERO_TOTALS
  return {
    from,
    to,
    days,
    recordedDays,
    avg,
    avgMacroPercent: macroPercent(avg),
    goalHitDays,
    goalHitRate: recordedDays ? goalHitDays / recordedDays : 0,
  }
}
