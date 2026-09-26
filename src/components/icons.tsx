// 작은 선형 아이콘. 라이브러리 없이 필요한 것만.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IconToday = () => (
  <svg viewBox="0 0 24 24" {...P}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15.5" r="1.5" fill="currentColor" stroke="none" /></svg>
)
export const IconGroups = () => (
  <svg viewBox="0 0 24 24" {...P}><rect x="3" y="4" width="18" height="7" rx="2.5" /><rect x="3" y="13" width="8" height="7" rx="2.5" /><rect x="13" y="13" width="8" height="7" rx="2.5" /></svg>
)
export const IconFoods = () => (
  <svg viewBox="0 0 24 24" {...P}><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M8 11c0-3 2-5 4-6 2 1 4 3 4 6" /><path d="M9 19h6" /></svg>
)
export const IconStats = () => (
  <svg viewBox="0 0 24 24" {...P}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
)
export const IconGear = () => (
  <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
)
export const IconChevronL = () => <svg viewBox="0 0 24 24" {...P}><path d="M15 5l-7 7 7 7" /></svg>
export const IconChevronR = () => <svg viewBox="0 0 24 24" {...P}><path d="M9 5l7 7-7 7" /></svg>
export const IconClose = () => <svg viewBox="0 0 24 24" {...P}><path d="M6 6l12 12M18 6L6 18" /></svg>
export const IconBack = () => <svg viewBox="0 0 24 24" {...P}><path d="M19 12H5M11 5l-7 7 7 7" /></svg>
export const IconSearch = () => <svg viewBox="0 0 24 24" {...P}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
export const IconCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
export const IconPlus = () => <svg viewBox="0 0 24 24" {...P}><path d="M12 5v14M5 12h14" /></svg>
export const IconTrash = () => <svg viewBox="0 0 24 24" {...P}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
export const IconStar = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" {...P} fill={filled ? 'currentColor' : 'none'}><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9L3.5 9.7l5.9-.8z" /></svg>
)
