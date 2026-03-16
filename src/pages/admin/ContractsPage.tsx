import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, formatDateTime } from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { fetchContracts, generateContract } from '../../services/contracts.service'
import { fetchReservations } from '../../services/reservations.service'
import { fetchSignatures, registerAdminSignature } from '../../services/signatures.service'
import type { Contract, Reservation, Signature } from '../../types/database'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [signaturesMap, setSignaturesMap] = useState<Record<string, Signature[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [signingFor, setSigningFor] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const [contractData, reservationData] = await Promise.all([fetchContracts(), fetchReservations()])
      setContracts(contractData)
      setReservations(reservationData)

      const signaturesEntries = await Promise.all(
        contractData.map(async (contract) => [contract.id, await fetchSignatures(contract.id)] as const),
      )
      setSignaturesMap(Object.fromEntries(signaturesEntries))
      setError(null)
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao carregar contratos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => subscribeToTables(['contracts', 'signatures'], () => void loadData()), [])

  const reservationMap = useMemo(() => {
    return reservations.reduce<Record<string, Reservation>>((accumulator, reservation) => {
      accumulator[reservation.id] = reservation
      return accumulator
    }, {})
  }, [reservations])

  async function handleGenerateContract(reservationId: string) {
    setGeneratingFor(reservationId)
    setError(null)
    setSuccess(null)

    try {
      const result = await generateContract(reservationId)
      setSuccess(result.previewUrl ? `Contrato gerado. Prévia: ${result.previewUrl}` : 'Contrato gerado com sucesso.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao gerar contrato.')
    } finally {
      setGeneratingFor(null)
    }
  }

  async function handleAdminSignature(contractId: string) {
    setSigningFor(contractId)
    setError(null)
    setSuccess(null)

    try {
      await registerAdminSignature({
        contractId,
        signer_name: 'Administrador 3Deventos',
      })
      setSuccess('Assinatura do administrador registrada com sucesso.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao assinar contrato.')
    } finally {
      setSigningFor(null)
    }
  }

  return (
    <div className="stack-lg">
      <PageHeader title="Contratos" description="Controle de geração, liberação e assinaturas pendentes do contrato." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card table-card">
        {loading ? (
          <p>Carregando contratos...</p>
        ) : contracts.length === 0 ? (
          <p>Nenhum contrato gerado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Cliente</th>
                <th>Versão</th>
                <th>Status</th>
                <th>Assinaturas</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const reservation = reservationMap[contract.reservation_id]
                const signatures = signaturesMap[contract.id] ?? []
                const hasClientSignature = signatures.some((item) => item.signer_role === 'client')
                const hasAdminSignature = signatures.some((item) => item.signer_role === 'admin')
                return (
                  <tr key={contract.id}>
                    <td data-label="Evento">{reservation ? formatDate(reservation.event_date) : '-'}</td>
                    <td data-label="Cliente">{reservation?.customer_name ?? '-'}</td>
                    <td data-label="Versão">{contract.version}</td>
                    <td data-label="Status">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td data-label="Assinaturas">
                      <div className="stack-list compact-stack">
                        {signatures.length === 0 ? (
                          <span className="table-helper">Sem assinaturas ainda</span>
                        ) : (
                          signatures.map((signature) => (
                            <span key={signature.id} className="table-helper">
                              {signature.signer_role}: {formatDateTime(signature.signed_at)}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td data-label="Ações">
                      <div className="table-actions">
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleGenerateContract(contract.reservation_id)}
                          disabled={generatingFor === contract.reservation_id}
                        >
                          {generatingFor === contract.reservation_id ? 'Gerando...' : 'Regenerar'}
                        </button>
                        {hasClientSignature && !hasAdminSignature ? (
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => void handleAdminSignature(contract.id)}
                            disabled={signingFor === contract.id}
                          >
                            {signingFor === contract.id ? 'Assinando...' : 'Assinar admin'}
                          </button>
                        ) : null}
                        {contract.file_path ? (
                          <a className="button button-secondary" href={contract.file_path} target="_blank" rel="noreferrer">
                            Abrir contrato
                          </a>
                        ) : (
                          <span className="table-helper">Sem arquivo</span>
                        )}
                      </div>
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
