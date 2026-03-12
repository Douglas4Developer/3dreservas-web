import { mockContracts, mockDashboardSummary, mockLeads, mockPayments, mockReservations } from '../lib/mock'
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
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'reservado'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).neq('status', 'assinado'),
  ])

  if (leadsError || reservationsError || confirmedError || paymentsError || contractsError) {
    throw leadsError || reservationsError || confirmedError || paymentsError || contractsError
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
  }
}

export function getMockCollections() {
  return {
    leads: mockLeads,
    reservations: mockReservations,
    payments: mockPayments,
    contracts: mockContracts,
  }
}
