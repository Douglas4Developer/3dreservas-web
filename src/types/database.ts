export type LeadStatus = 'novo' | 'em_contato' | 'proposta_enviada' | 'convertido' | 'perdido'
export type ReservationStatus =
  | 'interesse_enviado'
  | 'bloqueio_temporario'
  | 'aguardando_pagamento'
  | 'reservado'
  | 'cancelado'
export type PaymentStatus = 'pendente' | 'pago' | 'falhou' | 'estornado'
export type ContractStatus = 'rascunho' | 'liberado_assinatura' | 'assinado' | 'cancelado'

export interface Space {
  id: string
  name: string
  slug: string
  active: boolean
}

export interface Lead {
  id: string
  space_id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  desired_date: string
  message: string | null
  source: string
  status: LeadStatus
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  space_id: string
  lead_id: string | null
  customer_name: string
  customer_phone: string
  customer_email: string | null
  event_date: string
  period_start: string
  period_end: string
  guests_expected: number | null
  total_amount: number | null
  entry_amount: number | null
  entry_due_at: string | null
  expires_at: string | null
  status: ReservationStatus
  public_link_token: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  reservation_id: string
  amount: number
  status: PaymentStatus
  provider: string | null
  provider_reference: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Contract {
  id: string
  reservation_id: string
  version: number
  status: ContractStatus
  file_path: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

export interface ReservationLookup {
  reservation: Reservation
  payments: Payment[]
  contract: Contract | null
}

export interface DashboardSummary {
  totalLeads: number
  totalReservations: number
  confirmedReservations: number
  pendingPayments: number
  pendingContracts: number
  occupancyRate: number
}

export interface CalendarDay {
  event_date: string
  status: ReservationStatus
}

export interface CreateLeadInput {
  customer_name: string
  customer_phone: string
  customer_email?: string
  desired_date: string
  message?: string
  space_id: string
}

export interface CreateReservationInput {
  customer_name: string
  customer_phone: string
  customer_email?: string
  event_date: string
  total_amount?: number
  entry_amount?: number
  status?: ReservationStatus
  notes?: string
  space_id: string
}
