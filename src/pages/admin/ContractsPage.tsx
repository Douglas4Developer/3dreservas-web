import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, formatDateTime } from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { deleteContract, fetchContracts, generateContract, getReservationLinks, updateContract } from '../../services/contracts.service'
import { fetchReservations } from '../../services/reservations.service'
import { fetchSignatures, registerAdminSignature } from '../../services/signatures.service'
import type { Contract, ContractClause, ContractTermsJson, Reservation, Signature } from '../../types/database'

const emptyClause: ContractClause = { title: '', body: '' }

function normalizeContractTerms(contract?: Contract | null) {
  const terms = contract?.contract_terms_json ?? {}
  return {
    lessor_name: contract?.lessor_name ?? 'Douglas Soares de Souza Ferreira',
    lessor_document: contract?.lessor_document ?? '708.321.121-35',
    lessor_address: contract?.lessor_address ?? 'Estrada 114 QD3 LT 13, Chácara São Joaquim, Goiânia - GO',
    forum_city: contract?.forum_city ?? 'Goiânia - GO',
    logo_url: terms.logo_url ?? '',
    contract_title: terms.contract_title ?? '',
    intro_text: terms.intro_text ?? '',
    show_default_clauses: terms.show_default_clauses !== false,
    custom_clauses:
      Array.isArray(terms.custom_clauses) && terms.custom_clauses.length > 0
        ? terms.custom_clauses.map((item) => ({ title: item.title ?? '', body: item.body ?? '' }))
        : [{ ...emptyClause }],
  }
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [signaturesMap, setSignaturesMap] = useState<Record<string, Signature[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [signingFor, setSigningFor] = useState<string | null>(null)
  const [deletingFor, setDeletingFor] = useState<string | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState(() => normalizeContractTerms())

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

      if (!selectedContractId && contractData.length > 0) {
        setSelectedContractId(contractData[0].id)
      }
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

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? contracts[0] ?? null,
    [contracts, selectedContractId],
  )

  useEffect(() => {
    setTemplateForm(normalizeContractTerms(selectedContract))
  }, [selectedContract])

  async function handleGenerateContract(reservationId: string) {
    setGeneratingFor(reservationId)
    setError(null)
    setSuccess(null)

    try {
      const result = await generateContract(reservationId)
      setSuccess(result.previewUrl ? `Contrato gerado. Prévia/PDF: ${result.previewUrl}` : 'Contrato gerado com sucesso.')
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

  async function handleDeleteContract(contractId: string) {
    const confirmed = window.confirm('Deseja realmente excluir este contrato? As assinaturas vinculadas também serão removidas.')
    if (!confirmed) return

    setDeletingFor(contractId)
    setError(null)
    setSuccess(null)

    try {
      await deleteContract(contractId)
      setSuccess('Contrato excluído com sucesso.')
      if (selectedContractId === contractId) {
        setSelectedContractId(null)
      }
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao excluir contrato.')
    } finally {
      setDeletingFor(null)
    }
  }

  async function copyText(value: string, successMessage: string) {
    await navigator.clipboard.writeText(value)
    setSuccess(successMessage)
  }

  async function handleCopyContractLink(reservationId: string) {
    try {
      const links = await getReservationLinks(reservationId)
      if (!links.contractViewUrl) throw new Error('Gere o contrato antes de copiar esse link.')
      await copyText(links.contractViewUrl, 'Link do contrato copiado.')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao copiar link do contrato.')
    }
  }

  async function handleCopySignLink(reservationId: string) {
    try {
      const links = await getReservationLinks(reservationId)
      if (!links.contractSignUrl) throw new Error('Gere o contrato antes de copiar esse link.')
      await copyText(links.contractSignUrl, 'Link de assinatura copiado.')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao copiar link de assinatura.')
    }
  }

  async function handleShareContract(reservationId: string) {
    try {
      const links = await getReservationLinks(reservationId)
      if (!links.contractWhatsappUrl) throw new Error('Gere o contrato antes de enviar esse link.')
      window.open(links.contractWhatsappUrl, '_blank', 'noopener,noreferrer')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao abrir compartilhamento do contrato.')
    }
  }

  function updateClause(index: number, field: keyof ContractClause, value: string) {
    setTemplateForm((current) => ({
      ...current,
      custom_clauses: current.custom_clauses.map((clause, clauseIndex) =>
        clauseIndex === index ? { ...clause, [field]: value } : clause,
      ),
    }))
  }

  function addClause() {
    setTemplateForm((current) => ({
      ...current,
      custom_clauses: [...current.custom_clauses, { ...emptyClause }],
    }))
  }

  function removeClause(index: number) {
    setTemplateForm((current) => ({
      ...current,
      custom_clauses: current.custom_clauses.filter((_, clauseIndex) => clauseIndex !== index),
    }))
  }

  async function handleSaveTemplate() {
    if (!selectedContract) {
      setError('Selecione um contrato para modelar.')
      return
    }

    setSavingTemplate(true)
    setError(null)
    setSuccess(null)

    try {
      const contractTermsJson: ContractTermsJson = {
        logo_url: templateForm.logo_url || undefined,
        contract_title: templateForm.contract_title || undefined,
        intro_text: templateForm.intro_text || undefined,
        show_default_clauses: templateForm.show_default_clauses,
        custom_clauses: templateForm.custom_clauses
          .map((item) => ({ title: item.title.trim(), body: item.body.trim() }))
          .filter((item) => item.title && item.body),
      }

      await updateContract(selectedContract.id, {
        lessor_name: templateForm.lessor_name,
        lessor_document: templateForm.lessor_document,
        lessor_address: templateForm.lessor_address,
        forum_city: templateForm.forum_city,
        contract_terms_json: contractTermsJson,
      })

      await generateContract(selectedContract.reservation_id)
      setSuccess('Modelo do contrato salvo e regenerado com sucesso.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao salvar o modelo do contrato.')
    } finally {
      setSavingTemplate(false)
    }
  }

  return (
    <div className="stack-lg">
      <PageHeader title="Contratos" description="Controle de geração, links, assinaturas e modelagem dinâmica do contrato." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="dashboard-grid dashboard-airbnb-grid dashboard-airbnb-grid--two-columns">
        <article className="card form-card">
          <h3>Modelador do contrato</h3>
          <p>Selecione um contrato da lista para personalizar logo, dados do locador e cláusulas adicionais.</p>

          {!selectedContract ? (
            <p>Gere ou selecione um contrato para começar.</p>
          ) : (
            <div className="form-grid">
              <label>
                Contrato selecionado
                <select value={selectedContract.id} onChange={(event) => setSelectedContractId(event.target.value)}>
                  {contracts.map((contract) => {
                    const reservation = reservationMap[contract.reservation_id]
                    return (
                      <option key={contract.id} value={contract.id}>
                        {reservation?.customer_name ?? 'Cliente'} • {reservation ? formatDate(reservation.event_date) : 'Sem data'}
                      </option>
                    )
                  })}
                </select>
              </label>

              <div className="inline-form-grid inline-form-grid--two">
                <label>
                  Nome do locador
                  <input value={templateForm.lessor_name} onChange={(event) => setTemplateForm((current) => ({ ...current, lessor_name: event.target.value }))} />
                </label>
                <label>
                  Documento do locador
                  <input value={templateForm.lessor_document} onChange={(event) => setTemplateForm((current) => ({ ...current, lessor_document: event.target.value }))} />
                </label>
              </div>

              <label>
                Endereço do locador
                <textarea rows={2} value={templateForm.lessor_address} onChange={(event) => setTemplateForm((current) => ({ ...current, lessor_address: event.target.value }))} />
              </label>

              <div className="inline-form-grid inline-form-grid--two">
                <label>
                  Foro
                  <input value={templateForm.forum_city} onChange={(event) => setTemplateForm((current) => ({ ...current, forum_city: event.target.value }))} />
                </label>
                <label>
                  URL da logo
                  <input value={templateForm.logo_url} onChange={(event) => setTemplateForm((current) => ({ ...current, logo_url: event.target.value }))} placeholder="https://..." />
                </label>
              </div>

              <label>
                Título do contrato
                <input value={templateForm.contract_title} onChange={(event) => setTemplateForm((current) => ({ ...current, contract_title: event.target.value }))} placeholder="Contrato de locação..." />
              </label>

              <label>
                Texto de introdução
                <textarea rows={3} value={templateForm.intro_text} onChange={(event) => setTemplateForm((current) => ({ ...current, intro_text: event.target.value }))} />
              </label>

              <label className="line-card" style={{ alignItems: 'center' }}>
                <span>
                  <strong>Manter cláusulas padrão</strong>
                  <p>Desative se quiser trabalhar apenas com cláusulas personalizadas.</p>
                </span>
                <input
                  type="checkbox"
                  checked={templateForm.show_default_clauses}
                  onChange={(event) => setTemplateForm((current) => ({ ...current, show_default_clauses: event.target.checked }))}
                />
              </label>

              <div className="stack-list">
                <div className="line-card">
                  <div>
                    <strong>Cláusulas extras</strong>
                    <p>Adicione quantas cláusulas quiser ao contrato.</p>
                  </div>
                  <button className="button button-secondary" type="button" onClick={addClause}>
                    Adicionar cláusula
                  </button>
                </div>

                {templateForm.custom_clauses.map((clause, index) => (
                  <div className="signature-card" key={`clause-${index}`}>
                    <label>
                      Título da cláusula
                      <input value={clause.title} onChange={(event) => updateClause(index, 'title', event.target.value)} placeholder={`Cláusula ${index + 1}`} />
                    </label>
                    <label>
                      Texto da cláusula
                      <textarea rows={4} value={clause.body} onChange={(event) => updateClause(index, 'body', event.target.value)} />
                    </label>
                    <div className="contract-action-row">
                      <button className="button button-secondary" type="button" onClick={() => removeClause(index)} disabled={templateForm.custom_clauses.length === 1}>
                        Remover cláusula
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="table-actions">
                <button className="button" type="button" onClick={() => void handleSaveTemplate()} disabled={savingTemplate}>
                  {savingTemplate ? 'Salvando...' : 'Salvar modelo e regenerar'}
                </button>
              </div>
            </div>
          )}
        </article>

        <article className="card table-card">
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
                          <button className="button button-secondary" type="button" onClick={() => setSelectedContractId(contract.id)}>
                            Modelar
                          </button>
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
                          <button className="button button-secondary" type="button" onClick={() => void handleCopyContractLink(contract.reservation_id)}>
                            Copiar contrato
                          </button>
                          <button className="button button-secondary" type="button" onClick={() => void handleCopySignLink(contract.reservation_id)}>
                            Copiar assinatura
                          </button>
                          <button className="button button-secondary" type="button" onClick={() => void handleShareContract(contract.reservation_id)}>
                            Enviar no WhatsApp
                          </button>
                          {contract.final_file_path || contract.file_path ? (
                            <a className="button button-secondary" href={contract.final_file_path ?? contract.file_path ?? '#'} target="_blank" rel="noreferrer">
                              Abrir contrato
                            </a>
                          ) : (
                            <span className="table-helper">Sem arquivo</span>
                          )}
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => void handleDeleteContract(contract.id)}
                            disabled={deletingFor === contract.id}
                          >
                            {deletingFor === contract.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </article>
      </div>
    </div>
  )
}
