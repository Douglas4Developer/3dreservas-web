import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card__top">
        <span>{label}</span>
        {icon ? <span className="stat-card__icon">{icon}</span> : null}
      </div>
      <strong className="stat-card__value">{value}</strong>
      {hint ? <small className="stat-card__hint">{hint}</small> : null}
    </article>
  )
}
