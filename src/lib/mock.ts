import type {
  CalendarDay,
  Contract,
  DashboardSummary,
  Lead,
  Payment,
  Reservation,
  ReservationLookup,
  Space,
} from '../types/database'

const today = new Date()
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (days: number) => {
  const copy = new Date(today.getTime())
  copy.setDate(copy.getDate() + days)
  return toIsoDate(copy)
}

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
    event_date: addDays(14),
    period_start: '09:00',
    period_end: '23:00',
    guests_expected: 60,
    total_amount: 950,
    entry_amount: 400,
    entry_due_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: 'aguardando_pagamento',
    public_link_token: 'demo-token-aguardando',
    notes: 'Cliente pediu espaço com visita técnica.',
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
    event_date: addDays(20),
    period_start: '09:00',
    period_end: '23:00',
    guests_expected: 80,
    total_amount: 1200,
    entry_amount: 500,
    entry_due_at: new Date().toISOString(),
    expires_at: null,
    status: 'reservado',
    public_link_token: 'demo-token-confirmado',
    notes: 'Chá revelação.',
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
    event_date: addDays(28),
    period_start: '09:00',
    period_end: '23:00',
    guests_expected: 40,
    total_amount: 800,
    entry_amount: 300,
    entry_due_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    status: 'bloqueio_temporario',
    public_link_token: 'demo-token-bloqueado',
    notes: 'Aguardando retorno do cliente.',
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
    paid_at: null,
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
    paid_at: new Date().toISOString(),
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
    file_path: 'https://example.com/contrato-demo.pdf',
    signed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'contract-2',
    reservation_id: 'res-1',
    version: 1,
    status: 'rascunho',
    file_path: null,
    signed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockCalendar: CalendarDay[] = mockReservations.map((reservation) => ({
  event_date: reservation.event_date,
  status: reservation.status,
}))

export const mockLookupByToken = (token: string): ReservationLookup | null => {
  const reservation = mockReservations.find((item) => item.public_link_token === token)
  if (!reservation) return null

  return {
    reservation,
    payments: mockPayments.filter((payment) => payment.reservation_id === reservation.id),
    contract: mockContracts.find((contract) => contract.reservation_id === reservation.id) ?? null,
  }
}

export const mockDashboardSummary: DashboardSummary = {
  totalLeads: mockLeads.length,
  totalReservations: mockReservations.length,
  confirmedReservations: mockReservations.filter((item) => item.status === 'reservado').length,
  pendingPayments: mockPayments.filter((item) => item.status === 'pendente').length,
  pendingContracts: mockContracts.filter((item) => item.status !== 'assinado').length,
  occupancyRate: 65,
}
