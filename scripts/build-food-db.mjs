#!/usr/bin/env node
/**
 * 식약처 식품영양성분 벌크 데이터(CSV 또는 XLSX)를 앱 내장 검색용 public/food-db.json 으로 가공한다.
 *
 * 사용:
 *   node scripts/build-food-db.mjs --processed data/가공식품.csv --dish data/음식.xlsx [--out-dir public]
 *
 * 출력은 두 파일로 나뉜다. 음식은 작아서 앱이 바로 읽고, 가공식품은 크기 때문에 처음 검색할 때만 내려받는다.
 *   public/food-db-dish.json       (음식, 약 1~2MB)
 *   public/food-db-processed.json  (가공식품, 약 35MB)
 *
 * 입력 후보 (둘 다 컬럼 이름이 조금씩 달라 정규식으로 헤더를 찾는다):
 *   - 공공데이터포털 표준데이터: 가공식품(15100066), 음식(15100070) CSV/XLS
 *   - 식품안전나라 K-FIND 내려받기 엑셀
 *
 * 출력 행: [code, name, brand, kind('p'|'d'), servingLabel, servingGrams|null, kcal, carb, protein, fat, sugar, sodium|null]
 * 영양소는 1회 섭취참고량이 있으면 그 양 기준으로, 없으면 원본 기준량(보통 100g) 기준으로 환산한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

const args = process.argv.slice(2)
function opt(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const inputs = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--processed') inputs.push({ file: args[++i], kind: 'p' })
  else if (args[i] === '--dish') inputs.push({ file: args[++i], kind: 'd' })
}
const outDir = opt('--out-dir') ?? 'public'
if (inputs.length === 0) {
  console.error('입력 파일이 없습니다. --processed <file> 또는 --dish <file> 을 지정하세요.')
  process.exit(1)
}

// ---------- 파일 읽기 ----------

function readRows(file) {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.csv' || ext === '.txt') {
    const buf = fs.readFileSync(file)
    let text
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      text = new TextDecoder('euc-kr').decode(buf)
    }
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
    const wb = XLSX.read(text, { type: 'string', raw: true })
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  }
  const wb = XLSX.read(fs.readFileSync(file), { type: "buffer" })
  // 가장 행이 많은 시트를 데이터 시트로 본다
  let best = null
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
    if (!best || rows.length > best.length) best = rows
  }
  return best ?? []
}

// ---------- 헤더 찾기 ----------

const COLS = {
  code: [/^식품\s*코드/, /^FOOD_CD$/i],
  name: [/^식품명/, /^FOOD_NM/i, /^DESC_KOR$/i],
  kind: [/^데이터\s*구분/, /^식품\s*구분/, /^DB군/],
  base: [/영양성분\s*함량\s*기준량/, /^기준량/, /NUTR_CONT_SRV/i],
  serving: [/1회\s*섭취\s*참고량/, /1인\(회\)분량/, /1회\s*제공량/, /SERVING/i],
  weight: [/^식품중량/],
  origin: [/^식품기원코드/],
  brand: [/^제조사명?$/, /^업체명/, /MAKER/i, /^회사명/],
  kcal: [/^에너지/, /^열량/, /kcal/i],
  carb: [/^탄수화물/],
  protein: [/^단백질/],
  fat: [/^지방/],
  sugar: [/^당류/],
  sodium: [/^나트륨/],
}

function findHeader(rows) {
  // 위쪽 10행 안에서 "식품명"이 들어간 행을 헤더로 본다
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r].map((c) => String(c).trim())
    if (row.some((c) => /^식품명/.test(c) || /FOOD_NM/i.test(c) || /DESC_KOR/i.test(c))) return { index: r, header: row }
  }
  throw new Error('헤더 행(식품명 컬럼)을 찾지 못했습니다')
}

function mapColumns(header) {
  const idx = {}
  for (const [key, patterns] of Object.entries(COLS)) {
    idx[key] = header.findIndex((h) => patterns.some((p) => p.test(h)))
  }
  const required = ['name', 'kcal', 'carb', 'protein', 'fat']
  const missing = required.filter((k) => idx[k] < 0)
  if (missing.length) throw new Error(`필수 컬럼 없음: ${missing.join(', ')}\n헤더: ${header.join(' | ')}`)
  return idx
}

// ---------- 변환 ----------

function num(v) {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/,/g, '').trim()
  if (s === '' || s === '-' || /^tr$/i.test(s)) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/** "100g", "200ml", "1인분(250g)" 같은 문자열에서 그램/밀리리터 수치를 뽑는다 */
