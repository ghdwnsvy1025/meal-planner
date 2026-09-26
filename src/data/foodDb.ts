import type { FoodDbEntry } from '../domain/types'

/**
 * 내장 식약처 DB 검색.
 * scripts/build-food-db.mjs 가 만든 압축 배열 형식:
 * [code, name, brand, kind, servingLabel, servingGrams, kcal, carb, protein, fat, sugar, sodium]
 *
 * 음식(food-db-dish.json, 약 1.6MB)은 처음 검색할 때 바로 읽고,
 * 가공식품(food-db-processed.json, 약 35MB)은 크기 때문에 따로 요청할 때만 내려받는다.
 */
type Row = [string, string, string, 'p' | 'd', string, number | null, number, number, number, number, number, number | null]

export type DbKind = 'dish' | 'processed'

interface Loaded {
  entries: FoodDbEntry[]
  /** 소문자 + 공백 제거한 검색용 문자열 (name + brand) */
  keys: string[]
}

const cache: Partial<Record<DbKind, Loaded>> = {}
const pending: Partial<Record<DbKind, Promise<Loaded>>> = {}

export function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

function rowToEntry(r: Row): FoodDbEntry {
  return {
    code: r[0],
    name: r[1],
    brand: r[2] || undefined,
    kind: r[3] === 'p' ? 'processed' : 'dish',
    servingLabel: r[4],
    servingGrams: r[5] ?? undefined,
    nutrients: { kcal: r[6], carb: r[7], protein: r[8], fat: r[9], sugar: r[10], sodium: r[11] ?? undefined },
  }
}

export function loadFoodDb(kind: DbKind): Promise<Loaded> {
  const hit = cache[kind]
  if (hit) return Promise.resolve(hit)
  const inflight = pending[kind]
  if (inflight) return inflight
  const p = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}food-db-${kind}.json`)
    if (!res.ok) throw new Error(`food-db-${kind}.json 로드 실패: ${res.status}`)
    const rows = (await res.json()) as Row[]
    const entries = rows.map(rowToEntry)
    const keys = entries.map((e) => normalize(e.name + ' ' + (e.brand ?? '')))
    const loaded = { entries, keys }
    cache[kind] = loaded
    return loaded
  })()
  pending[kind] = p
  p.catch(() => {
    delete pending[kind]
  })
  return p
}

export function isFoodDbLoaded(kind: DbKind): boolean {
  return cache[kind] !== undefined
}

/** 이름 또는 제조사 부분 일치. 이름 앞부분 일치 → 이름 포함 → 제조사 포함 순. */
export async function searchFoodDb(query: string, kind: DbKind, limit = 30): Promise<FoodDbEntry[]> {
  const q = normalize(query)
  if (!q) return []
  const { entries, keys } = await loadFoodDb(kind)
  const scored: { e: FoodDbEntry; score: number }[] = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const nameKey = normalize(e.name)
    let score: number
    if (nameKey.startsWith(q)) score = 0
    else if (nameKey.includes(q)) score = 1
    else if (keys[i].includes(q)) score = 2
    else continue
    scored.push({ e, score: score * 1000 + Math.min(nameKey.length, 999) })
  }
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((s) => s.e)
}
