import { formatCurrency } from '../../lib/format'

type RevenuePoint = {
  key: string
  label: string
  value: number
  occupancy: number
}

type StatusPoint = {
  label: string
  count: number
  color: string
}

type TrendPoint = {
  label: string
  shortLabel: string
  count: number
}

interface AdminDashboardChartsProps {
  revenueSeries: RevenuePoint[]
  statusSeries: StatusPoint[]
  weeklySeries: TrendPoint[]
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return ''
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  if (!points.length) return ''
  const start = `M ${points[0].x.toFixed(2)} ${baseline.toFixed(2)}`
  const line = points.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
  const end = `L ${points[points.length - 1].x.toFixed(2)} ${baseline.toFixed(2)} Z`
  return `${start} ${line} ${end}`
}

function RevenueAreaChart({ points }: { points: RevenuePoint[] }) {
  const chartWidth = 560
  const chartHeight = 260
  const paddingX = 26
  const paddingTop = 20
  const paddingBottom = 34
  const usableHeight = chartHeight - paddingTop - paddingBottom
  const usableWidth = chartWidth - paddingX * 2
  const maxValue = Math.max(...points.map((point) => point.value), 1)

  const chartPoints = points.map((point, index) => ({
    x: paddingX + (usableWidth * index) / Math.max(points.length - 1, 1),
    y: paddingTop + usableHeight - (point.value / maxValue) * usableHeight,
    ...point,
  }))

  const linePath = buildLinePath(chartPoints)
  const areaPath = buildAreaPath(chartPoints, chartHeight - paddingBottom)
  const guideSteps = 4

  return (
    <div className="dashboard-chart dashboard-chart--area">
      <div className="dashboard-chart__head">
        <div>
          <span className="dashboard-kicker">Receita prevista</span>
          <h3>Projeção visual por mês</h3>
        </div>
        <div className="dashboard-chart__summary">
          <strong>{formatCurrency(points.reduce((total, point) => total + point.value, 0))}</strong>
          <small>Janela de {points.length} meses</small>
        </div>
      </div>

      <div className="dashboard-chart__canvas">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Gráfico de receita prevista por mês">
          <defs>
            <linearGradient id="dashboardAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(37,99,235,0.35)" />
              <stop offset="100%" stopColor="rgba(37,99,235,0.04)" />
            </linearGradient>
          </defs>

          {Array.from({ length: guideSteps }, (_, index) => {
            const ratio = index / Math.max(guideSteps - 1, 1)
            const y = paddingTop + usableHeight * ratio
            return (
              <line
                key={y}
                x1={paddingX}
                x2={chartWidth - paddingX}
                y1={y}
                y2={y}
                className="dashboard-chart__grid-line"
              />
            )
          })}

          <path d={areaPath} fill="url(#dashboardAreaGradient)" />
          <path d={linePath} className="dashboard-chart__line" />

          {chartPoints.map((point) => (
            <g key={point.key}>
              <circle cx={point.x} cy={point.y} r="5" className="dashboard-chart__dot" />
            </g>
          ))}
        </svg>
      </div>

      <div className="dashboard-chart__legend dashboard-chart__legend--months">
        {points.map((point) => (
          <div key={point.key} className="dashboard-chart__legend-card">
            <span>{point.label}</span>
            <strong>{formatCurrency(point.value)}</strong>
            <small>{point.occupancy}% ocupação</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusDonutChart({ points }: { points: StatusPoint[] }) {
  const total = Math.max(points.reduce((sum, point) => sum + point.count, 0), 1)
  let currentAngle = 0
  const gradientStops: string[] = []

  points.forEach((point) => {
    const start = currentAngle
    const sweep = (point.count / total) * 360
    const end = start + sweep
    gradientStops.push(`${point.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`)
    currentAngle = end
  })

  const donutStyle = {
    background: `conic-gradient(${gradientStops.join(', ')})`,
  }

  const topPoint = [...points].sort((a, b) => b.count - a.count)[0]

  return (
    <div className="dashboard-chart dashboard-chart--donut">
      <div className="dashboard-chart__head">
        <div>
          <span className="dashboard-kicker">Distribuição</span>
          <h3>Mapa de status das reservas</h3>
        </div>
        <div className="dashboard-chart__summary">
          <strong>{total}</strong>
          <small>Total mapeado</small>
        </div>
      </div>

      <div className="dashboard-donut-layout">
        <div className="dashboard-donut" style={donutStyle} aria-hidden="true">
          <div className="dashboard-donut__center">
            <strong>{topPoint?.count ?? 0}</strong>
            <small>{topPoint?.label ?? 'Sem dados'}</small>
          </div>
        </div>

        <div className="dashboard-donut-list">
          {points.map((point) => {
            const percentage = Math.round((point.count / total) * 100)
            return (
              <div key={point.label} className="dashboard-donut-list__item">
                <span className="dashboard-donut-list__swatch" style={{ background: point.color }} />
                <div>
                  <strong>{point.label}</strong>
                  <small>{point.count} reserva(s)</small>
                </div>
                <b>{percentage}%</b>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WeeklyBarsChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(...points.map((point) => point.count), 1)
  const total = points.reduce((sum, point) => sum + point.count, 0)

  return (
    <div className="dashboard-chart dashboard-chart--bars">
      <div className="dashboard-chart__head">
        <div>
          <span className="dashboard-kicker">Ritmo comercial</span>
          <h3>Reservas criadas nas últimas semanas</h3>
        </div>
        <div className="dashboard-chart__summary">
          <strong>{total}</strong>
          <small>Últimas {points.length} semanas</small>
        </div>
      </div>

      <div className="dashboard-bars">
        {points.map((point) => {
          const height = `${Math.max((point.count / max) * 100, point.count > 0 ? 14 : 6)}%`
          return (
            <div key={point.label} className="dashboard-bars__item">
              <div className="dashboard-bars__value">{point.count}</div>
              <div className="dashboard-bars__track">
                <div className="dashboard-bars__fill" style={{ height }} />
              </div>
              <small title={point.label}>{point.shortLabel}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AdminDashboardCharts({ revenueSeries, statusSeries, weeklySeries }: AdminDashboardChartsProps) {
  return (
    <section className="dashboard-charts-grid">
      <RevenueAreaChart points={revenueSeries} />
      <StatusDonutChart points={statusSeries} />
      <WeeklyBarsChart points={weeklySeries} />
    </section>
  )
}
