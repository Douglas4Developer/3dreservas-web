export function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPhone(value?: string | null) {
  return value || '-'
}

export function formatStatusText(value?: string | null) {
  if (!value) return '-'
  return value.replace(/_/g, ' ')
}

export function formatCountdown(value?: string | null) {
  if (!value) return '-'
  const diff = new Date(value).getTime() - Date.now()
  if (diff <= 0) return 'Expirado'
  const totalMinutes = Math.floor(diff / 1000 / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes} min`
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

export function toDateInputValue(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

export function getMonthBoundaries(referenceDate: Date) {
  const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: lastDay.toISOString().slice(0, 10),
  }
}

export function buildMonthLabel(referenceDate: Date) {
  return referenceDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

export function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}
