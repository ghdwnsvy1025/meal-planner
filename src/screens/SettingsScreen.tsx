import { useRef, useState } from 'react'
import { useSettings } from '../hooks/useData'
import { saveSettings } from '../db/repo'
import { exportBackup, importBackup, validateBackup, downloadJson } from '../db/backup'
import { Field, NumInput, Segmented, Sheet, Switch } from '../components/ui'
import { today } from '../domain/dates'

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const ratioSum = s.macroRatio.carb + s.macroRatio.protein + s.macroRatio.fat

  async function setRatio(k: 'carb' | 'protein' | 'fat', v: number | undefined) {
    await saveSettings({ macroRatio: { ...s.macroRatio, [k]: v ?? 0 } })
  }

  async function doExport() {
    downloadJson(await exportBackup(), `식단표-백업-${today()}.json`)
    setMsg('백업 파일을 내려받았습니다.')
  }

  async function doImport(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      if (!validateBackup(parsed)) throw new Error('형식')
      if (!confirm('지금 저장된 모든 데이터를 이 백업으로 바꿉니다. 계속할까요?')) return
      await importBackup(parsed)
      setMsg('백업을 가져왔습니다.')
    } catch {
      setMsg('이 파일은 식단표 백업 파일이 아닙니다.')
    }
  }

  return (
    <Sheet title="설정" onClose={onClose} full>
      <div className="stack">
        <div className="list">
          <li>
            <span className="grow">
              <span className="title">기록 모드</span>
              <span className="sub">켜면 항목마다 먹었는지 체크할 수 있음</span>
            </span>
            <Switch checked={s.recordMode} onChange={(v) => saveSettings({ recordMode: v })} label="기록 모드" />
          </li>
          {s.recordMode && (
            <li>
              <span className="grow"><span className="title">통계 기준</span></span>
              <Segmented value={s.statsBasis} options={[{ value: 'actual', label: '먹은 것' }, { value: 'planned', label: '계획' }]} onChange={(v) => saveSettings({ statsBasis: v })} />
            </li>
          )}
          <li>
            <span className="grow"><span className="title">주 시작 요일</span></span>
            <Segmented value={s.weekStartsOn} options={[{ value: 'monday', label: '월' }, { value: 'sunday', label: '일' }]} onChange={(v) => saveSettings({ weekStartsOn: v })} />
          </li>
        </div>

        <div className="section">
          <div className="section-h"><h2>하루 목표</h2></div>
          <div className="stack">
            <Field label="칼로리 (kcal)">
              <NumInput value={s.goalKcal} onChange={(v) => saveSettings({ goalKcal: v ?? 0 })} step="10" />
            </Field>
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>탄단지 비율 (%){ratioSum !== 100 && <span className="danger"> · 합이 {ratioSum}입니다. 100이 되게 맞추세요.</span>}</div>
              <div className="row-fields" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <Field label="탄수화물"><NumInput value={s.macroRatio.carb} onChange={(v) => setRatio('carb', v)} step="5" /></Field>
                <Field label="단백질"><NumInput value={s.macroRatio.protein} onChange={(v) => setRatio('protein', v)} step="5" /></Field>
                <Field label="지방"><NumInput value={s.macroRatio.fat} onChange={(v) => setRatio('fat', v)} step="5" /></Field>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-h"><h2>백업</h2></div>
          <p className="muted" style={{ fontSize: 14, marginBottom: 10 }}>데이터는 이 기기 안에만 저장됩니다. 기기를 바꾸기 전에 파일로 내보내 두세요.</p>
          <div className="actions">
            <button className="btn" onClick={doExport}>파일로 내보내기</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>파일에서 가져오기</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          </div>
          {msg && <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>{msg}</p>}
        </div>
      </div>
    </Sheet>
  )
}
