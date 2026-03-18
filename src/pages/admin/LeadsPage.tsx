import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, formatPhone } from '../../lib/format'
import { createReservation } from '../../services/reservations.service'
import { fetchLeads, updateLead } from '../../services/leads.service'
import type { Lead } from '../../types/database'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      setLeads(await fetchLeads())
      setError(null)
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao carregar interesses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function handleConvertLead(lead: Lead) {
    const eventDate = window.prompt('Data inicial da reserva:', lead.desired_date)
    if (!eventDate) return

    const totalAmountText = window.prompt('Valor total da reserva (opcional):', '') ?? ''
    const entryAmountText = window.prompt('Valor da entrada (opcional):', '') ?? ''

    setConvertingLeadId(lead.id)
    setError(null)
    setSuccess(null)

    try {
      await createReservation({
        lead_id: lead.id,
        space_id: lead.space_id,
        customer_name: lead.customer_name,
        customer_phone: lead.customer_phone,
        customer_email: lead.customer_email ?? undefined,
        event_date: eventDate,
        end_date: eventDate,
        event_type: 'Evento a definir',
        period_start: '09:00',
        period_end: '23:00',
        total_amount: totalAmountText ? Number(totalAmountText) : undefined,
        entry_amount: entryAmountText ? Number(entryAmountText) : undefined,
        remaining_amount:
          totalAmountText && entryAmountText ? Number(totalAmountText) - Number(entryAmountText) : undefined,
        status: 'interesse_enviado',
        notes: lead.message ?? undefined,
      })

      await updateLead(lead.id, { status: 'convertido' })
      setSuccess('Lead convertido em reserva com sucesso.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao converter lead em reserva.')
    } finally {
      setConvertingLeadId(null)
    }
  }

  return (
    <div className="stack-lg">
      <PageHeader title="Interesses recebidos" description="Leads gerados pelo site público, WhatsApp ou operação manual." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card table-card">
        {loading ? (
          <p>Carregando interesses...</p>
        ) : leads.length === 0 ? (
          <p>Nenhum interesse cadastrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Data desejada</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td data-label="Cliente">
                    <strong>{lead.customer_name}</strong>
                    <div className="table-helper">{lead.customer_email ?? 'Sem e-mail'}</div>
                    {lead.message ? <div className="table-helper">{lead.message}</div> : null}
                  </td>
                  <td data-label="Contato">{formatPhone(lead.customer_phone)}</td>
                  <td data-label="Data desejada">{formatDate(lead.desired_date)}</td>
                  <td data-label="Origem">{lead.source}</td>
                  <td data-label="Status">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td data-label="Ações">
                    <div className="table-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => void handleConvertLead(lead)}
                        disabled={convertingLeadId === lead.id || lead.status === 'convertido'}
                      >
                        {convertingLeadId === lead.id ? 'Convertendo...' : lead.status === 'convertido' ? 'Já convertido' : 'Converter em reserva'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
