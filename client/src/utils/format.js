export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export const GRIND_OPTIONS = [
  { value: 'whole', label: 'Whole Bean' },
  { value: 'drip', label: 'Drip Grind' },
  { value: 'espresso', label: 'Espresso Grind' },
]

// Legacy 'ground' rows are treated as Drip Grind.
export function grindLabel(type) {
  if (type === 'ground') return 'Drip Grind'
  return GRIND_OPTIONS.find((o) => o.value === type)?.label ?? 'Whole Bean'
}

export const APP_TIME_ZONE = 'America/Los_Angeles'

// Today's date (YYYY-MM-DD) in US Pacific, regardless of the device's time zone.
export function pacificToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: APP_TIME_ZONE })
}
