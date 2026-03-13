import type {
  ContractStatus,
  LeadStatus,
  PaymentOrderStatus,
  PaymentStatus,
  ReservationStatus,
  WhatsappMessageStatus,
} from '../../types/database'

type SupportedStatus =
  | LeadStatus
  | ReservationStatus
  | PaymentStatus
  | ContractStatus
  | PaymentOrderStatus
  | WhatsappMessageStatus

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
  aguardando_geracao: 'Aguardando geração',
  liberado_assinatura: 'Aguardando assinatura',
  assinado: 'Assinado',
  pending: 'Checkout pendente',
  approved: 'Pagamento aprovado',
  paid: 'Checkout pago',
  expired: 'Expirado',
  failed: 'Falhou',
  cancelled: 'Cancelado',
  queued: 'Na fila',
  sent: 'Enviado',
}

export function StatusBadge({ status }: { status: SupportedStatus }) {
  return <span className={`status-badge status-${status}`}>{statusLabelMap[status] ?? status}</span>
}
