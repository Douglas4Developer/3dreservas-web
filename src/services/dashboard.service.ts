import {
  mockContracts,
  mockDashboardSummary,
  mockLeads,
  mockPaymentOrders,
  mockPayments,
  mockReservations,
  mockSpaceMedia,
} from '../lib/mock'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { DashboardSummary, Reservation } from '../types/database'

function buildSummaryFromCollections(params: {
  leads: number
  reservations: Reservation[]
  paymentsPending: number
  contractsPending: number
  paymentOrdersPending: number
  mediaItems: number
}): DashboardSummary {
  const confirmed = params.reservations.filter((item) => item.status === 'reservado')
  const totalRevenue = params.reservations.reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0)
  const confirmedRevenue = confirmed.reduce((sum, item) => sum + Number(item.entry_amount ?? item.total_amount ?? 0), 0)
  const uniqueDates = new Set(params.reservations.map((item) => item.event_date)).size
  const bookedDays = confirmed.length
  const availableDays = Math.max(0, 30 - uniqueDates)

  return {
    totalLeads: params.leads,
    totalReservations: params.reservations.length,
    confirmedReservations: confirmed.length,
    pendingPayments: params.paymentsPending,
    pendingContracts: params.contractsPending,
    occupancyRate: Math.round((bookedDays / 30) * 100),
    activePaymentOrders: params.paymentOrdersPending,
    mediaItems: params.mediaItems,
    projectedRevenue: totalRevenue,
    confirmedRevenue,
    averageTicket: params.reservations.length ? Math.round(totalRevenue / params.reservations.length) : 0,
    availableDays,
    bookedDays,
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ...mockDashboardSummary,
      projectedRevenue: mockReservations.reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0),
      confirmedRevenue: mockReservations
        .filter((item) => item.status === 'reservado')
        .reduce((sum, item) => sum + Number(item.entry_amount ?? item.total_amount ?? 0), 0),
      averageTicket: 950,
      availableDays: 22,
      bookedDays: 8,
    }
  }

  const [
    { count: totalLeads, error: leadsError },
    { count: pendingPayments, error: paymentsError },
    { count: pendingContracts, error: contractsError },
    { count: activePaymentOrders, error: paymentOrdersError },
    { count: mediaItems, error: mediaError },
    { data: reservationData, error: reservationsError },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).neq('status', 'assinado'),
    supabase.from('payment_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('space_media').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('reservations').select('*').order('event_date', { ascending: true }),
  ])

  if (leadsError || paymentsError || contractsError || paymentOrdersError || mediaError || reservationsError) {
    throw leadsError || paymentsError || contractsError || paymentOrdersError || mediaError || reservationsError
  }

  return buildSummaryFromCollections({
    leads: totalLeads ?? 0,
    reservations: (reservationData ?? []) as Reservation[],
    paymentsPending: pendingPayments ?? 0,
    contractsPending: pendingContracts ?? 0,
    paymentOrdersPending: activePaymentOrders ?? 0,
    mediaItems: mediaItems ?? 0,
  })
}

export function getMockCollections() {
  return {
    leads: mockLeads,
    reservations: mockReservations,
    payments: mockPayments,
    contracts: mockContracts,
    paymentOrders: mockPaymentOrders,
    media: mockSpaceMedia,
  }
}
