import { macroPercent, type Totals } from '../domain/nutrition'
import { fmt } from './format'

export function MacroBar({ totals, showGrams = true }: { totals: Totals; showGrams?: boolean }) {
  const p = macroPercent(totals)
  const empty = p.carb + p.protein + p.fat === 0
  return (
    <div className="macro">
      <div className="macro-bar" role="img" aria-label={`탄수화물 ${Math.round(p.carb)}%, 단백질 ${Math.round(p.protein)}%, 지방 ${Math.round(p.fat)}%`}>
        {!empty && (
          <>
            <div className="c" style={{ width: `${p.carb}%` }} />
            <div className="p" style={{ width: `${p.protein}%` }} />
            <div className="f" style={{ width: `${p.fat}%` }} />
          </>
        )}
      </div>
      <div className="macro-legend">
        <span><i style={{ background: 'var(--carb)' }} />탄 <span className="v">{Math.round(p.carb)}%</span>{showGrams && <> {fmt(totals.carb)}g</>}</span>
        <span><i style={{ background: 'var(--protein)' }} />단 <span className="v">{Math.round(p.protein)}%</span>{showGrams && <> {fmt(totals.protein)}g</>}</span>
        <span><i style={{ background: 'var(--fat)' }} />지 <span className="v">{Math.round(p.fat)}%</span>{showGrams && <> {fmt(totals.fat)}g</>}</span>
      </div>
    </div>
  )
}
