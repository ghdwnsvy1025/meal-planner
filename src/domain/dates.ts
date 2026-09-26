// 날짜는 항상 로컬 기준 YYYY-MM-DD 문자열로 다룬다. 타임존 문제를 피하기 위해 Date 객체는 경계에서만 쓴다.

export type ISODate = string

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): ISODate {
  return toISODate(new Date())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** 0=월 ... 6=일. 주간 그룹의 days 인덱스와 같다. */
export function weekdayIndex(s: ISODate, weekStartsOn: 'monday' | 'sunday' = 'monday'): number {
  const js = fromISODate(s).getDay() // 0=일
  if (weekStartsOn === 'sunday') return js
  return (js + 6) % 7
}

export function weekStart(s: ISODate, weekStartsOn: 'monday' | 'sunday' = 'monday'): ISODate {
  return addDays(s, -weekdayIndex(s, weekStartsOn))
}

export function monthStart(s: ISODate): ISODate {
  return s.slice(0, 8) + '01'
}

export function monthEnd(s: ISODate): ISODate {
  const d = fromISODate(s)
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  let cur = from
  while (cur <= to) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

export function compareISODate(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export const WEEKDAY_SHORT_KO = ['월', '화', '수', '목', '금', '토', '일']

export function weekdayLabel(s: ISODate): string {
  return WEEKDAY_SHORT_KO[weekdayIndex(s, 'monday')]
}
