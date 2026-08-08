import React, { useState } from 'react'

export function CalendarWidget({ selectedDate, onDateSelect, minDateStr, maxDateStr, dateOverrides = {} }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const d = new Date(); d.setDate(d.getDate() + 1); return d
  })

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']
  
  const parseDateLocal = (dateStr) => {
    if (!dateStr) return 0;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  
  const minD = parseDateLocal(minDateStr)
  const maxD = parseDateLocal(maxDateStr)

  return (
    <div className="max-w-90 mx-auto">
      {/* Month header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-serif text-[20px] font-bold text-text-main m-0">
          {MONTHS[month]} {year}
        </h3>
        <div className="flex gap-1">
          {[['‹', -1], ['›', 1]].map(([label, dir]) => (
            <button key={dir} type="button"
              onClick={() => setCurrentMonth(new Date(year, month + dir, 1))}
              className="w-8 h-8 rounded-lg border border-border bg-white cursor-pointer text-[18px] leading-none text-text-sub flex items-center justify-center font-serif transition-colors hover:bg-off-white"
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-[12px] font-semibold text-text-muted py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr    = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const dateObj    = new Date(year, month, d)
          const t          = dateObj.getTime()
          const dow        = dateObj.getDay()
          const isDisabled = dow === 0 || t < minD || t > maxD
          const isSelected = selectedDate === dateStr
          const override = dateOverrides[dateStr]
          return (
            <button key={i} type="button" disabled={isDisabled}
              title={isDisabled ? "Outside booking window or unavailable" : ""}
              onClick={() => !isDisabled && onDateSelect(dateStr)}
              className={`aspect-square rounded-full border-none text-[13px] font-sans flex flex-col items-center justify-center gap-0.5 transition-all duration-150 ${
                isSelected ? 'bg-maroon text-white font-bold' : 
                isDisabled ? 'bg-[#F5F5F5] text-text-sub font-normal opacity-50 cursor-not-allowed' : 
                'bg-transparent text-text-main font-normal cursor-pointer hover:bg-maroon-light hover:text-maroon'
              }`}
            >
              <span>{d}</span>
              <div className="flex justify-center w-full h-1">
                {override && (
                  <div className={`w-1 h-1 rounded-full ${override.is_blocked ? (isSelected ? 'bg-white' : 'bg-danger') : (isSelected ? 'bg-white' : 'bg-info')}`} />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const isSlotPast = (slotTime, selectedDate) => {
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (selectedDate < today) return true
  if (selectedDate > today) return false

  const [slotHour, slotMin] = slotTime.split(':').map(Number)
  const now = new Date()
  const bufferMinutes = 0

  const slotDate = new Date()
  slotDate.setHours(slotHour, slotMin, 0, 0)

  const cutoff = new Date(now.getTime() + bufferMinutes * 60000)
  return slotDate <= cutoff
}

export function SlotBtn({ slot, selected, onSelect, selectedDate }) {
  const isPast = isSlotPast(slot.time_slot, selectedDate);
  const isFull = !slot.available;
  const isAvailable = !isPast && !isFull;

  let bgClass = 'bg-white';
  let textClass = 'text-text-main';
  let borderClass = 'border-border';
  let cursorClass = 'cursor-pointer';
  let opacityClass = 'opacity-100';
  let text = slot.display || slot.time_slot;

  if (selected) {
    bgClass = 'bg-maroon';
    textClass = 'text-white';
    borderClass = 'border-maroon';
  } else if (isPast) {
    bgClass = 'bg-off-white';
    textClass = 'text-text-muted';
    borderClass = 'border-border';
    opacityClass = 'opacity-40';
    cursorClass = 'cursor-not-allowed';
  } else if (isFull) {
    bgClass = 'bg-maroon-light';
    textClass = 'text-maroon';
    borderClass = 'border-maroon-light';
    opacityClass = 'opacity-100';
    cursorClass = 'cursor-not-allowed';
    text = 'Full';
  }

  return (
    <button
      type="button"
      onClick={() => isAvailable && onSelect(slot.time_slot)}
      className={`py-2.5 px-1.5 rounded-lg text-[12px] font-semibold font-sans border-[1.5px] border-solid transition-all duration-150 text-center ${bgClass} ${textClass} ${borderClass} ${cursorClass} ${opacityClass}`}
    >
      {text}
    </button>
  )
}
