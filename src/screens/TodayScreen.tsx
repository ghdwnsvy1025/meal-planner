import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DayItem, DayMeal, Food, MealGroup, MealSlotType } from '../domain/types'
import { SLOT_LABELS } from '../domain/types'
import { addDays, today, weekdayLabel, fromISODate } from '../domain/dates'
import { dayTotals } from '../domain/stats'
import { markAllEaten, MULTIPLIER_STEPS } from '../domain/templates'
import { newId } from '../domain/id'
import { addMealSlot, applyGroupToDayMeal, ensureDay, saveDay, saveMealBackToGroup, touchFoods } from '../db/repo'
import { useDay, useFoodMap, useGroups, useSettings } from '../hooks/useData'
import { MacroBar } from '../components/MacroBar'
import { MealWell } from '../components/MealWell'
import { FoodPicker } from '../components/FoodPicker'
import { Chips, Sheet } from '../components/ui'
import { fmt } from '../components/format'
import { IconChevronL, IconChevronR, IconGear, IconPlus, IconTrash } from '../components/icons'

export function TodayScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [date, setDate] = useState(today())
  const settings = useSettings()
  const foodMap = useFoodMap()
  const groups = useGroups()
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const plan = useDay(date)
  const [picker, setPicker] = useState<DayMeal | null>(null)
  const [itemSheet, setItemSheet] = useState<{ meal: DayMeal; item: DayItem } | null>(null)
  const [slotSheet, setSlotSheet] = useState(false)

  useEffect(() => {
    void ensureDay(date)
  }, [date])

  const isToday = date === today()
  const totals = dayTotals(plan, foodMap, settings, settings.statsBasis)
  const ratio = settings.goalKcal > 0 ? totals.kcal / settings.goalKcal : 0
  const over = ratio > 1.1
  const d = fromISODate(date)

  const updateMeal = useCallback(
    async (mealId: string, fn: (m: DayMeal) => DayMeal) => {
      const cur = await ensureDay(date)
      await saveDay({ ...cur, meals: cur.meals.map((m) => (m.id === mealId ? fn(m) : m)) })
    },
    [date],
  )

  async function pickFood(meal: DayMeal, f: Food) {
    // 기록 모드에서 오늘 이전 날짜에 넣는 건 "추가로 먹은 것"
    const extra = settings.recordMode && date <= today()
    const item: DayItem = { id: newId(), foodId: f.id, multiplier: 1, planned: !extra, eaten: extra ? true : undefined }
    await updateMeal(meal.id, (m) => ({ ...m, items: [...m.items, item] }))
    await touchFoods([f.id])
    setPicker(null)
  }

  async function pickGroup(meal: DayMeal, g: MealGroup) {
    await applyGroupToDayMeal(date, meal.id, g.id)
    setPicker(null)
  }

  async function setMultiplier(meal: DayMeal, item: DayItem, mult: number) {
    await updateMeal(meal.id, (m) => ({ ...m, items: m.items.map((i) => (i.id === item.id ? { ...i, multiplier: mult } : i)) }))
    setItemSheet((s) => (s ? { ...s, item: { ...s.item, multiplier: mult } } : s))
  }

  async function removeItem(meal: DayMeal, item: DayItem) {
    await updateMeal(meal.id, (m) => ({ ...m, items: m.items.filter((i) => i.id !== item.id) }))
    setItemSheet(null)
  }

  async function toggleEaten(meal: DayMeal, item: DayItem, eaten: boolean) {
    await updateMeal(meal.id, (m) => ({ ...m, items: m.items.map((i) => (i.id === item.id ? { ...i, eaten } : i)) }))
  }

  async function allEaten() {
    if (plan) await saveDay(markAllEaten(plan))
  }

  const missingSlots = (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlotType[]).filter((s) => s === 'snack' || !plan?.meals.some((m) => m.slot === s))
  const itemFood = itemSheet ? foodMap.get(itemSheet.item.foodId) : undefined

  return (
    <div className="screen">
      <div className="day-head">
        <h1 className="day-date">
          {d.getMonth() + 1}월 {d.getDate()}일 {weekdayLabel(date)}요일
          <small>{isToday ? '오늘' : date < today() ? '지난 날' : '다가올 날'}{plan?.weekTemplateId ? ' · 주간 그룹으로 채움' : ''}</small>
        </h1>
        <div className="day-nav">
          <button className="iconbtn" aria-label="전날" onClick={() => setDate(addDays(date, -1))}><IconChevronL /></button>
          {!isToday && <button className="btn btn-sm" onClick={() => setDate(today())}>오늘</button>}
          <button className="iconbtn" aria-label="다음날" onClick={() => setDate(addDays(date, 1))}><IconChevronR /></button>
          <button className="iconbtn" aria-label="설정" onClick={onOpenSettings}><IconGear /></button>
        </div>
      </div>

      <div className="summary">
        <div className="summary-kcal">
          <span className={'big' + (over ? ' over' : '')}>{fmt(totals.kcal)}</span>
          <span className="goal">/ {fmt(settings.goalKcal)} kcal{settings.recordMode ? (settings.statsBasis === 'actual' ? ' · 먹은 것' : ' · 계획') : ''}</span>
        </div>
        <div className="summary-bar"><div className={over ? 'over' : ''} style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
        <div style={{ marginTop: 12 }}><MacroBar totals={totals} /></div>
      </div>

      {settings.recordMode && plan && plan.meals.some((m) => m.items.some((i) => i.planned && i.eaten !== true)) && (
        <button className="btn btn-block" style={{ marginBottom: 12 }} onClick={allEaten}>계획대로 전부 먹음</button>
      )}

      <div className="tray">
        {plan?.meals.map((meal) => (
          <MealWell
            key={meal.id}
            meal={meal}
            foodMap={foodMap}
            group={meal.groupId ? groupMap.get(meal.groupId) : undefined}
            settings={settings}
            onOpenPicker={() => setPicker(meal)}
            onTapItem={(item) => setItemSheet({ meal, item })}
            onToggleEaten={(item, eaten) => toggleEaten(meal, item, eaten)}
            onSaveToGroup={() => saveMealBackToGroup(meal)}
          />
        ))}
      </div>
      <button className="btn btn-ghost btn-block add-slot" onClick={() => setSlotSheet(true)}><IconPlus /> 끼니 추가</button>

      {picker && (
        <FoodPicker title={`${SLOT_LABELS[picker.slot]}에 넣기`} onClose={() => setPicker(null)} onPickFood={(f) => pickFood(picker, f)} onPickGroup={(g) => pickGroup(picker, g)} />
      )}
      {itemSheet && (
        <Sheet title={itemFood?.name ?? '음식'} onClose={() => setItemSheet(null)}>
          <div className="stack">
            <p className="muted">{itemFood?.servingLabel} 기준 {fmt(itemFood?.nutrients.kcal ?? 0)} kcal</p>
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>양</div>
              <Chips value={itemSheet.item.multiplier} options={MULTIPLIER_STEPS.map((m) => ({ value: m, label: `×${m}` }))} onChange={(m) => setMultiplier(itemSheet.meal, itemSheet.item, m)} />
            </div>
            <button className="btn btn-danger" onClick={() => removeItem(itemSheet.meal, itemSheet.item)}><IconTrash /> 이 끼니에서 빼기</button>
          </div>
        </Sheet>
      )}
      {slotSheet && (
        <Sheet title="끼니 추가" onClose={() => setSlotSheet(false)}>
          <div className="chips" style={{ paddingBottom: 12 }}>
            {missingSlots.map((s) => (
              <button key={s} className="chip" onClick={async () => { await addMealSlot(date, s); setSlotSheet(false) }}>{SLOT_LABELS[s]}</button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
