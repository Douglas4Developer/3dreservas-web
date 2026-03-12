import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDateTime } from '../../lib/format'
import { fetchContracts } from '../../services/contracts.service'
import { fetchReservations } from '../../services/reservations.service'
import type { Contract, Reservation } from '../../types/database'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchContracts(), fetchReservations()])
      .then(([contractData, reservationData]) => {
        setContracts(contractData)
        setReservations(reservationData)
      })
      .catch((serviceError) => setError(serviceError.message || 'Erro ao carregar contratos.'))
      .finally(() => setLoading(false))
  }, [])

  const reservationMap = useMemo(() => {
    return reservations.reduce<Record<string, Reservation>>((accumulator, reservation) => {
      accumulator[reservation.id] = reservation
      return accumulator
    }, {})
  }, [reservations])

  return (
    <div className="stack-lg">
      <PageHeader
        title="Contratos"
        description="Controle de rascunhos, assinaturas pendentes e contratos assinados."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card table-card">
        {loading ? (
          <p>Carregando contratos...</p>
        ) : contracts.length === 0 ? (
          <p>Nenhum contrato gerado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Cliente</th>
                <th>Versão</th>
                <th>Status</th>
                <th>Assinado em</th>
                <th>Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const reservation = reservationMap[contract.reservation_id]
                return (
                  <tr key={contract.id}>
                    <td>{reservation?.event_date ?? '-'}</td>
                    <td>{reservation?.customer_name ?? '-'}</td>
                    <td>{contract.version}</td>
                    <td>
                      <StatusBadge status={contract.status} />
                    </td>
                    <td>{formatDateTime(contract.signed_at)}</td>
                    <td>
                      {contract.file_path ? (
                        <a href={contract.file_path} target="_blank" rel="noreferrer">
                          Abrir
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
