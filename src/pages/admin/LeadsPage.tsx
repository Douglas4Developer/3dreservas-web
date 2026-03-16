import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, formatPhone } from '../../lib/format'
import { fetchLeads } from '../../services/leads.service'
import type { Lead } from '../../types/database'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeads()
      .then((data) => setLeads(data))
      .catch((serviceError) => setError(serviceError.message || 'Erro ao carregar interesses.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="stack-lg">
      <PageHeader title="Interesses recebidos" description="Leads gerados pelo site público, WhatsApp ou operação manual." />

      {error ? <div className="alert alert-error">{error}</div> : null}

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
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td data-label="Cliente">
                    <strong>{lead.customer_name}</strong>
                    <div className="table-helper">{lead.customer_email ?? 'Sem e-mail'}</div>
                  </td>
                  <td data-label="Contato">{formatPhone(lead.customer_phone)}</td>
                  <td data-label="Data desejada">{formatDate(lead.desired_date)}</td>
                  <td data-label="Origem">{lead.source}</td>
                  <td data-label="Status">
                    <StatusBadge status={lead.status} />
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
