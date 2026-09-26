// 외부 라이브러리 없이 PWA 아이콘 PNG 생성: 청자 바탕에 흰 밥공기 실루엣.
import fs from 'node:fs'
import zlib from 'node:zlib'

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size)
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
const BG = [0x2e, 0x6b, 0x56]
const FG = [0xf7, 0xf9, 0xf6]
// 밥공기: 아래가 둥근 반원 + 위쪽 밥 봉긋한 곡선. 좌표는 0~1.
function pixel(u, v) {
  const cx = 0.5, cy = 0.56
  const dx = u - cx, dy = v - cy
  const bowl = dy >= 0 && dx * dx + dy * dy < 0.31 * 0.31 && dy < 0.24
  const rim = Math.abs(dy) < 0.022 && Math.abs(dx) < 0.33
  const rice = dy < 0 && dx * dx / (0.27 * 0.27) + dy * dy / (0.16 * 0.16) < 1
  return bowl || rim || rice ? FG : BG
}
for (const s of [192, 512]) fs.writeFileSync(`public/icon-${s}.png`, png(s, pixel))
fs.writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2e6b56"/><ellipse cx="32" cy="34" rx="17" ry="10" fill="#f7f9f6"/><path d="M11 36h42a21 15 0 0 1-42 0z" fill="#f7f9f6"/></svg>`)
console.log('icons written')
