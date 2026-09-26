import { useMemo, useState } from 'react'
import type { Food } from '../domain/types'
import { archiveFood, updateFood } from '../db/repo'
import { useFoods } from '../hooks/useData'
import { normalize } from '../data/foodDb'
import { FoodForm } from '../components/FoodForm'
import { Segmented, Sheet } from '../components/ui'
import { fmt } from '../components/format'
import { IconPlus, IconSearch, IconStar, IconTrash } from '../components/icons'
import { NUTRIENT_KEYS, NUTRIENT_LABELS, NUTRIENT_UNITS } from '../domain/nutrition'

type Filter = 'all' | 'favorite' | 'custom' | 'mfds'

export function FoodsScreen() {
  const foods = useFoods()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [editing, setEditing] = useState(false)

  const list = useMemo(() => {
    const nq = normalize(q)
    return foods
      .filter((f) => !f.archived)
      .filter((f) => (filter === 'favorite' ? f.favorite : filter === 'all' ? true : f.source === filter))
      .filter((f) => !nq || normalize(f.name + ' ' + (f.brand ?? '')).includes(nq))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || a.name.localeCompare(b.name, 'ko'))
  }, [foods, q, filter])

  const live = selected ? foods.find((f) => f.id === selected.id) ?? selected : null

  return (
    <div className="screen">
      <div className="topbar">
        <h1>음식</h1>
        <button className="btn btn-sm btn-primary" onClick={() => setCreating(true)}><IconPlus /> 직접 입력</button>
      </div>
      <div className="stack" style={{ marginTop: 8 }}>
        <div className="search">
          <IconSearch />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="내 음식에서 찾기" />
        </div>
        <Segmented value={filter} options={[{ value: 'all', label: '전체' }, { value: 'favorite', label: '즐겨찾기' }, { value: 'custom', label: '직접 입력' }, { value: 'mfds', label: '식약처' }]} onChange={setFilter} />
      </div>
      {list.length === 0 ? (
        <p className="empty">{foods.length === 0 ? '아직 음식이 없습니다.\n오늘 화면의 끼니 칸에서 검색해 넣으면 여기에 쌓입니다.' : '조건에 맞는 음식이 없습니다.'}</p>
      ) : (
        <ul className="list" style={{ marginTop: 8 }}>
          {list.map((f) => (
            <li key={f.id}>
              <button className="iconbtn" style={{ color: f.favorite ? 'var(--fat)' : undefined }} aria-label={f.favorite ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => updateFood(f.id, { favorite: !f.favorite })}>
                <IconStar filled={f.favorite} />
              </button>
              <button className="rowbtn" onClick={() => setSelected(f)} aria-label={f.name}>
                <span className="grow">
                  <span className="title">{f.name}</span>
                  <span className="sub">{f.brand ? f.brand + ' · ' : ''}{f.servingLabel}{f.source === 'mfds' ? ' · 식약처' : ''}</span>
                </span>
                <span className="kcal">{fmt(f.nutrients.kcal)} kcal</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && <FoodForm onClose={() => setCreating(false)} onSaved={() => setCreating(false)} />}
      {live && editing && <FoodForm initial={live} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
      {live && !editing && (
        <Sheet title={live.name} onClose={() => setSelected(null)}>
          <p className="muted" style={{ fontSize: 14 }}>{live.brand ? live.brand + ' · ' : ''}{live.servingLabel} 기준{live.servingGrams ? ` (${live.servingGrams}g)` : ''}{live.source === 'mfds' ? ' · 식약처 DB에서 복사' : ''}</p>
          <table className="nutri-table">
            <tbody>
              {NUTRIENT_KEYS.map((k) => (
                <tr key={k}>
                  <td className="sub">{NUTRIENT_LABELS[k]}</td>
                  <td>{live.nutrients[k] === undefined ? '-' : `${fmt(live.nutrients[k] ?? 0, 1)} ${NUTRIENT_UNITS[k]}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn btn-danger" onClick={async () => { if (confirm('이 음식을 목록에서 지울까요? 이미 넣어둔 식단에는 남아 있습니다.')) { await archiveFood(live.id); setSelected(null) } }}><IconTrash /> 지우기</button>
            <button className="btn btn-primary" onClick={() => setEditing(true)}>수정</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
