export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="card loading-state">
      <div className="loader" />
      <span>{label}</span>
    </div>
  )
}
