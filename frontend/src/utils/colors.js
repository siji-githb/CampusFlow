export const EXTENDED_PALETTE = [
  '#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9', '#EA580C', 
  '#0369A1', '#BE123C', '#047857', '#A21CAF', '#4D7C0F', '#4338CA', 
  '#0F766E', '#C026D3', '#0284C7', '#B45309'
]

export const BASE_DOC_COLOR_MAP = {
  'Transcript of Records (TOR)': '#7B1A2A',
  'Certificate of Enrollment (COE)': '#B8900A',
  'Diploma Release': '#1D4ED8',
  'General Weighted Average (GWA)': '#15803D',
  'Completion Form - Request': '#6D28D9',
  'Completion Form - Submission': '#EA580C'
}

const usedColors = new Set(Object.values(BASE_DOC_COLOR_MAP))
const assignedMap = { ...BASE_DOC_COLOR_MAP }
let fallbackCounter = 0

export function getDocumentColor(name) {
  if (!name) return '#000000'
  if (assignedMap[name]) return assignedMap[name]
  
  const available = EXTENDED_PALETTE.find(c => !usedColors.has(c))
  if (available) {
    usedColors.add(available)
    assignedMap[name] = available
    return available
  }
  
  const fallbackColor = `hsl(${(fallbackCounter++ * 137.5) % 360}, 75%, 45%)`
  usedColors.add(fallbackColor)
  assignedMap[name] = fallbackColor
  return fallbackColor
}
