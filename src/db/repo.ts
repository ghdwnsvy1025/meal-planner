import { db } from './db'
import { DEFAULT_SETTINGS, type DayPlan, type Food, type MealGroup, type Settings, type WeekTemplate, type FoodDbEntry, type MealSlotType, type DayMeal } from '../domain/types'
import { newId } from '../domain/id'
import { today, type ISODate } from '../domain/dates'
import { dayFromWeekTemplate, emptyDay, applyGroupToMeal, groupFromMeal, emptyMeal } from '../domain/templates'

// ---------- settings ----------

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings')
  return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings()
  const next = { ...cur, ...patch, id: 'settings' as const }
  await db.settings.put(next)
  return next
}

// ---------- foods ----------

export type NewFoodInput = Pick<Food, 'name' | 'brand' | 'servingLabel' | 'servingGrams' | 'nutrients'> & Partial<Pick<Food, 'favorite'>>

export async function addCustomFood(input: NewFoodInput): Promise<Food> {
  const now = Date.now()
  const food: Food = { favorite: false, ...input, id: newId(), source: 'custom', archived: false, useCount: 0, createdAt: now, updatedAt: now }
  await db.foods.add(food)
  return food
}

/** 내장 DB 항목을 라이브러리에 복사. 같은 식품코드가 이미 있으면 그걸 돌려준다. */
export async function importFoodFromDb(entry: FoodDbEntry): Promise<Food> {
  const existing = await db.foods.where('source').equals('mfds').filter((f) => f.sourceCode === entry.code && !f.archived).first()
  if (existing) return existing
  const now = Date.now()
  const food: Food = {
    id: newId(),
    name: entry.name,
    brand: entry.brand,
    servingLabel: entry.servingLabel,
    servingGrams: entry.servingGrams,
    nutrients: entry.nutrients,
    source: 'mfds',
    sourceCode: entry.code,
    favorite: false,
    archived: false,
    useCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.foods.add(food)
  return food
}

export async function updateFood(id: string, patch: Partial<Food>): Promise<void> {
  await db.foods.update(id, { ...patch, updatedAt: Date.now() })
}

/** 삭제는 보관 처리. 과거 식단이 참조하므로 실제로 지우지 않는다. */
export async function archiveFood(id: string): Promise<void> {
  await db.foods.update(id, { archived: true, updatedAt: Date.now() })
}

export async function touchFoods(ids: string[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.foods, async () => {
    for (const id of new Set(ids)) {
      const f = await db.foods.get(id)
      if (f) await db.foods.update(id, { useCount: f.useCount + 1, lastUsedAt: now })
    }
  })
}

// ---------- groups ----------

export async function addGroup(input: Pick<MealGroup, 'name' | 'items' | 'slotHint'>): Promise<MealGroup> {
  const now = Date.now()
  const g: MealGroup = { ...input, id: newId(), useCount: 0, createdAt: now, updatedAt: now }
  await db.groups.add(g)
  return g
}

export async function updateGroup(id: string, patch: Partial<MealGroup>): Promise<void> {
  await db.groups.update(id, { ...patch, updatedAt: Date.now() })
}

/** 그룹 삭제. 주간 그룹에서 참조하는 칸은 비운다. 이미 적용된 날은 복사본이라 영향 없음. */
export async function deleteGroup(id: string): Promise<void> {
  await db.transaction('rw', db.groups, db.weekTemplates, async () => {
    await db.groups.delete(id)
    const templates = await db.weekTemplates.toArray()
    for (const t of templates) {
      const days = t.days.map((d) => d.map((s) => (s.groupId === id ? { ...s, groupId: null } : s)))
      const changed = t.days.some((d) => d.some((s) => s.groupId === id))
      if (changed) await db.weekTemplates.update(t.id, { days, updatedAt: Date.now() })
    }
  })
}

// ---------- week templates ----------

export async function addWeekTemplate(t: WeekTemplate): Promise<WeekTemplate> {
  await db.transaction('rw', db.weekTemplates, async () => {
    if (t.isDefault) await clearDefaultTemplate()
    await db.weekTemplates.add(t)
  })
  return t
}

export async function updateWeekTemplate(id: string, patch: Partial<WeekTemplate>): Promise<void> {
  await db.transaction('rw', db.weekTemplates, async () => {
    if (patch.isDefault) await clearDefaultTemplate()
    await db.weekTemplates.update(id, { ...patch, updatedAt: Date.now() })
  })
}

async function clearDefaultTemplate() {
  const cur = await db.weekTemplates.filter((t) => t.isDefault).toArray()
  for (const t of cur) await db.weekTemplates.update(t.id, { isDefault: false })
}

export async function deleteWeekTemplate(id: string): Promise<void> {
  await db.weekTemplates.delete(id)
}

export async function getDefaultTemplate(): Promise<WeekTemplate | undefined> {
  return db.weekTemplates.filter((t) => t.isDefault).first()
}

// ---------- days ----------

/**
 * 날짜의 식단을 가져온다. 없으면 만든다.
 * 오늘 이후 날짜는 기본 주간 그룹으로 자동 배치, 과거 날짜는 빈 하루로 만든다.
 * (과거를 자동으로 채우면 먹지 않은 것이 먹은 것으로 기록되기 때문)
 */
export async function ensureDay(date: ISODate): Promise<DayPlan> {
  const existing = await db.days.get(date)
  if (existing) return existing
  const settings = await getSettings()
  let plan: DayPlan
  const tmpl = date >= today() ? await getDefaultTemplate() : undefined
  if (tmpl) {
    const groups = new Map((await db.groups.toArray()).map((g) => [g.id, g]))
    plan = dayFromWeekTemplate(date, tmpl, groups, settings)
  } else {
    plan = emptyDay(date, settings.defaultSlots)
  }
  await db.days.put(plan)
  return plan
}

export async function saveDay(plan: DayPlan): Promise<void> {
  await db.days.put({ ...plan, updatedAt: Date.now() })
}

/** 특정 날을 주간 그룹으로 다시 채운다 (계획 항목은 교체, 추가로 먹은 항목은 보존). */
export async function reapplyWeekTemplate(date: ISODate, templateId: string): Promise<DayPlan> {
  const t = await db.weekTemplates.get(templateId)
  if (!t) throw new Error('week template not found')
  const settings = await getSettings()
  const groups = new Map((await db.groups.toArray()).map((g) => [g.id, g]))
  const fresh = dayFromWeekTemplate(date, t, groups, settings)
  const existing = await db.days.get(date)
  if (existing) {
    for (const m of fresh.meals) {
      const old = existing.meals.find((x) => x.slot === m.slot)
      if (old) m.items.push(...old.items.filter((i) => !i.planned))
    }
  }
  await db.days.put(fresh)
  return fresh
}

export async function applyWeekTemplateToDates(dates: ISODate[], templateId: string): Promise<void> {
  for (const d of dates) await reapplyWeekTemplate(d, templateId)
}

export async function applyGroupToDayMeal(date: ISODate, mealId: string, groupId: string): Promise<DayPlan> {
  const plan = await ensureDay(date)
  const group = await db.groups.get(groupId)
  if (!group) throw new Error('group not found')
  const meals = plan.meals.map((m) => (m.id === mealId ? applyGroupToMeal(m, group) : m))
  const next = { ...plan, meals, updatedAt: Date.now() }
  await db.transaction('rw', db.days, db.groups, db.foods, async () => {
    await db.days.put(next)
    await db.groups.update(groupId, { useCount: group.useCount + 1, lastUsedAt: Date.now() })
    await touchFoods(group.items.map((i) => i.foodId))
  })
  return next
}

export async function saveMealBackToGroup(meal: DayMeal): Promise<void> {
  if (!meal.groupId) return
  const g = await db.groups.get(meal.groupId)
  if (!g) return
  await db.groups.put(groupFromMeal(g, meal))
}

export async function addMealSlot(date: ISODate, slot: MealSlotType): Promise<DayPlan> {
  const plan = await ensureDay(date)
  const next = { ...plan, meals: [...plan.meals, emptyMeal(slot)], updatedAt: Date.now() }
  await db.days.put(next)
  return next
}

export async function getDaysInRange(from: ISODate, to: ISODate): Promise<Map<ISODate, DayPlan>> {
  const rows = await db.days.where('date').between(from, to, true, true).toArray()
  return new Map(rows.map((r) => [r.date, r]))
}

export async function getFoodMap(): Promise<Map<string, Food>> {
  return new Map((await db.foods.toArray()).map((f) => [f.id, f]))
}
