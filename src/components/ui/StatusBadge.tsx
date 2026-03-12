import type { ContractStatus, LeadStatus, PaymentStatus, ReservationStatus } from '../../types/database'

type SupportedStatus = LeadStatus | ReservationStatus | PaymentStatus | ContractStatus

const statusLabelMap: Record<SupportedStatus, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  proposta_enviada: 'Proposta enviada',
  convertido: 'Convertido',
  perdido: 'Perdido',
  interesse_enviado: 'Interesse',
  bloqueio_temporario: 'Bloqueado',
  aguardando_pagamento: 'Aguardando pagamento',
  reservado: 'Reservado',
  cancelado: 'Cancelado',
  pendente: 'Pendente',
  pago: 'Pago',
  falhou: 'Falhou',
  estornado: 'Estornado',
  rascunho: 'Rascunho',
  liberado_assinatura: 'Aguardando assinatura',
  assinado: 'Assinado',
}

export function StatusBadge({ status }: { status: SupportedStatus }) {
  return <span className={`status-badge status-${status}`}>{statusLabelMap[status] ?? status}</span>
}
