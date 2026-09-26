import { useState } from 'react'
import type { MealGroup, WeekTemplate } from '../domain/types'
import { SLOT_LABELS } from '../domain/types'
import { sumItems } from '../domain/nutrition'
import { useFoodMap, useGroups, useWeekTemplates } from '../hooks/useData'
import { GroupEditor } from './GroupEditor'
import { WeekTemplateEditor } from './WeekTemplateEditor'
import { fmt } from '../components/format'
import { IconPlus } from '../components/icons'

export function GroupsScreen() {
  const groups = useGroups()
  const templates = useWeekTemplates()
  const foodMap = useFoodMap()
  const [editGroup, setEditGroup] = useState<MealGroup | 'new' | null>(null)
  const [editWeek, setEditWeek] = useState<WeekTemplate | 'new' | null>(null)

  const sorted = [...groups].sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || b.useCount - a.useCount || a.name.localeCompare(b.name, 'ko'))

  return (
    <div className="screen">
      <div className="topbar"><h1>그룹</h1></div>

      <div className="section" style={{ marginTop: 4 }}>
        <div className="section-h">
          <h2>끼니 그룹</h2>
          <button className="btn btn-sm" onClick={() => setEditGroup('new')}><IconPlus /> 새 그룹</button>
        </div>
        {sorted.length === 0 ? (
          <p className="empty">자주 먹는 한 끼를 그룹으로 묶어 두면, 오늘 화면에서 한 번에 넣을 수 있습니다.</p>
        ) : (
          <ul className="list">
            {sorted.map((g) => {
              const names = g.items.map((i) => foodMap.get(i.foodId)?.name ?? '?').join(', ')
              return (
                <li key={g.id}>
                  <button className="rowbtn" onClick={() => setEditGroup(g)} aria-label={g.name}>
                    <span className="grow">
                      <span className="title">{g.name}{g.slotHint && <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> · {SLOT_LABELS[g.slotHint]}</span>}</span>
                      <span className="sub">{names}</span>
                    </span>
                    <span className="kcal">{fmt(sumItems(g.items, foodMap).kcal)} kcal</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="section">
        <div className="section-h">
          <h2>주간 그룹</h2>
          <button className="btn btn-sm" onClick={() => setEditWeek('new')} disabled={groups.length === 0}><IconPlus /> 새 주간</button>
        </div>
        {templates.length === 0 ? (
          <p className="empty">요일마다 어떤 끼니 그룹을 쓸지 정해 두면, 하루가 저절로 채워집니다.{groups.length === 0 ? ' 먼저 끼니 그룹을 만드세요.' : ''}</p>
        ) : (
          <ul className="list">
            {templates.map((t) => {
              const filled = t.days.reduce((n, d) => n + d.filter((s) => s.groupId).length, 0)
              return (
                <li key={t.id}>
                  <button className="rowbtn" onClick={() => setEditWeek(t)} aria-label={t.name}>
                    <span className="grow">
                      <span className="title">{t.name} {t.isDefault && <span className="default-tag">기본</span>}</span>
                      <span className="sub">{filled}칸 채움</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {editGroup && <GroupEditor initial={editGroup === 'new' ? undefined : editGroup} onClose={() => setEditGroup(null)} />}
      {editWeek && <WeekTemplateEditor initial={editWeek === 'new' ? undefined : editWeek} onClose={() => setEditWeek(null)} />}
    </div>
  )
}
