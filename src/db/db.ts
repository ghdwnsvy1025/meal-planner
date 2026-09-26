import Dexie, { type EntityTable } from 'dexie'
import type { Food, MealGroup, WeekTemplate, DayPlan, Settings } from '../domain/types'

export class MealDb extends Dexie {
  foods!: EntityTable<Food, 'id'>
  groups!: EntityTable<MealGroup, 'id'>
  weekTemplates!: EntityTable<WeekTemplate, 'id'>
  days!: EntityTable<DayPlan, 'date'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('meal-planner')
    this.version(1).stores({
      foods: 'id, name, source, favorite, archived, useCount, lastUsedAt',
      groups: 'id, name, slotHint, useCount, lastUsedAt',
      weekTemplates: 'id, name, isDefault',
      days: 'date',
      settings: 'id',
    })
  }
}

export const db = new MealDb()
