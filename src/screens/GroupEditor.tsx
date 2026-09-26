import { useState } from 'react'
import type { Food, GroupItem, MealGroup, MealSlotType } from '../domain/types'
import { SLOT_LABELS } from '../domain/types'
import { MULTIPLIER_STEPS } from '../domain/templates'
import { addGroup, deleteGroup, updateGroup } from '../db/repo'
import { useFoodMap } from '../hooks/useData'
import { scale, sumItems } from '../domain/nutrition'
import { FoodPicker } from '../components/FoodPicker'
import { Chips, Field, Sheet } from '../components/ui'
import { fmt, multLabel } from '../components/format'
import { IconPlus, IconTrash } from '../components/icons'
import { MacroBar } from '../components/MacroBar'

const SLOTS: (MealSlotType | 'none')[] = ['breakfast', 'lunch', 'dinner', 'snack', 'none']

/** 끼니 그룹 만들기 / 수정 시트 */
export function GroupEditor({ initial, onClose }: { initial?: MealGroup; onClose: () => void }) {
  const foodMap = useFoodMap()
  const [name, setName] = useState(initial?.name ?? '')
  const [slot, setSlot] = useState<MealSlotType | 'none'>(initial?.slotHint ?? 'none')
  const [items, setItems] = useState<GroupItem[]>(initial?.items ?? [])
  const [picking, setPicking] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const totals = sumItems(items, foodMap)
  const valid = name.trim() !== '' && items.length > 0

  async function save() {
    const data = { name: name.trim(), items, slotHint: slot === 'none' ? undefined : slot }
    if (initial) await updateGroup(initial.id, data)
    else await addGroup(data)
    onClose()
  }

  function addFood(f: Food) {
    setItems((p) => (p.some((i) => i.foodId === f.id) ? p : [...p, { foodId: f.id, multiplier: 1 }]))
    setPicking(false)
  }

  const editItem = editIdx !== null ? items[editIdx] : null
  const editFood = editItem ? foodMap.get(editItem.foodId) : undefined

  return (
    <Sheet title={initial ? '그룹 수정' : '새 끼니 그룹'} onClose={onClose} full>
      <div className="stack">
        <Field label="이름">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 평일 아침, 운동 후 저녁" autoFocus />
        </Field>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>주로 쓰는 끼니</div>
          <Chips value={slot} options={SLOTS.map((s) => ({ value: s, label: s === 'none' ? '상관없음' : SLOT_LABELS[s] }))} onChange={setSlot} />
        </div>
        <div className="section" style={{ marginTop: 8 }}>
          <div className="section-h"><h2>음식</h2>{items.length > 0 && <span className="muted" style={{ fontSize: 14 }}>{fmt(totals.kcal)} kcal</span>}</div>
          {items.length === 0 ? (
            <p className="empty">아직 음식이 없습니다. 아래에서 추가하세요.</p>
          ) : (
            <ul className="list">
              {items.map((it, idx) => {
                const f = foodMap.get(it.foodId)
                return (
                  <li key={it.foodId}>
                    <button className="rowbtn" onClick={() => setEditIdx(idx)} aria-label={f?.name ?? "음식"}>
                      <span className="grow">
                        <span className="title">{f?.name ?? '삭제된 음식'}</span>
                        <span className="sub">{f?.servingLabel}{it.multiplier !== 1 ? ' ' + multLabel(it.multiplier) : ''}</span>
                      </span>
                      <span className="kcal">{fmt(f ? scale(f.nutrients, it.multiplier).kcal : 0)} kcal</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setPicking(true)}><IconPlus /> 음식 추가</button>
        </div>
        {items.length > 0 && <MacroBar totals={totals} />}
        <div className="actions">
          {initial && (
            <button className="btn btn-danger" onClick={async () => { if (confirm('이 그룹을 지울까요? 이미 적용된 날은 그대로 남습니다.')) { await deleteGroup(initial.id); onClose() } }}><IconTrash /> 지우기</button>
          )}
          <button className="btn btn-primary" disabled={!valid} onClick={save}>{initial ? '저장' : '만들기'}</button>
        </div>
      </div>
      {picking && <FoodPicker title="그룹에 넣을 음식" onClose={() => setPicking(false)} onPickFood={addFood} />}
      {editItem && (
        <Sheet title={editFood?.name ?? '음식'} onClose={() => setEditIdx(null)}>
          <div className="stack">
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>양</div>
              <Chips value={editItem.multiplier} options={MULTIPLIER_STEPS.map((m) => ({ value: m, label: `×${m}` }))} onChange={(m) => setItems((p) => p.map((i, n) => (n === editIdx ? { ...i, multiplier: m } : i)))} />
            </div>
            <button className="btn btn-danger" onClick={() => { setItems((p) => p.filter((_, n) => n !== editIdx)); setEditIdx(null) }}><IconTrash /> 그룹에서 빼기</button>
          </div>
        </Sheet>
      )}
    </Sheet>
  )
}
