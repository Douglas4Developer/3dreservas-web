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
