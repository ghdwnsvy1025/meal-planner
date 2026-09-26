import { useEffect, type ReactNode } from 'react'
import { IconBack, IconCheck, IconClose } from './icons'

export function Sheet({ title, onClose, children, full, back, right }: { title: string; onClose: () => void; children: ReactNode; full?: boolean; back?: boolean; right?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={'sheet' + (full ? ' full' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-h">
          {back && (
            <button className="iconbtn" onClick={onClose} aria-label="뒤로">
              <IconBack />
            </button>
          )}
          <h2>{title}</h2>
          {right}
          {!back && (
            <button className="iconbtn" onClick={onClose} aria-label="닫기">
              <IconClose />
            </button>
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className="check" onClick={() => onChange(!checked)}>
      {checked && <IconCheck />}
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chips<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="chips" role="group">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className="chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <span className="muted" style={{ fontSize: 12 }}>{hint}</span>}
    </label>
  )
}

/** 숫자 입력. 빈 값은 0이 아니라 undefined 로 다룬다. */
export function NumInput({ value, onChange, placeholder, step = 'any', min = 0, required }: { value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; step?: string; min?: number; required?: boolean }) {
  return (
    <input
      className="input"
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      required={required}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  )
}
