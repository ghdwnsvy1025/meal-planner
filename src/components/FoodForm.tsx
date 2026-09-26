import { useState, type FormEvent } from 'react'
import type { Food } from '../domain/types'
import { addCustomFood, updateFood } from '../db/repo'
import { Field, NumInput, Sheet } from './ui'

interface Draft {
  name: string
  brand: string
  servingLabel: string
  servingGrams?: number
  kcal?: number
  carb?: number
  protein?: number
  fat?: number
  sugar?: number
  sodium?: number
}

function fromFood(f?: Food, presetName?: string): Draft {
  if (!f) return { name: presetName ?? '', brand: '', servingLabel: '1인분' }
  return {
    name: f.name,
    brand: f.brand ?? '',
    servingLabel: f.servingLabel,
    servingGrams: f.servingGrams,
    kcal: f.nutrients.kcal,
    carb: f.nutrients.carb,
    protein: f.nutrients.protein,
    fat: f.nutrients.fat,
    sugar: f.nutrients.sugar,
    sodium: f.nutrients.sodium,
  }
}

/** 음식 직접 입력 / 수정 시트 */
export function FoodForm({ initial, presetName, onSaved, onClose }: { initial?: Food; presetName?: string; onSaved: (f: Food) => void; onClose: () => void }) {
  const [d, setD] = useState<Draft>(() => fromFood(initial, presetName))
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const valid = d.name.trim() !== '' && d.servingLabel.trim() !== '' && d.kcal !== undefined

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    const nutrients = { kcal: d.kcal ?? 0, carb: d.carb ?? 0, protein: d.protein ?? 0, fat: d.fat ?? 0, sugar: d.sugar ?? 0, sodium: d.sodium }
    const base = { name: d.name.trim(), brand: d.brand.trim() || undefined, servingLabel: d.servingLabel.trim(), servingGrams: d.servingGrams, nutrients }
    if (initial) {
      await updateFood(initial.id, base)
      onSaved({ ...initial, ...base })
    } else {
      onSaved(await addCustomFood(base))
    }
    setBusy(false)
  }

  return (
    <Sheet title={initial ? '음식 수정' : '음식 직접 입력'} onClose={onClose} full>
      <form className="stack" onSubmit={submit}>
        <Field label="이름">
          <input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 닭가슴살 볶음밥" autoFocus required />
        </Field>
        <Field label="제조사 (선택)">
          <input className="input" value={d.brand} onChange={(e) => set('brand', e.target.value)} placeholder="시중 제품이면 적어두면 찾기 쉬움" />
        </Field>
        <div className="row-fields">
          <Field label="기준량" hint="아래 영양소는 이 양 기준">
            <input className="input" value={d.servingLabel} onChange={(e) => set('servingLabel', e.target.value)} placeholder="1인분 / 1개 / 100g" required />
          </Field>
          <Field label="그램 (선택)">
            <NumInput value={d.servingGrams} onChange={(v) => set('servingGrams', v)} placeholder="g" />
          </Field>
        </div>
        <Field label="칼로리 (kcal)">
          <NumInput value={d.kcal} onChange={(v) => set('kcal', v)} placeholder="0" required />
        </Field>
        <div className="row-fields">
          <Field label="탄수화물 (g)"><NumInput value={d.carb} onChange={(v) => set('carb', v)} placeholder="0" /></Field>
          <Field label="단백질 (g)"><NumInput value={d.protein} onChange={(v) => set('protein', v)} placeholder="0" /></Field>
          <Field label="지방 (g)"><NumInput value={d.fat} onChange={(v) => set('fat', v)} placeholder="0" /></Field>
          <Field label="당류 (g)"><NumInput value={d.sugar} onChange={(v) => set('sugar', v)} placeholder="0" /></Field>
        </div>
        <Field label="나트륨 (mg, 선택)">
          <NumInput value={d.sodium} onChange={(v) => set('sodium', v)} placeholder="비워도 됨" />
        </Field>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={!valid || busy}>{initial ? '저장' : '추가'}</button>
        </div>
      </form>
    </Sheet>
  )
}
