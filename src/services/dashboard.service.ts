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
import type { DashboardSummary } from '../types/database'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (!isSupabaseConfigured || !supabase) return mockDashboardSummary

  const [
    { count: totalLeads, error: leadsError },
    { count: totalReservations, error: reservationsError },
    { count: confirmedReservations, error: confirmedError },
    { count: pendingPayments, error: paymentsError },
    { count: pendingContracts, error: contractsError },
    { count: activePaymentOrders, error: paymentOrdersError },
    { count: mediaItems, error: mediaError },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'reservado'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).neq('status', 'assinado'),
    supabase.from('payment_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('space_media').select('*', { count: 'exact', head: true }).eq('active', true),
  ])

  if (leadsError || reservationsError || confirmedError || paymentsError || contractsError || paymentOrdersError || mediaError) {
    throw leadsError || reservationsError || confirmedError || paymentsError || contractsError || paymentOrdersError || mediaError
  }

  const reservedCount = confirmedReservations ?? 0
  const totalManagedDates = (totalReservations ?? 0) + 2

  return {
    totalLeads: totalLeads ?? 0,
    totalReservations: totalReservations ?? 0,
    confirmedReservations: confirmedReservations ?? 0,
    pendingPayments: pendingPayments ?? 0,
    pendingContracts: pendingContracts ?? 0,
    occupancyRate: totalManagedDates ? Math.round((reservedCount / totalManagedDates) * 100) : 0,
    activePaymentOrders: activePaymentOrders ?? 0,
    mediaItems: mediaItems ?? 0,
  }
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
