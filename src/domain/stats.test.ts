import { describe, it, expect } from 'vitest'
import { computePeriodStats, dayTotals, selectItems } from './stats'
import type { DayPlan, Food } from './types'

function food(id: string, nutrients: Food['nutrients']): Food {
  return { id, name: id, servingLabel: '1', nutrients, source: 'custom', favorite: false, archived: false, useCount: 0, createdAt: 0, updatedAt: 0 }
}

const foods = new Map<string, Food>([
  ['rice', food('rice', { kcal: 300, carb: 65, protein: 6, fat: 1, sugar: 0 })],
  ['egg', food('egg', { kcal: 70, carb: 0, protein: 6, fat: 5, sugar: 0, sodium: 60 })],
])

function plan(date: string, items: { foodId: string; multiplier: number; planned: boolean; eaten?: boolean }[]): DayPlan {
  return { date, meals: [{ id: 'm', slot: 'lunch', items: items.map((i, n) => ({ id: String(n), ...i })) }], updatedAt: 0 }
}

describe('selectItems', () => {
  const items = [
    { id: 'a', foodId: 'rice', multiplier: 1, planned: true },
    { id: 'b', foodId: 'egg', multiplier: 2, planned: true, eaten: true },
    { id: 'c', foodId: 'egg', multiplier: 1, planned: false, eaten: true },
  ]
  it('record mode off: planned only, regardless of eaten', () => {
    expect(selectItems(items, { recordMode: false }, 'actual').map((i) => i.id)).toEqual(['a', 'b'])
  })
  it('record mode on, actual basis: eaten only, including extras', () => {
    expect(selectItems(items, { recordMode: true }, 'actual').map((i) => i.id)).toEqual(['b', 'c'])
  })
  it('record mode on, planned basis: planned only', () => {
    expect(selectItems(items, { recordMode: true }, 'planned').map((i) => i.id)).toEqual(['a', 'b'])
  })
})

describe('dayTotals', () => {
  it('scales by multiplier and sums, sodium defaults to 0', () => {
    const p = plan('2026-09-26', [
      { foodId: 'rice', multiplier: 1.5, planned: true },
      { foodId: 'egg', multiplier: 2, planned: true },
    ])
    const t = dayTotals(p, foods, { recordMode: false }, 'actual')
    expect(t.kcal).toBe(300 * 1.5 + 140)
    expect(t.protein).toBe(9 + 12)
    expect(t.sodium).toBe(120)
  })
  it('ignores unknown foods', () => {
    const p = plan('2026-09-26', [{ foodId: 'nope', multiplier: 1, planned: true }])
    expect(dayTotals(p, foods, { recordMode: false }, 'actual').kcal).toBe(0)
  })
})

describe('computePeriodStats', () => {
  const plans = new Map<string, DayPlan>([
    ['2026-09-21', plan('2026-09-21', [{ foodId: 'rice', multiplier: 6, planned: true }])],
    ['2026-09-22', plan('2026-09-22', [{ foodId: 'rice', multiplier: 8, planned: true }])],
    ['2026-09-24', plan('2026-09-24', [])],
  ])
  const settings = { recordMode: false, goalKcal: 2000 }
  it('averages over recorded days only and counts goal hits within tolerance', () => {
    const s = computePeriodStats('2026-09-21', '2026-09-27', plans, foods, settings, 'actual')
    expect(s.days).toHaveLength(7)
    expect(s.recordedDays).toBe(2)
    expect(s.avg.kcal).toBe(2100)
    expect(s.goalHitDays).toBe(1)
    expect(s.goalHitRate).toBe(0.5)
    expect(s.days[3].recorded).toBe(false)
  })
  it('returns zeros when nothing is recorded', () => {
    const s = computePeriodStats('2026-10-01', '2026-10-07', plans, foods, settings, 'actual')
    expect(s.recordedDays).toBe(0)
    expect(s.avg.kcal).toBe(0)
    expect(s.goalHitRate).toBe(0)
  })
})
