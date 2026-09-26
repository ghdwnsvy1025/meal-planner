import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db/db'
import { DEFAULT_SETTINGS, type Food, type Settings } from '../domain/types'

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('settings'), [])
  return useMemo(() => (s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS), [s])
}

export function useFoods(): Food[] {
  return useLiveQuery(() => db.foods.toArray(), []) ?? []
}

export function useFoodMap(): Map<string, Food> {
  const foods = useFoods()
  return useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])
}

export function useGroups() {
  return useLiveQuery(() => db.groups.toArray(), []) ?? []
}

export function useWeekTemplates() {
  return useLiveQuery(() => db.weekTemplates.toArray(), []) ?? []
}

export function useDay(date: string) {
  return useLiveQuery(() => db.days.get(date), [date])
}

export function useDaysInRange(from: string, to: string) {
  const rows = useLiveQuery(() => db.days.where('date').between(from, to, true, true).toArray(), [from, to])
  return useMemo(() => new Map((rows ?? []).map((r) => [r.date, r])), [rows])
}
