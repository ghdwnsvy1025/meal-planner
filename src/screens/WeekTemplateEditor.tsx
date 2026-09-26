import { useState } from 'react'
import type { MealSlotType, WeekTemplate, WeekTemplateSlot } from '../domain/types'
import { SLOT_LABELS } from '../domain/types'
import { WEEKDAY_SHORT_KO, weekStart, addDays, today, dateRange } from '../domain/dates'
import { emptyWeekTemplate } from '../domain/templates'
import { addWeekTemplate, applyWeekTemplateToDates, deleteWeekTemplate, updateWeekTemplate } from '../db/repo'
import { useGroups, useSettings } from '../hooks/useData'
import { Field, Sheet, Switch } from '../components/ui'
import { IconTrash } from '../components/icons'

const ALL_SLOTS: MealSlotType[] = ['breakfast', 'lunch', 'dinner', 'snack']

/** 주간 그룹 만들기 / 수정. 요일 × 끼니 격자에서 칸을 탭해 끼니 그룹을 고른다. */
export function WeekTemplateEditor({ initial, onClose }: { initial?: WeekTemplate; onClose: () => void }) {
  const settings = useSettings()
  const groups = useGroups()
  const [t, setT] = useState<WeekTemplate>(() => initial ?? emptyWeekTemplate('', settings.defaultSlots))
  const [cell, setCell] = useState<{ day: number; slot: MealSlotType } | null>(null)
  const [applied, setApplied] = useState(false)
  const dayLabels = settings.weekStartsOn === 'sunday' ? ['일', '월', '화', '수', '목', '금', '토'] : WEEKDAY_SHORT_KO
  const slots = ALL_SLOTS.filter((s) => s !== 'snack' || t.days.some((d) => d.some((x) => x.slot === 'snack')))
  const groupMap = new Map(groups.map((g) => [g.id, g]))
  const valid = t.name.trim() !== ''

  function getCell(day: number, slot: MealSlotType): WeekTemplateSlot | undefined {
    return t.days[day].find((x) => x.slot === slot)
  }
  function setCellGroup(day: number, slot: MealSlotType, groupId: string | null) {
    setT((p) => {
      const days = p.days.map((d, i) => {
        if (i !== day) return d
        const has = d.some((x) => x.slot === slot)
        if (has) return d.map((x) => (x.slot === slot ? { ...x, groupId } : x))
        return [...d, { slot, groupId }]
      })
      return { ...p, days }
    })
    setCell(null)
  }
  function addSnackRow() {
    setT((p) => ({ ...p, days: p.days.map((d) => (d.some((x) => x.slot === 'snack') ? d : [...d, { slot: 'snack', groupId: null }])) }))
  }

  async function save() {
    const data = { ...t, name: t.name.trim(), updatedAt: Date.now() }
    if (initial) await updateWeekTemplate(initial.id, data)
    else await addWeekTemplate(data)
    onClose()
  }

  async function applyThisWeek() {
    if (!initial) return
    const start = weekStart(today(), settings.weekStartsOn)
    const dates = dateRange(today(), addDays(start, 6))
    if (!confirm(`오늘부터 이번 주 끝까지(${dates.length}일) 이 주간 그룹으로 다시 채웁니다. 이미 넣어둔 계획은 바뀝니다.`)) return
    await applyWeekTemplateToDates(dates, initial.id)
    setApplied(true)
  }

  return (
    <Sheet title={initial ? '주간 그룹 수정' : '새 주간 그룹'} onClose={onClose} full>
      <div className="stack">
        <Field label="이름">
          <input className="input" value={t.name} onChange={(e) => setT((p) => ({ ...p, name: e.target.value }))} placeholder="예: 평소 주간, 다이어트 주간" autoFocus />
        </Field>
        <div className="list">
          <li>
            <span className="grow">
              <span className="title">기본 주간 그룹</span>
              <span className="sub">새로 여는 날이 이 배치로 자동으로 채워짐</span>
            </span>
            <Switch checked={t.isDefault} onChange={(v) => setT((p) => ({ ...p, isDefault: v }))} label="기본 주간 그룹" />
          </li>
        </div>
        {groups.length === 0 && <p className="empty">끼니 그룹이 아직 없어서 칸을 채울 수 없습니다. 먼저 끼니 그룹을 만드세요.</p>}
        <div className="week" role="grid">
          <div />
          {dayLabels.map((d) => <div key={d} className="hd">{d}</div>)}
          {slots.map((slot) => (
            <div key={slot} style={{ display: 'contents' }}>
              <div className="slot-lbl">{SLOT_LABELS[slot]}</div>
              {t.days.map((_, day) => {
                const c = getCell(day, slot)
                const g = c?.groupId ? groupMap.get(c.groupId) : undefined
                return (
                  <button key={day} className={'cell' + (g ? '' : ' empty')} onClick={() => setCell({ day, slot })} aria-label={`${dayLabels[day]} ${SLOT_LABELS[slot]}`}>
                    {g ? g.name : '+'}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {!slots.includes('snack') && <button className="btn btn-ghost btn-sm" onClick={addSnackRow}>간식 줄 추가</button>}
        <div className="actions">
          {initial && (
            <button className="btn btn-danger" onClick={async () => { if (confirm('이 주간 그룹을 지울까요?')) { await deleteWeekTemplate(initial.id); onClose() } }}><IconTrash /></button>
          )}
          {initial && <button className="btn" onClick={applyThisWeek}>{applied ? '이번 주에 적용됨' : '이번 주에 적용'}</button>}
          <button className="btn btn-primary" disabled={!valid} onClick={save}>{initial ? '저장' : '만들기'}</button>
        </div>
      </div>
      {cell && (
        <Sheet title={`${dayLabels[cell.day]}요일 ${SLOT_LABELS[cell.slot]}`} onClose={() => setCell(null)}>
          <ul className="list">
            <li><button className="rowbtn muted" onClick={() => setCellGroup(cell.day, cell.slot, null)}>비워두기</button></li>
            {groups.map((g) => (
              <li key={g.id}><button className="rowbtn" onClick={() => setCellGroup(cell.day, cell.slot, g.id)} aria-label={g.name}><span className="grow"><span className="title">{g.name}</span><span className="sub">{g.items.length}가지</span></span></button></li>
            ))}
          </ul>
        </Sheet>
      )}
    </Sheet>
  )
}
