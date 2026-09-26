import { db } from './db'
import type { Food, MealGroup, WeekTemplate, DayPlan, Settings } from '../domain/types'

export interface BackupFile {
  app: 'meal-planner'
  version: 1
  exportedAt: string
  foods: Food[]
  groups: MealGroup[]
  weekTemplates: WeekTemplate[]
  days: DayPlan[]
  settings: Settings | undefined
}

export async function exportBackup(): Promise<BackupFile> {
  const [foods, groups, weekTemplates, days, settings] = await Promise.all([
    db.foods.toArray(),
    db.groups.toArray(),
    db.weekTemplates.toArray(),
    db.days.toArray(),
    db.settings.get('settings'),
  ])
  return { app: 'meal-planner', version: 1, exportedAt: new Date().toISOString(), foods, groups, weekTemplates, days, settings }
}

export function validateBackup(x: unknown): x is BackupFile {
  if (!x || typeof x !== 'object') return false
  const b = x as Partial<BackupFile>
  return b.app === 'meal-planner' && b.version === 1 && Array.isArray(b.foods) && Array.isArray(b.groups) && Array.isArray(b.weekTemplates) && Array.isArray(b.days)
}

/** 가져오기는 전체 교체. 합치기는 id 충돌 처리가 필요해 첫 버전에서는 하지 않는다. */
export async function importBackup(b: BackupFile): Promise<void> {
  await db.transaction('rw', [db.foods, db.groups, db.weekTemplates, db.days, db.settings], async () => {
    await Promise.all([db.foods.clear(), db.groups.clear(), db.weekTemplates.clear(), db.days.clear(), db.settings.clear()])
    await db.foods.bulkAdd(b.foods)
    await db.groups.bulkAdd(b.groups)
    await db.weekTemplates.bulkAdd(b.weekTemplates)
    await db.days.bulkAdd(b.days)
    if (b.settings) await db.settings.put(b.settings)
  })
}

export function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
