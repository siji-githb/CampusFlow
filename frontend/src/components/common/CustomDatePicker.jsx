import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseInputToDateStr(str) {
  if (!str || !str.trim()) return ''
  const clean = str.trim()

  // Match MM/DD/YYYY or M/D/YYYY
  const usMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (usMatch) {
    const m = parseInt(usMatch[1], 10)
    const d = parseInt(usMatch[2], 10)
    const y = parseInt(usMatch[3], 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10)
    const m = parseInt(isoMatch[2], 10)
    const d = parseInt(isoMatch[3], 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // Fallback parse (e.g. "Aug 18, 2026")
  const parsed = Date.parse(clean)
  if (!isNaN(parsed)) {
    const dt = new Date(parsed)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }

  return null
}

function formatDateDisplay(val) {
  if (!val) return ''
  try {
    const [y, m, d] = val.split('-').map(Number)
    if (!y || !m || !d) return val
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`
  } catch {
    return val
  }
}

export default function CustomDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'MM/DD/YYYY',
  label,
  className = '',
  align = 'left',
  position = 'top',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState(() => (value ? formatDateDisplay(value) : ''))
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const todayStr = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }, [])

  // Current viewed month/year in the calendar
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number)
      if (y && m && d) return new Date(y, m - 1, d)
    }
    return new Date()
  })

  // Sync displayed text & view when value changes from outside
  useEffect(() => {
    if (value) {
      setInputText(formatDateDisplay(value))
      const [y, m, d] = value.split('-').map(Number)
      if (y && m && d) {
        setViewDate(new Date(y, m - 1, d))
      }
    } else {
      setInputText('')
    }
  }, [value])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        if (value) {
          setInputText(formatDateDisplay(value))
        }
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, value])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Generate calendar grid cells (42 cells: 6 weeks × 7 days)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const cells = []

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const cellDate = new Date(year, month - 1, day)
      const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        day,
        date: cellDate,
        dateStr,
        isCurrentMonth: false
      })
    }

    // 2. Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const cellDate = new Date(year, month, day)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        day,
        date: cellDate,
        dateStr,
        isCurrentMonth: true
      })
    }

    // 3. Next month leading days to complete 42 cells
    const remaining = 42 - cells.length
    for (let day = 1; day <= remaining; day++) {
      const cellDate = new Date(year, month + 1, day)
      const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        day,
        date: cellDate,
        dateStr,
        isCurrentMonth: false
      })
    }

    return cells
  }, [year, month])

  // Manual typing handler
  const handleInputChange = (e) => {
    const text = e.target.value
    setInputText(text)

    if (!text.trim()) {
      onChange('')
      return
    }

    const parsed = parseInputToDateStr(text)
    if (parsed) {
      const [py, pm, pd] = parsed.split('-').map(Number)
      const parsedDate = new Date(py, pm - 1, pd)
      const isSunday = parsedDate.getDay() === 0
      const isPast = parsed < todayStr
      const isOutOfBounds = (minDate && parsed < minDate) || (maxDate && parsed > maxDate)

      if (!isSunday && !isPast && !isOutOfBounds) {
        onChange(parsed)
        setViewDate(parsedDate)
      }
    }
  }

  const handleInputBlur = () => {
    if (!inputText.trim()) {
      onChange('')
      setInputText('')
      return
    }

    const parsed = parseInputToDateStr(inputText)
    if (parsed) {
      const [py, pm, pd] = parsed.split('-').map(Number)
      const parsedDate = new Date(py, pm - 1, pd)
      const isSunday = parsedDate.getDay() === 0
      const isPast = parsed < todayStr
      const isOutOfBounds = (minDate && parsed < minDate) || (maxDate && parsed > maxDate)

      if (!isSunday && !isPast && !isOutOfBounds) {
        onChange(parsed)
        setInputText(formatDateDisplay(parsed))
        return
      }
    }

    // If invalid date was typed, revert to previous valid value or empty
    if (value) {
      setInputText(formatDateDisplay(value))
    } else {
      setInputText('')
    }
  }

  const handleSelectDay = (cell) => {
    const isSunday = cell.date.getDay() === 0
    const isPast = cell.dateStr < todayStr
    const isOutOfBounds = (minDate && cell.dateStr < minDate) || (maxDate && cell.dateStr > maxDate)

    if (isSunday || isPast || isOutOfBounds) return

    onChange(cell.dateStr)
    setInputText(formatDateDisplay(cell.dateStr))
    setIsOpen(false)
  }

  const handlePrevMonth = (e) => {
    e.stopPropagation()
    setViewDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = (e) => {
    e.stopPropagation()
    setViewDate(new Date(year, month + 1, 1))
  }

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-extrabold text-text-muted uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Manual Input Container */}
      <div
        className={`w-full flex items-center justify-between bg-white rounded-xl border text-[13.5px] font-sans transition-all shadow-xs ${
          isOpen
            ? 'border-maroon ring-2 ring-maroon/15 shadow-sm'
            : 'border-border hover:border-border-strong text-text-main'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-surface' : ''}`}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3.5 py-2.5 outline-none text-[13.5px] text-text-main font-medium placeholder:text-text-muted placeholder:font-normal"
        />

        <div className="flex items-center gap-1 pr-2.5 shrink-0">
          {inputText && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setInputText('')
                inputRef.current?.focus()
              }}
              className="p-1 rounded-full text-text-muted hover:text-danger hover:bg-danger-light/50 transition-colors border-none bg-transparent cursor-pointer"
              title="Clear date"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="w-7 h-7 rounded-lg bg-maroon-light text-maroon flex items-center justify-center border border-maroon-border/40 hover:bg-maroon hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Open calendar"
          >
            <CalendarIcon size={14} className="stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } w-75 sm:w-[320px] bg-white rounded-2xl border border-border shadow-[0_18px_50px_rgba(0,0,0,0.18)] p-4 z-1000 animate-fade-up select-none`}
        >
          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-serif text-[16px] font-bold text-text-main">
              {MONTHS[month]} <span className="font-sans text-[14px] text-text-sub">{year}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg border border-border hover:border-border-strong hover:bg-surface text-text-sub hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg border border-border hover:border-border-strong hover:bg-surface text-text-sub hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {DAYS.map((d, i) => (
              <div
                key={i}
                className={`text-[11px] font-bold py-1 ${
                  i === 0 ? 'text-text-muted/40' : 'text-text-muted'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isSunday = cell.date.getDay() === 0
              const isPast = cell.dateStr < todayStr
              const isOutOfBounds = (minDate && cell.dateStr < minDate) || (maxDate && cell.dateStr > maxDate)
              const isDisabled = isSunday || isPast || isOutOfBounds

              const isSelected = value === cell.dateStr
              const isToday = cell.dateStr === todayStr

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(cell)}
                  title={isSunday ? 'Sundays are closed' : isPast ? 'Past date' : ''}
                  className={`h-8 w-8 mx-auto rounded-xl text-[12.5px] font-sans flex items-center justify-center transition-all duration-150 relative ${
                    isSelected
                      ? 'bg-maroon text-white font-extrabold shadow-sm scale-105 z-10 cursor-pointer'
                      : isToday
                      ? 'text-maroon font-bold hover:bg-maroon-light hover:text-maroon cursor-pointer'
                      : isDisabled
                      ? 'text-text-muted/30 cursor-not-allowed bg-transparent font-normal'
                      : !cell.isCurrentMonth
                      ? 'text-text-muted/40 font-normal hover:bg-surface cursor-pointer'
                      : 'text-text-main font-medium hover:bg-maroon-light hover:text-maroon cursor-pointer'
                  }`}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Footer details */}
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-text-muted px-1">
            <span>
              {value ? (
                <span className="text-maroon font-bold">Selected: {formatDateDisplay(value)}</span>
              ) : (
                'Format: MM/DD/YYYY'
              )}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-sub hover:text-text-main font-semibold cursor-pointer border-none bg-transparent"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
