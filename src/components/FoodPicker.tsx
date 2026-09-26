import { useEffect, useMemo, useState } from 'react'
import type { Food, FoodDbEntry, MealGroup } from '../domain/types'
import { importFoodFromDb } from '../db/repo'
import { searchFoodDb, normalize, isFoodDbLoaded } from '../data/foodDb'
import { useFoods, useGroups } from '../hooks/useData'
import { sumItems } from '../domain/nutrition'
import { useFoodMap } from '../hooks/useData'
import { IconSearch, IconPlus } from './icons'
import { Sheet } from './ui'
import { fmt } from './format'
import { FoodForm } from './FoodForm'

interface Props {
  title: string
  onClose: () => void
  onPickFood: (f: Food) => void
  /** 주면 상단에 자주 쓰는 그룹 타일이 뜬다 */
  onPickGroup?: (g: MealGroup) => void
}

/**
 * 끼니 칸을 탭했을 때 뜨는 시트.
 * 위: 자주 쓰는 그룹 (있을 때만). 아래: 검색 — 내 음식이 먼저, 식약처 DB가 그 다음.
 */
export function FoodPicker({ title, onClose, onPickFood, onPickGroup }: Props) {
  const foods = useFoods()
  const foodMap = useFoodMap()
  const groups = useGroups()
  const [q, setQ] = useState('')
  const [dbResultsRaw, setDbResults] = useState<FoodDbEntry[]>([])
  const [dbState, setDbState] = useState<'idle' | 'loading' | 'downloading' | 'error'>('idle')
  const [creating, setCreating] = useState(false)

  const nq = normalize(q)
  const dbResults = nq ? dbResultsRaw : []
  const mine = useMemo(() => {
    const live = foods.filter((f) => !f.archived)
    if (!nq) return [...live].sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || b.useCount - a.useCount).slice(0, 12)
    return live.filter((f) => normalize(f.name + ' ' + (f.brand ?? '')).includes(nq)).slice(0, 30)
  }, [foods, nq])
  const myCodes = useMemo(() => new Set(foods.filter((f) => f.sourceCode).map((f) => f.sourceCode)), [foods])

  useEffect(() => {
    if (nq.length < 1) return
    let alive = true
    const t = setTimeout(async () => {
      setDbState('loading')
      try {
        // 음식 DB(작음)를 먼저 보여주고, 가공식품 DB(큼)는 뒤이어 붙인다
        const dish = await searchFoodDb(q, 'dish', 15)
        if (!alive) return
        setDbResults(dish.filter((e) => !myCodes.has(e.code)))
        if (!isFoodDbLoaded('processed')) setDbState('downloading')
        const processed = await searchFoodDb(q, 'processed', 30)
        if (!alive) return
        setDbResults([...dish, ...processed].filter((e) => !myCodes.has(e.code)))
        setDbState('idle')
      } catch {
        if (alive) setDbState('error')
      }
    }, 180)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q, nq, myCodes])

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || b.useCount - a.useCount).slice(0, 6), [groups])

  async function pickDb(e: FoodDbEntry) {
    onPickFood(await importFoodFromDb(e))
  }

  return (
    <Sheet title={title} onClose={onClose} full>
      {creating && (
        <FoodForm presetName={q} onClose={() => setCreating(false)} onSaved={(f) => { setCreating(false); onPickFood(f) }} />
      )}
      {onPickGroup && sortedGroups.length > 0 && !nq && (
        <div className="section" style={{ marginTop: 4 }}>
          <div className="section-h"><h2>자주 쓰는 그룹</h2></div>
          <div className="group-grid">
            {sortedGroups.map((g) => (
              <button key={g.id} className="group-tile" onClick={() => onPickGroup(g)}>
                <span className="name">{g.name}</span>
                <span className="sub">{g.items.length}가지 · {fmt(sumItems(g.items, foodMap).kcal)} kcal</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="section" style={{ marginTop: onPickGroup && sortedGroups.length && !nq ? 20 : 4 }}>
        <div className="search">
          <IconSearch />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="음식 이름이나 제조사" autoFocus enterKeyHint="search" />
        </div>
      </div>
      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-h"><h2>{nq ? '내 음식' : '최근 쓴 음식'}</h2></div>
        {mine.length === 0 ? (
          <p className="empty">{nq ? '내 음식에는 없습니다.' : '아직 등록한 음식이 없습니다. 검색하거나 직접 입력하세요.'}</p>
        ) : (
          <ul className="list">
            {mine.map((f) => (
              <li key={f.id}>
                <button className="rowbtn" onClick={() => onPickFood(f)} aria-label={`${f.name} ${fmt(f.nutrients.kcal)} kcal`}>
                  <span className="grow">
                    <span className="title">{f.name}</span>
                    <span className="sub">{f.brand ? f.brand + ' · ' : ''}{f.servingLabel}</span>
                  </span>
                  <span className="kcal">{fmt(f.nutrients.kcal)} kcal</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {nq && (
        <div className="section">
          <div className="section-h"><h2>식약처 DB</h2>{dbState === 'loading' && <span className="muted" style={{ fontSize: 13 }}>찾는 중</span>}{dbState === 'downloading' && <span className="muted" style={{ fontSize: 13 }}>가공식품 DB 내려받는 중 (처음 한 번)</span>}</div>
          {dbState === 'error' ? (
            <p className="empty">식약처 DB를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 검색하세요.</p>
          ) : dbResults.length === 0 && (dbState === 'idle' || dbState === 'downloading') ? (
            <p className="empty">{dbState === 'downloading' ? '가공식품 DB를 처음 한 번 내려받는 중입니다. 잠시 기다리세요.' : 'DB에 없습니다. 아래에서 직접 입력하세요.'}</p>
          ) : (
            <ul className="list">
              {dbResults.map((e) => (
                <li key={e.code}>
                  <button className="rowbtn" onClick={() => pickDb(e)} aria-label={`${e.name}${e.brand ? " " + e.brand : ""} ${fmt(e.nutrients.kcal)} kcal`}>
                    <span className="grow">
                      <span className="title">{e.name}</span>
                      <span className="sub">{e.brand ? e.brand + ' · ' : ''}{e.servingLabel}</span>
                    </span>
                    <span className="kcal">{fmt(e.nutrients.kcal)} kcal</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="section">
        <button className="btn btn-block" onClick={() => setCreating(true)}><IconPlus /> {nq ? `"${q}" 직접 입력` : '음식 직접 입력'}</button>
      </div>
    </Sheet>
  )
}
