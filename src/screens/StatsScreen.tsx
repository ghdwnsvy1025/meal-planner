import { useMemo, useState } from 'react'
import { addDays, monthEnd, monthStart, today, weekStart, fromISODate, weekdayLabel } from '../domain/dates'
import { computePeriodStats, dayTotals } from '../domain/stats'
import { NUTRIENT_KEYS, NUTRIENT_LABELS, NUTRIENT_UNITS, macroGoalGrams } from '../domain/nutrition'
import { useDaysInRange, useFoodMap, useSettings } from '../hooks/useData'
import { MacroBar } from '../components/MacroBar'
import { Segmented } from '../components/ui'
import { fmt } from '../components/format'
import { IconChevronL, IconChevronR } from '../components/icons'
import { TrendChart } from '../components/TrendChart'

type Period = 'day' | 'week' | 'month'

export function StatsScreen() {
  const settings = useSettings()
  const foodMap = useFoodMap()
  const [period, setPeriod] = useState<Period>('day')
  const [anchor, setAnchor] = useState(today())

  const [from, to] = useMemo(() => {
    if (period === 'day') return [anchor, anchor]
    if (period === 'week') {
      const s = weekStart(anchor, settings.weekStartsOn)
      return [s, addDays(s, 6)]
    }
    return [monthStart(anchor), monthEnd(anchor)]
  }, [period, anchor, settings.weekStartsOn])

  const plans = useDaysInRange(from, to)
  const stats = useMemo(() => computePeriodStats(from, to, plans, foodMap, settings, settings.statsBasis), [from, to, plans, foodMap, settings])
  const goalG = macroGoalGrams(settings.goalKcal, settings.macroRatio)

  function move(n: number) {
    if (period === 'day') setAnchor(addDays(anchor, n))
    else if (period === 'week') setAnchor(addDays(anchor, 7 * n))
    else {
      const d = fromISODate(monthStart(anchor))
      d.setMonth(d.getMonth() + n)
      setAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    }
  }

  const f = fromISODate(from)
  const t = fromISODate(to)
  const title = period === 'day'
    ? `${f.getMonth() + 1}월 ${f.getDate()}일 ${weekdayLabel(from)}요일`
    : period === 'week'
      ? `${f.getMonth() + 1}월 ${f.getDate()}일 – ${t.getMonth() + 1}월 ${t.getDate()}일`
      : `${f.getFullYear()}년 ${f.getMonth() + 1}월`

  const isDay = period === 'day'
  const dayT = isDay ? dayTotals(plans.get(anchor), foodMap, settings, settings.statsBasis) : stats.avg
  const nothing = isDay ? !stats.days[0]?.recorded : stats.recordedDays === 0
  const basisNote = settings.recordMode ? (settings.statsBasis === 'actual' ? '먹은 것 기준' : '계획 기준') : ''

  return (
    <div className="screen">
      <div className="topbar">
        <h1>통계</h1>
        <Segmented value={period} options={[{ value: 'day', label: '하루' }, { value: 'week', label: '주간' }, { value: 'month', label: '월간' }]} onChange={(p) => { setPeriod(p); setAnchor(today()) }} />
      </div>
      <div className="day-head" style={{ marginTop: 8 }}>
        <h2 className="display" style={{ fontSize: 20 }}>{title}</h2>
        <div className="day-nav">
          <button className="iconbtn" aria-label="이전" onClick={() => move(-1)}><IconChevronL /></button>
          {anchor !== today() && <button className="btn btn-sm" onClick={() => setAnchor(today())}>오늘</button>}
          <button className="iconbtn" aria-label="다음" onClick={() => move(1)}><IconChevronR /></button>
        </div>
      </div>

      {nothing ? (
        <p className="empty">이 기간에는 기록된 날이 없습니다.<br />오늘 화면에서 끼니를 채우면 여기에 나타납니다.</p>
      ) : (
        <>
          <div className="summary">
            <div className="summary-kcal">
              <span className={'stat-big' + (dayT.kcal > settings.goalKcal * 1.1 ? ' danger' : '')}>{fmt(dayT.kcal)}</span>
              <span className="goal">kcal{isDay ? '' : ' 일평균'} / 목표 {fmt(settings.goalKcal)}{basisNote ? ' · ' + basisNote : ''}</span>
            </div>
            <div style={{ marginTop: 12 }}><MacroBar totals={dayT} /></div>
          </div>

          {!isDay && (
            <div className="stat-grid">
              <div><div className="k">기록한 날</div><div className="v">{stats.recordedDays}<span className="muted" style={{ fontSize: 14 }}> / {stats.days.length}</span></div></div>
              <div><div className="k">목표 달성</div><div className="v">{stats.goalHitDays}일</div></div>
              <div><div className="k">달성률</div><div className="v">{Math.round(stats.goalHitRate * 100)}%</div></div>
            </div>
          )}

          {!isDay && (
            <div className="section">
              <div className="section-h"><h2>날짜별 칼로리</h2><span className="muted" style={{ fontSize: 13 }}>점선은 목표</span></div>
              <TrendChart days={stats.days} goal={settings.goalKcal} compact={period === 'month'} />
            </div>
          )}

          <div className="section">
            <div className="section-h"><h2>{isDay ? '영양소' : '일평균 영양소'}</h2></div>
            <table className="nutri-table">
              <tbody>
                {NUTRIENT_KEYS.map((k) => {
                  const goal = k === 'kcal' ? settings.goalKcal : k === 'carb' ? goalG.carb : k === 'protein' ? goalG.protein : k === 'fat' ? goalG.fat : undefined
                  return (
                    <tr key={k}>
                      <td className="sub">{NUTRIENT_LABELS[k]}</td>
                      <td className="sub">{goal !== undefined ? `목표 ${fmt(goal)}` : ''}</td>
                      <td>{fmt(dayT[k], k === 'kcal' ? 0 : 1)} {NUTRIENT_UNITS[k]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