function grams(v) {
  if (v === null || v === undefined) return null
  const s = String(v)
  const m = s.match(/([\d.]+)\s*(g|ml|㎖|㎎)?/i)
  if (!m) return null
  const n = parseFloat(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

function r1(n) {
  return Math.round(n * 10) / 10
}

function convert(rows, kind) {
  const { index, header } = findHeader(rows)
  const col = mapColumns(header)
  const outRows = []
  let skipped = 0
  for (let r = index + 1; r < rows.length; r++) {
    const row = rows[r]
    // "김치찌개_햄" 처럼 밑줄로 이어 붙인 이름은 띄어쓰기로
    const name = String(row[col.name] ?? '').trim().replace(/_/g, ' ')
    if (!name) continue
    const kcal = num(row[col.kcal])
    if (kcal === null) {
      skipped++
      continue
    }
    const baseG = col.base >= 0 ? grams(row[col.base]) : null
    // 1회 분량: 섭취참고량 → (음식) 식품중량 순으로 찾는다
    let servG = col.serving >= 0 ? grams(row[col.serving]) : null
    if (!servG && col.weight >= 0) servG = grams(row[col.weight])
    // 원본 영양소는 baseG 기준. 1회 섭취참고량이 있으면 그 기준으로 환산.
    let factor = 1
    let label
    let servingGrams
    if (baseG && servG) {
      factor = servG / baseG
      label = `1회 ${servG}g`
      servingGrams = servG
    } else if (baseG) {
      label = `${baseG}g`
      servingGrams = baseG
    } else {
      label = '1회'
      servingGrams = null
    }
    const n = (k) => {
      const v = col[k] >= 0 ? num(row[col[k]]) : null
      return v === null ? null : r1(v * factor)
    }
    const code = col.code >= 0 && String(row[col.code]).trim() ? String(row[col.code]).trim() : `${kind}-${r}`
    const brand = col.brand >= 0 ? String(row[col.brand] ?? '').trim() : ''
    const origin = col.origin >= 0 ? Number(row[col.origin]) || 99 : 99
    outRows.push([
      code,
      name,
      brand === '해당없음' ? '' : brand,
      kind,
      label,
      servingGrams,
      r1(kcal * factor),
      n('carb') ?? 0,
      n('protein') ?? 0,
      n('fat') ?? 0,
      n('sugar') ?? 0,
      n('sodium'),
      origin,
    ])
  }
  return { outRows, skipped }
}

// ---------- 실행 ----------

fs.mkdirSync(outDir, { recursive: true })
for (const { file, kind } of inputs) {
  console.log(`읽는 중: ${file} (${kind === 'p' ? '가공식품' : '음식'})`)
  const rows = readRows(file)
  const { outRows, skipped } = convert(rows, kind)
  // 같은 이름+제조사는 하나만 남긴다. 음식은 식품기원코드가 낮은 것(가정식 > 외식 > 급식) 우선.
  const uniq = new Map()
  for (const r of outRows) {
    const key = r[1] + '|' + r[2]
    const prev = uniq.get(key)
    if (!prev || r[12] < prev[12]) uniq.set(key, r)
  }
  const list = [...uniq.values()].map((r) => r.slice(0, 12))
  const out = path.join(outDir, kind === 'p' ? 'food-db-processed.json' : 'food-db-dish.json')
  fs.writeFileSync(out, JSON.stringify(list))
  const size = fs.statSync(out).size
  console.log(`  ${list.length}행 저장, ${skipped}행 건너뜀 (열량 없음) → ${out} (${(size / 1024 / 1024).toFixed(1)} MB)`)
}
console.log('완료')
