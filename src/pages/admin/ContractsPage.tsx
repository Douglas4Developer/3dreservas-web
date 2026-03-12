import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, formatDateTime } from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { fetchContracts, generateContract } from '../../services/contracts.service'
import { fetchReservations } from '../../services/reservations.service'
import { fetchSignatures, registerAdminSignature } from '../../services/signatures.service'
import type { Contract, Reservation, Signature } from '../../types/database'

interface ContractRow {
  reservation: Reservation
  contract: Contract | null
  signatures: Signature[]
}

export default function ContractsPage() {
  const [rows, setRows] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [signingFor, setSigningFor] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const [contractData, reservationData] = await Promise.all([fetchContracts(), fetchReservations()])

      const contractMap = contractData.reduce<Record<string, Contract>>((accumulator, contract) => {
        accumulator[contract.reservation_id] = contract
        return accumulator
      }, {})

      const eligibleReservations = reservationData.filter((reservation) => ['reservado', 'aguardando_pagamento'].includes(reservation.status))
      const signaturesEntries = await Promise.all(
        contractData.map(async (contract) => [contract.id, await fetchSignatures(contract.id)] as const),
      )
      const signaturesMap = Object.fromEntries(signaturesEntries)

      setRows(
        eligibleReservations.map((reservation) => {
          const contract = contractMap[reservation.id] ?? null
          return {
            reservation,
            contract,
            signatures: contract ? signaturesMap[contract.id] ?? [] : [],
          }
        }),
      )
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

  useEffect(() => subscribeToTables(['contracts', 'signatures', 'reservations'], () => void loadData()), [])

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
        ) : rows.length === 0 ? (
          <p>Nenhuma reserva apta para contrato ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Cliente</th>
                <th>Reserva</th>
                <th>Contrato</th>
                <th>Assinaturas</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ reservation, contract, signatures }) => {
                const hasClientSignature = signatures.some((item) => item.signer_role === 'client')
                const hasAdminSignature = signatures.some((item) => item.signer_role === 'admin')
                return (
                  <tr key={reservation.id}>
                    <td>{formatDate(reservation.event_date)}</td>
                    <td>{reservation.customer_name}</td>
                    <td>
                      <StatusBadge status={reservation.status} />
                    </td>
                    <td>
                      {contract ? (
                        <div className="stack-list">
                          <span>Versão {contract.version}</span>
                          <StatusBadge status={contract.status} />
                        </div>
                      ) : (
                        <span className="table-helper">Ainda não gerado</span>
                      )}
                    </td>
                    <td>
                      <div className="stack-list">
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
                    <td>
                      <div className="table-actions">
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleGenerateContract(reservation.id)}
                          disabled={generatingFor === reservation.id}
                        >
                          {generatingFor === reservation.id ? 'Gerando...' : contract ? 'Regenerar' : 'Gerar contrato'}
                        </button>

                        {contract && hasClientSignature && !hasAdminSignature ? (
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => void handleAdminSignature(contract.id)}
                            disabled={signingFor === contract.id}
                          >
                            {signingFor === contract.id ? 'Assinando...' : 'Assinar admin'}
                          </button>
                        ) : null}

                        {contract?.file_path ? (
                          <a className="button button-secondary" href={contract.file_path} target="_blank" rel="noreferrer">
                            Abrir arquivo
                          </a>
                        ) : contract?.html_content ? (
                          <span className="table-helper">Prévia HTML pronta</span>
                        ) : null}
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
