export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

export function multLabel(m: number): string {
  return `×${m}`
}
