import { formatCurrency, formatDateRange } from './format'
import {
  DEFAULT_CONTRACT_INTRO,
  DEFAULT_CONTRACT_TITLE,
  DEFAULT_FORUM_CITY,
  DEFAULT_LESSOR_ADDRESS,
  DEFAULT_LESSOR_DOCUMENT,
  DEFAULT_LESSOR_NAME,
  cloneDefaultContractTerms,
} from './contract-defaults'
import type { ContractClause, ReservationLookup } from '../types/database'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeText(value?: string | null) {
  return (value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

function splitParagraphs(value?: string | null) {
  return normalizeText(value)
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function renderInlineBreaks(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

function renderParagraphs(value?: string | null) {
  return splitParagraphs(value)
    .map((paragraph) => `<p class="contract-document__paragraph">${renderInlineBreaks(paragraph)}</p>`)
    .join('')
}

function clauseToPlainText(clause: ContractClause) {
  return `${clause.title}\n${splitParagraphs(clause.body).join('\n\n')}`.trim()
}

function renderClause(clause: ContractClause, index: number) {
  return `
    <section class="contract-document__clause">
      <h3><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(clause.title)}</h3>
      <div class="contract-document__clause-body">
        ${renderParagraphs(clause.body)}
      </div>
    </section>
  `
}

export function buildContractPlainText(lookup: ReservationLookup) {
  const reservation = lookup.reservation
  const contract = lookup.contract
  const defaultTerms = cloneDefaultContractTerms()
  const terms = contract?.contract_terms_json ?? defaultTerms
  const clauses = terms.custom_clauses?.length ? terms.custom_clauses : defaultTerms.custom_clauses ?? []

  const lessorName = contract?.lessor_name || DEFAULT_LESSOR_NAME
  const lessorDocument = contract?.lessor_document || DEFAULT_LESSOR_DOCUMENT
  const lessorAddress = contract?.lessor_address || DEFAULT_LESSOR_ADDRESS
  const forumCity = contract?.forum_city || DEFAULT_FORUM_CITY
  const venueAddress = reservation.venue_address_snapshot || 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia – GO'
  const period = formatDateRange(reservation.event_date, reservation.end_date)
  const total = formatCurrency(reservation.total_amount)
  const entry = formatCurrency(reservation.entry_amount)
  const remaining = formatCurrency(reservation.remaining_amount)
  const cleaningFee = formatCurrency(reservation.cleaning_fee)

  return [
    terms.contract_title || DEFAULT_CONTRACT_TITLE,
    terms.intro_text || DEFAULT_CONTRACT_INTRO,
    `LOCADOR: ${lessorName}, CPF/CNPJ nº ${lessorDocument}, residente em ${lessorAddress}, doravante denominado LOCADOR.`,
    `LOCATÁRIO: ${reservation.customer_name}, CPF/CNPJ nº ${reservation.customer_document || 'não informado'}, telefone ${reservation.customer_phone || 'não informado'}, e-mail ${reservation.customer_email || 'não informado'}, endereço ${reservation.customer_address || 'não informado'}, doravante denominado LOCATÁRIO.`,
    `RESUMO DA RESERVA: Local: ${venueAddress}. Evento: ${reservation.event_type || 'Evento informado na reserva'}. Período: ${period} das ${reservation.period_start} às ${reservation.period_end}. Convidados: ${reservation.guests_expected ?? 'não informado'}. Valor total: ${total}. Entrada: ${entry}. Saldo restante: ${remaining}. Taxa de limpeza: ${cleaningFee} quando aplicável.`,
    ...clauses.map(clauseToPlainText),
    `Foro eleito: ${forumCity}.`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildContractPreviewHtml(lookup: ReservationLookup) {
  const reservation = lookup.reservation
  const contract = lookup.contract
  const defaultTerms = cloneDefaultContractTerms()
  const terms = contract?.contract_terms_json ?? defaultTerms
  const clauses = terms.custom_clauses?.length ? terms.custom_clauses : defaultTerms.custom_clauses ?? []

  const lessorName = contract?.lessor_name || DEFAULT_LESSOR_NAME
  const lessorDocument = contract?.lessor_document || DEFAULT_LESSOR_DOCUMENT
  const lessorAddress = contract?.lessor_address || DEFAULT_LESSOR_ADDRESS
  const forumCity = contract?.forum_city || DEFAULT_FORUM_CITY
  const venueAddress = reservation.venue_address_snapshot || 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia – GO'
  const period = formatDateRange(reservation.event_date, reservation.end_date)
  const total = formatCurrency(reservation.total_amount)
  const entry = formatCurrency(reservation.entry_amount)
  const remaining = formatCurrency(reservation.remaining_amount)
  const cleaningFee = formatCurrency(reservation.cleaning_fee)

  return `
    <article class="contract-document contract-document--readable">
      <header class="contract-document__header">
        <span class="contract-document__eyebrow">Contrato digital 3DEventos</span>
        <h1>${escapeHtml(terms.contract_title || DEFAULT_CONTRACT_TITLE)}</h1>
        <p>${escapeHtml(terms.intro_text || DEFAULT_CONTRACT_INTRO)}</p>
      </header>

      <section class="contract-document__parties">
        <h2>Qualificação das partes</h2>
        <div class="contract-document__party-card">
          <strong>LOCADOR</strong>
          <p>${escapeHtml(lessorName)}, CPF/CNPJ nº ${escapeHtml(lessorDocument)}, residente em ${escapeHtml(lessorAddress)}, doravante denominado LOCADOR.</p>
        </div>
        <div class="contract-document__party-card">
          <strong>LOCATÁRIO</strong>
          <p>${escapeHtml(reservation.customer_name)}, CPF/CNPJ nº ${escapeHtml(reservation.customer_document || 'não informado')}, telefone ${escapeHtml(reservation.customer_phone || 'não informado')}, e-mail ${escapeHtml(reservation.customer_email || 'não informado')}, endereço ${escapeHtml(reservation.customer_address || 'não informado')}, doravante denominado LOCATÁRIO.</p>
        </div>
      </section>

      <section class="contract-document__summary">
        <h2>Resumo da reserva</h2>
        <div class="contract-document__summary-grid">
          <span><strong>Local</strong>${escapeHtml(venueAddress)}</span>
          <span><strong>Evento</strong>${escapeHtml(reservation.event_type || 'Evento informado na reserva')}</span>
          <span><strong>Período</strong>${escapeHtml(period)} das ${escapeHtml(reservation.period_start)} às ${escapeHtml(reservation.period_end)}</span>
          <span><strong>Convidados</strong>${escapeHtml(String(reservation.guests_expected ?? 'não informado'))}</span>
          <span><strong>Valor total</strong>${escapeHtml(total)}</span>
          <span><strong>Entrada</strong>${escapeHtml(entry)}</span>
          <span><strong>Saldo restante</strong>${escapeHtml(remaining)}</span>
          <span><strong>Taxa de limpeza</strong>${escapeHtml(cleaningFee)} quando aplicável</span>
        </div>
      </section>

      <div class="contract-document__clauses">
        <h2>Cláusulas contratuais</h2>
        ${clauses.map(renderClause).join('')}
      </div>

      <footer class="contract-document__footer">
        <p><strong>Foro eleito:</strong> ${escapeHtml(forumCity)}.</p>
        <div class="contract-document__signature-lines">
          <div><span></span><strong>LOCADOR</strong><small>${escapeHtml(lessorName)}</small></div>
          <div><span></span><strong>LOCATÁRIO</strong><small>${escapeHtml(reservation.customer_name)}</small></div>
        </div>
      </footer>
    </article>
  `
}
