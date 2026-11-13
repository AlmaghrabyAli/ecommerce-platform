import fs from 'node:fs'
import path from 'node:path'
import { formatDate, formatDateTime, parseServerDate } from './dates.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

describe('date helpers', () => {
  it('parses server UTC dates with and without Z as UTC instants', () => {
    const withoutZ = parseServerDate('2026-11-12T10:00:00')
    const withZ = parseServerDate('2026-11-12T10:00:00Z')
    expect(withoutZ?.getTime()).toBe(Date.UTC(2026, 10, 12, 10, 0, 0))
    expect(withZ?.getTime()).toBe(Date.UTC(2026, 10, 12, 10, 0, 0))
  })

  it('respects explicit timezone offsets', () => {
    const withOffset = parseServerDate('2026-11-12T10:00:00+02:00')
    expect(withOffset?.getTime()).toBe(Date.UTC(2026, 10, 12, 8, 0, 0))
  })

  it('returns null or empty string for invalid and empty inputs', () => {
    expect(parseServerDate('')).toBeNull()
    expect(parseServerDate(null)).toBeNull()
    expect(parseServerDate(undefined)).toBeNull()
    expect(parseServerDate('not-a-date')).toBeNull()
    expect(formatDate('')).toBe('')
    expect(formatDate('invalid')).toBe('')
    expect(formatDateTime('')).toBe('')
  })

  it('formats dates across all 12 months from local parts with zero-padded time', () => {
    for (let m = 0; m < 12; m += 1) {
      const monthNum = String(m + 1).padStart(2, '0')
      const iso = `2026-${monthNum}-15T05:07:00`
      const instant = parseServerDate(iso)
      const expectedDate = `${instant.getDate()} ${MONTHS[instant.getMonth()]} ${instant.getFullYear()}`
      const hh = String(instant.getHours()).padStart(2, '0')
      const mm = String(instant.getMinutes()).padStart(2, '0')
      expect(formatDate(iso)).toBe(expectedDate)
      expect(formatDateTime(iso)).toBe(`${expectedDate}, ${hh}:${mm}`)
    }
  })

  it('does not use toISOString in dates.js implementation', () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/dates.js'), 'utf8')
    const codeOnly = src.replace(/\/\/.*$/gm, '')
    expect(codeOnly).not.toContain('toISOString')
  })
})
