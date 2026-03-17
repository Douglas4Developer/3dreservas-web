import { addDaysToDateString, differenceInDaysInclusive } from '../lib/format'
import { mockAddendums, mockContracts, mockReservations } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreateReservationAddendumInput, Contract, Reservation, ReservationAddendum } from '../types/database'

export async function fetchReservationAddendums(): Promise<ReservationAddendum[]> {
  if (!isSupabaseConfigured || !supabase) return mockAddendums

  const { data, error } = await supabase
    .from('reservation_addendums')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ReservationAddendum[]
}

export async function createReservationAddendum(input: CreateReservationAddendumInput) {
  if (!isSupabaseConfigured || !supabase) {
    const reservation = mockReservations.find((item) => item.id === input.reservationId)
    if (!reservation) throw new Error('Reserva não encontrada.')

    const previousEndDate = reservation.end_date ?? reservation.event_date
    const amountPerDay = input.amountPerDay ?? reservation.daily_rate ?? 0
    const extraAmount = input.extraAmount ?? amountPerDay * input.extraDays
    const newEndDate = addDaysToDateString(previousEndDate, input.extraDays)
    const updatedReservation: Reservation = {
      ...reservation,
      end_date: newEndDate,
      days_count: differenceInDaysInclusive(reservation.event_date, newEndDate),
      daily_rate: reservation.daily_rate ?? amountPerDay,
      total_amount: Number(reservation.total_amount ?? 0) + extraAmount,
      remaining_amount: Number(reservation.remaining_amount ?? 0) + extraAmount,
      updated_at: new Date().toISOString(),
    }

    const addendum: ReservationAddendum = {
      id: `add-${Date.now()}`,
      reservation_id: input.reservationId,
      contract_id: mockContracts.find((item) => item.reservation_id === input.reservationId)?.id ?? null,
      addendum_number: mockAddendums.filter((item) => item.reservation_id === input.reservationId).length + 1,
      previous_end_date: previousEndDate,
      new_end_date: newEndDate,
      extra_days: input.extraDays,
      amount_per_day: amountPerDay,
      extra_amount: extraAmount,
      notes: input.notes ?? null,
      created_by: 'demo-admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return {
      reservation: updatedReservation,
      addendum,
      contract: mockContracts.find((item) => item.reservation_id === input.reservationId) as Contract | undefined,
    }
  }

  return invokeEdgeFunction<{
    reservation: Reservation
    addendum: ReservationAddendum
    contract: Contract | null
    statusUrl?: string
    contractViewUrl?: string
    contractSignUrl?: string
  }>('create-reservation-addendum', { body: input })
}
