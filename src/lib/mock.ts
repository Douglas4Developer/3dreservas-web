import type {
  CalendarDay,
  Contract,
  DashboardSummary,
  Lead,
  Payment,
  PaymentOrder,
  Reservation,
  ReservationLookup,
  SecureLink,
  Signature,
  Space,
  SpaceMedia,
  WhatsappMessage,
} from '../types/database'

const today = new Date()
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (days: number) => {
  const copy = new Date(today.getTime())
  copy.setDate(copy.getDate() + days)
  return toIsoDate(copy)
}
const addHours = (hours: number) => new Date(Date.now() + 1000 * 60 * 60 * hours).toISOString()
const addMinutes = (minutes: number) => new Date(Date.now() + 1000 * 60 * minutes).toISOString()

export const mockSpace: Space = {
  id: 'space-3deventos',
  name: '3Deventos',
  slug: '3deventos',
  active: true,
}

export const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    space_id: mockSpace.id,
    customer_name: 'Mariana Alves',
    customer_phone: '(62) 99999-1111',
    customer_email: 'mariana@email.com',
    desired_date: addDays(6),
    message: 'Quero orçamento para aniversário com piscina aquecida.',
    source: 'site',
    status: 'novo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead-2',
    space_id: mockSpace.id,
    customer_name: 'Carlos Pereira',
    customer_phone: '(62) 98888-2222',
    customer_email: 'carlos@email.com',
    desired_date: addDays(14),
    message: 'Evento corporativo de domingo.',
    source: 'whatsapp',
    status: 'proposta_enviada',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockReservations: Reservation[] = [
  {
    id: 'res-1',
    space_id: mockSpace.id,
    lead_id: 'lead-2',
    customer_name: 'Carlos Pereira',
    customer_phone: '(62) 98888-2222',
    customer_email: 'carlos@email.com',
    customer_document: null,
    customer_address: null,
    event_date: addDays(14),
    event_type: null,
    period_start: '09:00',
    period_end: '23:00',
    guests_expected: 60,
    total_amount: 950,
    entry_amount: 400,
    remaining_amount: null,
    cleaning_fee: 100,
    entry_due_at: addHours(24),
    expires_at: addMinutes(90),
    status: 'aguardando_pagamento',
    public_link_token: 'demo-token-aguardando',
    notes: 'Cliente pediu espaço com visita técnica.',
    image_use_authorized: true,
    venue_address_snapshot: 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia - GO',
    capacity_snapshot: 100,
    created_by: 'demo-admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-2',
    space_id: mockSpace.id,
    lead_id: null,
    customer_name: 'Patrícia Souza',
    customer_phone: '(62) 97777-3333',
    customer_email: 'patricia@email.com',
    customer_document: null,
    customer_address: null,
    event_date: addDays(20),
    event_type: null,
    period_start: '09:00',
    period_end: '23:00',
    guests_expected: 80,
    total_amount: 1200,
    entry_amount: 500,
    remaining_amount: null,
    cleaning_fee: 100,
    entry_due_at: new Date().toISOString(),
    expires_at: null,
    status: 'reservado',
    public_link_token: 'demo-token-confirmado',
    notes: 'Chá revelação.',
    image_use_authorized: true,
    venue_address_snapshot: 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia - GO',
    capacity_snapshot: 100,
    created_by: 'demo-admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-3',
    space_id: mockSpace.id,
    lead_id: null,
    customer_name: 'João Lima',
    customer_phone: '(62) 96666-4444',
    customer_email: 'joao@email.com',
    customer_document: null,
    customer_address: null,
    event_date: addDays(28),
    event_type: null,
    period_start: '09:00',
    period_end: '23:00',
    guests_expected: 40,
    total_amount: 800,
    entry_amount: 300,
    remaining_amount: null,
    cleaning_fee: 100,
    entry_due_at: new Date().toISOString(),
    expires_at: addHours(12),
    status: 'bloqueio_temporario',
    public_link_token: 'demo-token-bloqueado',
    notes: 'Aguardando retorno do cliente.',
    image_use_authorized: true,
    venue_address_snapshot: 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia - GO',
    capacity_snapshot: 100,
    created_by: 'demo-admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockPayments: Payment[] = [
  {
    id: 'pay-1',
    reservation_id: 'res-1',
    amount: 400,
    status: 'pendente',
    provider: 'mercado_pago',
    provider_reference: 'MP-DEMO-1',
    payment_method_type: null,
    payment_method_id: null,
    payment_method_label: null,
    paid_at: null,
    confirmed_by: null,
    confirmation_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pay-2',
    reservation_id: 'res-2',
    amount: 500,
    status: 'pago',
    provider: 'pix_manual',
    provider_reference: 'PIX-DEMO-2',
    payment_method_type: null,
    payment_method_id: null,
    payment_method_label: null,
    paid_at: new Date().toISOString(),
    confirmed_by: null,
    confirmation_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockPaymentOrders: PaymentOrder[] = [
  {
    id: 'po-1',
    reservation_id: 'res-1',
    provider: 'mercado_pago',
    provider_external_id: 'pref-demo-1',
    checkout_url: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=demo-1',
    pix_qr_code: null,
    pix_copy_paste: null,
    qr_code_base64: null,
    amount: 400,
    status: 'pending',
    expires_at: addMinutes(90),
    created_by: 'demo-admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'po-2',
    reservation_id: 'res-2',
    provider: 'mercado_pago',
    provider_external_id: 'pref-demo-2',
    checkout_url: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=demo-2',
    pix_qr_code: null,
    pix_copy_paste: null,
    qr_code_base64: null,
    amount: 500,
    status: 'paid',
    expires_at: addHours(2),
    created_by: 'demo-admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockContracts: Contract[] = [
  {
    id: 'contract-1',
    reservation_id: 'res-2',
    version: 1,
    status: 'assinado',
    file_path: 'https://example.com/contrato-demo.html',
    final_file_path: 'https://example.com/contrato-demo-final.html',
    html_content: '<h1>Contrato 3Deventos</h1><p>Contrato final assinado.</p>',
    template_key: 'default_v1',
    generated_at: new Date().toISOString(),
    released_at: new Date().toISOString(),
    document_hash: 'hash-demo-2',
    signed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'contract-2',
    reservation_id: 'res-1',
    version: 1,
    status: 'liberado_assinatura',
    file_path: 'https://example.com/contrato-rascunho.html',
    final_file_path: null,
    html_content: '<h1>Contrato 3Deventos</h1><p>Pagamento aprovado, aguardando assinatura.</p>',
    template_key: 'default_v1',
    generated_at: new Date().toISOString(),
    released_at: new Date().toISOString(),
    document_hash: 'hash-demo-1',
    signed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockSecureLinks: SecureLink[] = [
  {
    id: 'link-1',
    reservation_id: 'res-1',
    type: 'proposal',
    token: 'demo-proposta-1',
    expires_at: addHours(24),
    used_at: null,
    revoked_at: null,
    created_by: 'demo-admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'link-2',
    reservation_id: 'res-1',
    type: 'contract_sign',
    token: 'demo-contrato-1',
    expires_at: addHours(72),
    used_at: null,
    revoked_at: null,
    created_by: 'demo-admin',
    created_at: new Date().toISOString(),
  },
]

export const mockSignatures: Signature[] = [
  {
    id: 'signature-1',
    contract_id: 'contract-1',
    signer_role: 'client',
    signer_name: 'Patrícia Souza',
    signer_document: '111.222.333-44',
    signed_at: new Date().toISOString(),
    ip_address: '127.0.0.1',
    user_agent: 'Demo Browser',
    evidence_json: { method: 'typed_name' },
    document_hash: 'hash-demo-2',
    created_at: new Date().toISOString(),
  },
  {
    id: 'signature-2',
    contract_id: 'contract-1',
    signer_role: 'admin',
    signer_name: 'Administrador Demo',
    signer_document: null,
    signed_at: new Date().toISOString(),
    ip_address: '127.0.0.1',
    user_agent: 'Demo Browser',
    evidence_json: { method: 'typed_name' },
    document_hash: 'hash-demo-2',
    created_at: new Date().toISOString(),
  },
]

export const mockWhatsappMessages: WhatsappMessage[] = [
  {
    id: 'wa-1',
    reservation_id: 'res-1',
    lead_id: 'lead-2',
    template_name: 'payment_link',
    phone: '(62) 98888-2222',
    message_body: 'Olá Carlos, seu link de pagamento está pronto.',
    status: 'queued',
    provider_message_id: null,
    sent_at: null,
    error_message: null,
    created_at: new Date().toISOString(),
  },
]

export const mockSpaceMedia: SpaceMedia[] = [
  {
    id: 'media-1',
    space_id: mockSpace.id,
    type: 'image',
    title: 'Piscina coberta e aquecida',
    description: 'Área principal do espaço com iluminação em LED.',
    storage_path: null,
    external_url:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    thumbnail_path: null,
    display_order: 1,
    active: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'media-2',
    space_id: mockSpace.id,
    type: 'image',
    title: 'Área gourmet',
    description: 'Churrasqueira, apoio de alimentos e área coberta.',
    storage_path: null,
    external_url:
      'https://images.unsplash.com/photo-1505692794403-55bdef84f53d?auto=format&fit=crop&w=1200&q=80',
    thumbnail_path: null,
    display_order: 2,
    active: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'media-3',
    space_id: mockSpace.id,
    type: 'video',
    title: 'Tour completo do espaço',
    description: 'Vídeo de apresentação para o site público.',
    storage_path: null,
    external_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail_path: null,
    display_order: 3,
    active: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockCalendar: CalendarDay[] = mockReservations.map((reservation) => ({
  event_date: reservation.event_date,
  status: reservation.status,
}))

export const mockLookupByToken = (token: string): ReservationLookup | null => {
  const reservation =
    mockReservations.find((item) => item.public_link_token === token) ??
    mockReservations.find((item) => mockSecureLinks.some((link) => link.token === token && link.reservation_id === item.id))

  if (!reservation) return null

  const contract = mockContracts.find((item) => item.reservation_id === reservation.id) ?? null

  return {
    link_type:
      mockSecureLinks.find((item) => item.token === token)?.type ??
      (reservation.public_link_token === token ? 'public_token' : null),
    reservation,
    payments: mockPayments.filter((payment) => payment.reservation_id === reservation.id),
    paymentOrders: mockPaymentOrders.filter((order) => order.reservation_id === reservation.id),
    activePaymentOrder:
      mockPaymentOrders.find((order) => order.reservation_id === reservation.id && order.status === 'pending') ?? null,
    contract,
    signatures: contract ? mockSignatures.filter((signature) => signature.contract_id === contract.id) : [],
  }
}

export const mockDashboardSummary: DashboardSummary = {
  totalLeads: mockLeads.length,
  totalReservations: mockReservations.length,
  confirmedReservations: mockReservations.filter((item) => item.status === 'reservado').length,
  pendingPayments: mockPayments.filter((item) => item.status === 'pendente').length,
  pendingContracts: mockContracts.filter((item) => item.status !== 'assinado').length,
  occupancyRate: 65,
  activePaymentOrders: mockPaymentOrders.filter((item) => item.status === 'pending').length,
  mediaItems: mockSpaceMedia.length,
}
