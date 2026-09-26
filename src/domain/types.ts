// 핵심 데이터 모델. DESIGN.md의 "데이터 세 층"을 그대로 코드로 옮긴 것.

export type NutrientKey = 'kcal' | 'carb' | 'protein' | 'fat' | 'sugar' | 'sodium'

/** 기준량(servingLabel) 1단위당 영양소. sodium만 선택. */
export interface Nutrients {
  kcal: number
  carb: number
  protein: number
  fat: number
  sugar: number
  sodium?: number
}

export type FoodSource = 'custom' | 'mfds'

/** 1층: 음식 라이브러리. 직접 만든 음식과 식약처 DB 복사본이 같이 들어간다. */
export interface Food {
  id: string
  name: string
  brand?: string
  /** "1인분", "1개", "100g" 같은 자유 텍스트 */
  servingLabel: string
  servingGrams?: number
  nutrients: Nutrients
  source: FoodSource
  /** source가 mfds일 때 원본 식품코드 */
  sourceCode?: string
  favorite: boolean
  archived: boolean
  useCount: number
  lastUsedAt?: number
  createdAt: number
  updatedAt: number
}

export type MealSlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const SLOT_LABELS: Record<MealSlotType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

/** 그룹 안의 항목. 인분 배수는 0.5 단위 탭 선택이 기본이지만 값 자체는 자유. */
export interface GroupItem {
  foodId: string
  multiplier: number
}

/** 2층: 끼니 그룹 */
export interface MealGroup {
  id: string
  name: string
  items: GroupItem[]
  /** 어느 끼니에 주로 쓰는지. 오늘 화면에서 정렬용 힌트일 뿐 강제하지 않음. */
  slotHint?: MealSlotType
  useCount: number
  lastUsedAt?: number
  createdAt: number
  updatedAt: number
}

export interface WeekTemplateSlot {
  slot: MealSlotType
  groupId: string | null
}

/** 3층: 주간 그룹. days[0]이 월요일. */
export interface WeekTemplate {
  id: string
  name: string
  days: WeekTemplateSlot[][]
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

/**
 * 하루 안의 항목.
 * planned: 그룹 적용이나 직접 추가로 "계획"에 들어간 것. false면 기록 모드에서 추가로 먹은 것.
 * eaten: 기록 모드 체크 상태. undefined는 아직 체크하지 않음.
 */
export interface DayItem {
  id: string
  foodId: string
  multiplier: number
  planned: boolean
  eaten?: boolean
}

export interface DayMeal {
  id: string
  slot: MealSlotType
  /** 이 끼니를 채운 그룹. 항목을 고치면 여전히 남아 "그룹에 저장" 버튼의 대상이 된다. */
  groupId?: string
  items: DayItem[]
}

/** 특정 날짜의 식단. date는 YYYY-MM-DD. */
export interface DayPlan {
  date: string
  meals: DayMeal[]
  /** 자동 배치에 쓰인 주간 그룹 */
  weekTemplateId?: string
  updatedAt: number
}

export interface MacroRatio {
  carb: number
  protein: number
  fat: number
}

export type StatsBasis = 'actual' | 'planned'

export interface Settings {
  id: 'settings'
  recordMode: boolean
  goalKcal: number
  /** 합이 100 */
  macroRatio: MacroRatio
  defaultSlots: MealSlotType[]
  statsBasis: StatsBasis
  weekStartsOn: 'monday' | 'sunday'
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  recordMode: false,
  goalKcal: 2000,
  macroRatio: { carb: 50, protein: 25, fat: 25 },
  defaultSlots: ['breakfast', 'lunch', 'dinner'],
  statsBasis: 'actual',
  weekStartsOn: 'monday',
}

/** 내장 식약처 DB의 한 행. 검색 인덱스 전용, 라이브러리에 넣을 때 Food로 복사된다. */
export interface FoodDbEntry {
  code: string
  name: string
  brand?: string
  /** 'processed' 가공식품 | 'dish' 음식 */
  kind: 'processed' | 'dish'
  servingLabel: string
  servingGrams?: number
  nutrients: Nutrients
}
