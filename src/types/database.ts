export type LeadStatus = 'novo' | 'em_contato' | 'proposta_enviada' | 'convertido' | 'perdido'

export type ReservationStatus =
  | 'interesse_enviado'
  | 'bloqueio_temporario'
  | 'aguardando_pagamento'
  | 'reservado'
  | 'cancelado'

export type PaymentStatus = 'pendente' | 'pago' | 'falhou' | 'estornado'

export type ContractStatus =
  | 'rascunho'
  | 'aguardando_geracao'
  | 'liberado_assinatura'
  | 'assinado'
  | 'cancelado'

export type PaymentOrderStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled'

export type SecureLinkType = 'proposal' | 'contract_view' | 'contract_sign' | 'status' | 'payment'

export type SignerRole = 'client' | 'admin'

export type WhatsappMessageStatus = 'queued' | 'sent' | 'failed'

export type SpaceMediaType = 'image' | 'video'

export interface Space {
  id: string
  name: string
  slug: string
  active: boolean
  created_at?: string
  updated_at?: string
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
  final_file_path?: string | null
  html_content?: string | null
  template_key?: string | null
  generated_at?: string | null
  released_at?: string | null
  document_hash?: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentOrder {
  id: string
  reservation_id: string
  provider: string
  provider_external_id: string | null
  checkout_url: string | null
  pix_qr_code: string | null
  pix_copy_paste: string | null
  amount: number
  status: PaymentOrderStatus
  expires_at: string
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface PaymentEvent {
  id: string
  payment_order_id: string | null
  provider: string
  event_type: string
  payload_json: Record<string, unknown>
  received_at: string
  processed_at: string | null
  success: boolean
}

export interface SecureLink {
  id: string
  reservation_id: string
  type: SecureLinkType
  token: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_by?: string | null
  created_at: string
}

export interface Signature {
  id: string
  contract_id: string
  signer_role: SignerRole
  signer_name: string
  signer_document: string | null
  signed_at: string
  ip_address: string | null
  user_agent: string | null
  evidence_json: Record<string, unknown>
  document_hash: string | null
  created_at: string
}

export interface WhatsappMessage {
  id: string
  reservation_id: string | null
  lead_id: string | null
  template_name: string
  phone: string
  message_body: string
  status: WhatsappMessageStatus
  provider_message_id: string | null
  sent_at: string | null
  error_message: string | null
  created_at: string
}

export interface SpaceMedia {
  id: string
  space_id: string
  type: SpaceMediaType
  title: string
  description: string | null
  storage_path: string | null
  external_url: string | null
  thumbnail_path: string | null
  display_order: number
  active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface ReservationLookup {
  link_type?: SecureLinkType | 'public_token' | null
  reservation: Reservation
  payments: Payment[]
  paymentOrders: PaymentOrder[]
  activePaymentOrder: PaymentOrder | null
  contract: Contract | null
  signatures: Signature[]
}

export interface DashboardSummary {
  totalLeads: number
  totalReservations: number
  confirmedReservations: number
  pendingPayments: number
  pendingContracts: number
  occupancyRate: number
  activePaymentOrders: number
  mediaItems: number
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

export interface CreatePaymentOrderInput {
  reservationId: string
  amount: number
  expiresInMinutes?: number
  title?: string
}

export interface CreateSignatureInput {
  token: string
  signer_name: string
  signer_document?: string
}

export interface UpsertSpaceMediaInput {
  id?: string
  space_id: string
  type: SpaceMediaType
  title: string
  description?: string
  external_url?: string
  thumbnail_path?: string
  display_order?: number
  active?: boolean
  is_featured?: boolean
}
