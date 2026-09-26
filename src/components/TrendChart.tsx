import { useState } from 'react'
import type { DayStat } from '../domain/stats'
import { fromISODate, weekdayLabel } from '../domain/dates'
import { fmt } from './format'

/**
 * 날짜별 칼로리 막대. 단일 계열이라 범례 없음.
 * 목표 초과(+10%)는 상태색, 기록 없는 날은 옅은 자리표시.
 */
export function TrendChart({ days, goal, compact }: { days: DayStat[]; goal: number; compact?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 448
  const H = 150
  const padL = 34
  const padB = 20
  const padT = 14
  const innerW = W - padL - 6
  const innerH = H - padB - padT
  const max = Math.max(goal * 1.25, ...days.map((d) => d.totals.kcal)) || 1
  const y = (v: number) => padT + innerH - (v / max) * innerH
  const gap = compact ? 2 : 6
  const bw = (innerW - gap * (days.length - 1)) / days.length
  const goalY = y(goal)
  const sel = hover !== null ? days[hover] : null
  const selDt = sel ? fromISODate(sel.date) : null

  return (
    <div style={{ position: 'relative' }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="날짜별 칼로리 막대 그래프" onMouseLeave={() => setHover(null)}>
        <line className="goal" x1={padL} x2={W - 6} y1={goalY} y2={goalY} fill="none" strokeWidth={1} />
        <text x={padL - 4} y={goalY + 3} textAnchor="end">{Math.round(goal / 100) * 100}</text>
        <text x={padL - 4} y={padT + innerH} textAnchor="end">0</text>
        {days.map((d, i) => {
          const x = padL + i * (bw + gap)
          const h = d.recorded ? Math.max(2, y(0) - y(d.totals.kcal)) : 2
          const cls = !d.recorded ? 'bar none' : d.totals.kcal > goal * 1.1 ? 'bar over' : 'bar'
          const dt = fromISODate(d.date)
          const label = compact ? (dt.getDate() === 1 || dt.getDate() % 5 === 0 ? String(dt.getDate()) : '') : weekdayLabel(d.date)
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onClick={() => setHover(hover === i ? null : i)} style={{ cursor: 'pointer' }}>
              <rect x={x - gap / 2} y={padT} width={bw + gap} height={innerH} fill="transparent" />
              <rect className={cls} x={x} y={y(0) - h} width={bw} height={h} rx={Math.min(3, bw / 2)} />
              {label && <text x={x + bw / 2} y={H - 5} textAnchor="middle">{label}</text>}
              {hover === i && <rect x={x} y={padT} width={bw} height={innerH} fill="currentColor" opacity={0.06} />}
            </g>
          )
        })}
      </svg>
      {sel && selDt && (
        <div className="muted" style={{ fontSize: 13, marginTop: 4, textAlign: 'right' }}>
          {selDt.getMonth() + 1}월 {selDt.getDate()}일 {weekdayLabel(sel.date)} · {sel.recorded ? `${fmt(sel.totals.kcal)} kcal${sel.goalHit ? ' · 달성' : ''}` : '기록 없음'}
        </div>
      )}
    </div>
  )
}
