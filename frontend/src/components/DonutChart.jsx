import { useState } from 'react'

export default function DonutChart({ data, total, colors, hideLegend = false }) {
  const [hovered, setHovered] = useState(null)
  
  const size = 220
  const strokeWidth = 45
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  
  let currentOffset = 0
  
  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 drop-shadow-sm">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE7E2" strokeWidth={strokeWidth} />
          {data.map((tx, i) => {
            const pct = total > 0 ? tx.count / total : 0
            const dash = pct * circ
            const offset = currentOffset
            currentOffset += dash
            
            // tiny gap if piece is big enough
            const visibleDash = dash > 2 ? dash - 2 : dash
            const isHovered = hovered === i
            
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${visibleDash} ${circ}`}
                strokeDashoffset={-offset}
                className={`transition-all duration-300 ease-out cursor-pointer ${hovered !== null && !isHovered ? 'opacity-30' : 'opacity-100'}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-300">
          <div className="text-[14px] font-semibold text-text-main transition-colors">
            {hovered !== null ? data[hovered].name : 'Total'}
          </div>
          <div className="text-[32px] font-bold text-text-main leading-tight transition-all">
            {hovered !== null ? data[hovered].count : total}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      {!hideLegend && (
        <div className="flex flex-col gap-3 mt-8 w-full px-2">
          {data.map((tx, i) => (
            <div 
              key={i} 
              className={`flex items-center gap-2.5 cursor-pointer transition-opacity duration-200 ${hovered !== null && hovered !== i ? 'opacity-40' : 'opacity-100'}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <div className="text-[13.5px] font-semibold text-text-main">{tx.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
