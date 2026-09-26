import type { DayPlan, DayMeal, DayItem, MealGroup, MealSlotType, WeekTemplate, WeekTemplateSlot, Settings } from './types'
import { newId } from './id'
import { weekdayIndex, type ISODate } from './dates'

/** 그룹 항목을 하루 항목으로 복사. 적용 = 복사이며 그룹과 연결은 groupId로만 남긴다. */
export function itemsFromGroup(group: MealGroup): DayItem[] {
  return group.items.map((g) => ({
    id: newId(),
    foodId: g.foodId,
    multiplier: g.multiplier,
    planned: true,
  }))
}

export function emptyMeal(slot: MealSlotType): DayMeal {
  return { id: newId(), slot, items: [] }
}

export function emptyDay(date: ISODate, slots: MealSlotType[]): DayPlan {
  return { date, meals: slots.map(emptyMeal), updatedAt: Date.now() }
}

/** 끼니 하나를 그룹으로 채운다. 기존 계획 항목은 교체하고, 기록 모드에서 추가로 먹은 항목(planned=false)은 보존한다. */
export function applyGroupToMeal(meal: DayMeal, group: MealGroup): DayMeal {
  const extras = meal.items.filter((i) => !i.planned)
  return { ...meal, groupId: group.id, items: [...itemsFromGroup(group), ...extras] }
}

/** 주간 그룹의 해당 요일 배치로 하루를 만든다. 그룹이 없는 칸(groupId null)은 빈 끼니로 남긴다. */
export function dayFromWeekTemplate(
  date: ISODate,
  template: WeekTemplate,
  groups: Map<string, MealGroup>,
  settings: Pick<Settings, 'weekStartsOn' | 'defaultSlots'>,
): DayPlan {
  const idx = weekdayIndex(date, settings.weekStartsOn)
  const slots: WeekTemplateSlot[] = template.days[idx] ?? settings.defaultSlots.map((s) => ({ slot: s, groupId: null }))
  const meals: DayMeal[] = slots.map((ws) => {
    const meal = emptyMeal(ws.slot)
    const g = ws.groupId ? groups.get(ws.groupId) : undefined
    return g ? applyGroupToMeal(meal, g) : meal
  })
  return { date, meals, weekTemplateId: template.id, updatedAt: Date.now() }
}

/** "이 변경을 그룹에도 저장": 끼니의 계획 항목을 그룹 항목으로 되돌려 쓴다. */
export function groupFromMeal(group: MealGroup, meal: DayMeal): MealGroup {
  return {
    ...group,
    items: meal.items.filter((i) => i.planned).map((i) => ({ foodId: i.foodId, multiplier: i.multiplier })),
    updatedAt: Date.now(),
  }
}

export function emptyWeekTemplate(name: string, slots: MealSlotType[]): WeekTemplate {
  const now = Date.now()
  return {
    id: newId(),
    name,
    days: Array.from({ length: 7 }, () => slots.map((s) => ({ slot: s, groupId: null }))),
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** 하루의 모든 계획 항목을 먹음으로 체크 ("전부 먹음") */
export function markAllEaten(plan: DayPlan): DayPlan {
  return {
    ...plan,
    meals: plan.meals.map((m) => ({
      ...m,
      items: m.items.map((i) => (i.planned ? { ...i, eaten: true } : i)),
    })),
    updatedAt: Date.now(),
  }
}

export const MULTIPLIER_STEPS = [0.5, 1, 1.5, 2]
