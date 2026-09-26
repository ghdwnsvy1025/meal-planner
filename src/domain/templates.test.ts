import { describe, it, expect } from 'vitest'
import { applyGroupToMeal, dayFromWeekTemplate, groupFromMeal, emptyWeekTemplate, markAllEaten, emptyMeal } from './templates'
import type { MealGroup } from './types'

const g: MealGroup = { id: 'g1', name: 'breakfast set', items: [{ foodId: 'rice', multiplier: 1 }, { foodId: 'egg', multiplier: 2 }], useCount: 0, createdAt: 0, updatedAt: 0 }

describe('applyGroupToMeal', () => {
  it('copies items as planned and keeps extras', () => {
    const meal = { ...emptyMeal('breakfast'), items: [{ id: 'x', foodId: 'milk', multiplier: 1, planned: false, eaten: true }, { id: 'y', foodId: 'old', multiplier: 1, planned: true }] }
    const out = applyGroupToMeal(meal, g)
    expect(out.groupId).toBe('g1')
    expect(out.items.map((i) => i.foodId)).toEqual(['rice', 'egg', 'milk'])
    expect(out.items[0].planned).toBe(true)
    expect(out.items[2].planned).toBe(false)
  })
})

describe('dayFromWeekTemplate', () => {
  it('fills the weekday slots from the template (2026-09-28 is a Monday)', () => {
    const t = emptyWeekTemplate('base', ['breakfast', 'lunch', 'dinner'])
    t.days[0][0].groupId = 'g1'
    const day = dayFromWeekTemplate('2026-09-28', t, new Map([['g1', g]]), { weekStartsOn: 'monday', defaultSlots: ['breakfast', 'lunch', 'dinner'] })
    expect(day.meals).toHaveLength(3)
    expect(day.meals[0].items).toHaveLength(2)
    expect(day.meals[1].items).toHaveLength(0)
    expect(day.weekTemplateId).toBe(t.id)
  })
  it('respects sunday week start (2026-09-27 is a Sunday)', () => {
    const t = emptyWeekTemplate('base', ['lunch'])
    t.days[0][0].groupId = 'g1'
    const day = dayFromWeekTemplate('2026-09-27', t, new Map([['g1', g]]), { weekStartsOn: 'sunday', defaultSlots: ['lunch'] })
    expect(day.meals[0].items).toHaveLength(2)
  })
})

describe('groupFromMeal', () => {
  it('writes planned items back, drops extras', () => {
    const meal = { ...emptyMeal('lunch'), items: [{ id: 'a', foodId: 'rice', multiplier: 0.5, planned: true }, { id: 'b', foodId: 'egg', multiplier: 1, planned: false }] }
    const out = groupFromMeal(g, meal)
    expect(out.items).toEqual([{ foodId: 'rice', multiplier: 0.5 }])
  })
})

describe('markAllEaten', () => {
  it('checks planned items only', () => {
    const day = { date: '2026-09-26', updatedAt: 0, meals: [{ ...emptyMeal('lunch'), items: [{ id: 'a', foodId: 'rice', multiplier: 1, planned: true }, { id: 'b', foodId: 'egg', multiplier: 1, planned: false }] }] }
    const out = markAllEaten(day)
    expect(out.meals[0].items[0].eaten).toBe(true)
    expect(out.meals[0].items[1].eaten).toBeUndefined()
  })
})
