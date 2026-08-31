/**
 * Philippine Official Holidays Utility
 * Calculates both Fixed and Movable holidays (Easter/Holy Week, National Heroes Day, Eid, etc.)
 */

// Calculate Easter Sunday for a given year using Computus (Meeus/Jones/Butcher algorithm)
function getEasterSunday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Known movable Islamic & Lunar New Year dates (2024-2030)
const KNOWN_MOVABLE_HOLIDAYS = {
  // Chinese New Year
  '2024-02-10': { name: 'Chinese Lunar New Year', type: 'Special Non-Working Holiday' },
  '2025-01-29': { name: 'Chinese Lunar New Year', type: 'Special Non-Working Holiday' },
  '2026-02-17': { name: 'Chinese Lunar New Year', type: 'Special Non-Working Holiday' },
  '2027-02-06': { name: 'Chinese Lunar New Year', type: 'Special Non-Working Holiday' },
  '2028-01-26': { name: 'Chinese Lunar New Year', type: 'Special Non-Working Holiday' },
  '2029-02-13': { name: 'Chinese Lunar New Year', type: 'Special Non-Working Holiday' },
  '2030-02-03': { name: 'Chinese Lunar New Year', type: 'Special Non-Working Holiday' },

  // Eid al-Fitr (End of Ramadan)
  '2024-04-10': { name: 'Eid al-Fitr (Feast of Ramadan)', type: 'Regular Holiday' },
  '2025-03-31': { name: 'Eid al-Fitr (Feast of Ramadan)', type: 'Regular Holiday' },
  '2026-03-20': { name: 'Eid al-Fitr (Feast of Ramadan)', type: 'Regular Holiday' },
  '2027-03-10': { name: 'Eid al-Fitr (Feast of Ramadan)', type: 'Regular Holiday' },
  '2028-02-27': { name: 'Eid al-Fitr (Feast of Ramadan)', type: 'Regular Holiday' },

  // Eid al-Adha (Feast of the Sacrifice)
  '2024-06-17': { name: 'Eid al-Adha (Feast of Sacrifice)', type: 'Regular Holiday' },
  '2025-06-07': { name: 'Eid al-Adha (Feast of Sacrifice)', type: 'Regular Holiday' },
  '2026-05-27': { name: 'Eid al-Adha (Feast of Sacrifice)', type: 'Regular Holiday' },
  '2027-05-17': { name: 'Eid al-Adha (Feast of Sacrifice)', type: 'Regular Holiday' },
  '2028-05-05': { name: 'Eid al-Adha (Feast of Sacrifice)', type: 'Regular Holiday' },
}

/**
 * Returns a dictionary of all Philippine holidays for a given year.
 */
export function getPhilippineHolidaysForYear(year) {
  const holidays = {}

  // 1. Regular Fixed Holidays
  const fixedRegular = [
    { m: 1,  d: 1,  name: "New Year's Day" },
    { m: 4,  d: 9,  name: 'Araw ng Kagitingan (Day of Valor)' },
    { m: 5,  d: 1,  name: 'Labor Day' },
    { m: 6,  d: 12, name: 'Independence Day' },
    { m: 11, d: 30, name: 'Bonifacio Day' },
    { m: 12, d: 25, name: 'Christmas Day' },
    { m: 12, d: 30, name: 'Rizal Day' },
  ]

  fixedRegular.forEach(h => {
    const key = formatDateKey(year, h.m, h.d)
    holidays[key] = { name: h.name, type: 'Regular Holiday', isHoliday: true, isBlocked: true }
  })

  // 2. Special Non-Working Fixed Holidays
  const fixedSpecial = [
    { m: 2,  d: 25, name: 'EDSA People Power Revolution Anniversary' },
    { m: 8,  d: 21, name: 'Ninoy Aquino Day' },
    { m: 11, d: 1,  name: "All Saints' Day" },
    { m: 11, d: 2,  name: "All Souls' Day" },
    { m: 12, d: 8,  name: 'Feast of the Immaculate Conception' },
    { m: 12, d: 24, name: 'Christmas Eve' },
    { m: 12, d: 31, name: 'Last Day of the Year' },
  ]

  fixedSpecial.forEach(h => {
    const key = formatDateKey(year, h.m, h.d)
    holidays[key] = { name: h.name, type: 'Special Non-Working Holiday', isHoliday: true, isBlocked: true }
  })

  // 3. National Heroes Day (Last Monday of August)
  const augLastDay = new Date(year, 7, 31) // August 31 (month index 7)
  const augLastDayOfWeek = augLastDay.getDay() // 0 = Sunday, 1 = Monday, ...
  const offsetToMonday = (augLastDayOfWeek + 6) % 7
  const heroesDayDate = 31 - offsetToMonday
  const heroesDayKey = formatDateKey(year, 8, heroesDayDate)
  holidays[heroesDayKey] = {
    name: 'National Heroes Day',
    type: 'Regular Holiday',
    isHoliday: true,
    isBlocked: true
  }

  // 4. Holy Week (Maundy Thursday, Good Friday, Black Saturday)
  const easter = getEasterSunday(year)
  const maundyThursday = addDays(easter, -3)
  const goodFriday = addDays(easter, -2)
  const blackSaturday = addDays(easter, -1)

  const maundyKey = formatDateKey(year, maundyThursday.getMonth() + 1, maundyThursday.getDate())
  const goodFridayKey = formatDateKey(year, goodFriday.getMonth() + 1, goodFriday.getDate())
  const blackSaturdayKey = formatDateKey(year, blackSaturday.getMonth() + 1, blackSaturday.getDate())

  holidays[maundyKey] = { name: 'Maundy Thursday', type: 'Regular Holiday', isHoliday: true, isBlocked: true }
  holidays[goodFridayKey] = { name: 'Good Friday', type: 'Regular Holiday', isHoliday: true, isBlocked: true }
  holidays[blackSaturdayKey] = { name: 'Black Saturday', type: 'Special Non-Working Holiday', isHoliday: true, isBlocked: true }

  // 5. Merge Known Movable Holidays
  Object.entries(KNOWN_MOVABLE_HOLIDAYS).forEach(([k, v]) => {
    if (k.startsWith(`${year}-`)) {
      holidays[k] = { ...v, isHoliday: true, isBlocked: true }
    }
  })

  return holidays
}

// In-memory cache for year lookups
const HOLIDAY_CACHE = new Map()

/**
 * Gets holiday info for a specific date string (YYYY-MM-DD)
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {object|null} { name, type, isHoliday, isBlocked }
 */
export function getPhilippineHoliday(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const parts = dateStr.split('-')
  if (parts.length < 3) return null
  const year = parseInt(parts[0], 10)
  if (isNaN(year)) return null

  if (!HOLIDAY_CACHE.has(year)) {
    HOLIDAY_CACHE.set(year, getPhilippineHolidaysForYear(year))
  }

  const yearHolidays = HOLIDAY_CACHE.get(year)
  return yearHolidays[dateStr] || null
}

/**
 * Checks if date is an official Philippine holiday
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isPhilippineHoliday(dateStr) {
  const holiday = getPhilippineHoliday(dateStr)
  return Boolean(holiday)
}
