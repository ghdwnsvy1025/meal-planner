import type { DayMeal, DayItem, Food, MealGroup, Settings } from '../domain/types'
import { SLOT_LABELS } from '../domain/types'
import { mealTotals } from '../domain/stats'
import { scale } from '../domain/nutrition'
import { Check } from './ui'
import { fmt, multLabel } from './format'
import { IconPlus } from './icons'

interface Props {
  meal: DayMeal
  foodMap: Map<string, Food>
  group?: MealGroup
  settings: Settings
  onOpenPicker: () => void
  onTapItem: (item: DayItem) => void
  onToggleEaten: (item: DayItem, eaten: boolean) => void
  onSaveToGroup: () => void
}

/** 그룹 항목과 끼니의 계획 항목이 다른지 (그룹에 저장 버튼 노출용) */
function differsFromGroup(meal: DayMeal, group?: MealGroup): boolean {
  if (!group) return false
  const planned = meal.items.filter((i) => i.planned)
  if (planned.length !== group.items.length) return true
  return planned.some((i, n) => i.foodId !== group.items[n].foodId || i.multiplier !== group.items[n].multiplier)
}

export function MealWell({ meal, foodMap, group, settings, onOpenPicker, onTapItem, onToggleEaten, onSaveToGroup }: Props) {
  const totals = mealTotals(meal.items, foodMap, settings, settings.statsBasis)
  const dirty = differsFromGroup(meal, group)
  return (
    <section className="well" aria-label={SLOT_LABELS[meal.slot]}>
      <div className="well-h">
        <h2 className="slot">{SLOT_LABELS[meal.slot]}</h2>
        {group && !dirty && <span className="group">{group.name}</span>}
        {group && dirty && (
          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--primary)' }} onClick={onSaveToGroup}>
            {group.name}에 저장
          </button>
        )}
        {meal.items.length > 0 && <span className="kcal">{fmt(totals.kcal)} kcal</span>}
      </div>
      {meal.items.length === 0 ? (
        <p className="well-empty">비어 있음</p>
      ) : (
        <ul className="well-items">
          {meal.items.map((it) => {
            const f = foodMap.get(it.foodId)
            const kcal = f ? scale(f.nutrients, it.multiplier).kcal : 0
            const uneaten = settings.recordMode && it.eaten !== true
            return (
              <li key={it.id}>
                {settings.recordMode && <Check checked={it.eaten === true} onChange={(v) => onToggleEaten(it, v)} label={`${f?.name ?? '음식'} 먹음`} />}
                <button className={'name' + (uneaten ? ' uneaten' : '')} style={{ textAlign: 'left' }} onClick={() => onTapItem(it)}>
                  {f?.name ?? '삭제된 음식'}
                  {!it.planned && <span className="muted" style={{ fontSize: 12 }}> 추가</span>}
                </button>
                <span className="mult">{it.multiplier !== 1 ? multLabel(it.multiplier) : ''}</span>
                <span className="kcal">{fmt(kcal)}</span>
              </li>
            )
          })}
        </ul>
      )}
      <div className="well-add">
        <button className="btn btn-sm btn-ghost" onClick={onOpenPicker}>
          <IconPlus /> {meal.items.length === 0 ? '그룹 고르기 / 음식 찾기' : '추가'}
        </button>
      </div>
    </section>
  )
}
