import { addDaysToDateString, differenceInDaysInclusive } from '../lib/format'
import { mockLookupByToken, mockReservations, mockSpace } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreateReservationInput, Reservation, ReservationLookup } from '../types/database'

function normalizeReservationPayload(input: CreateReservationInput) {
  const eventDate = input.event_date
  const daysCount = Math.max(Number(input.days_count ?? differenceInDaysInclusive(eventDate, input.end_date)), 1)
  const endDate = input.end_date ?? addDaysToDateString(eventDate, daysCount - 1)
  const totalAmount = input.total_amount ?? null
  const entryAmount = input.entry_amount ?? null
  const remainingAmount = input.remaining_amount ?? (totalAmount !== null && entryAmount !== null ? totalAmount - entryAmount : null)

  return {
    space_id: input.space_id || mockSpace.id,
    lead_id: input.lead_id ?? null,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_email: input.customer_email ?? null,
    customer_document: input.customer_document ?? null,
    customer_address: input.customer_address ?? null,
    event_date: eventDate,
    end_date: endDate,
    days_count: daysCount,
    daily_rate: input.daily_rate ?? null,
    event_type: input.event_type ?? null,
    period_start: input.period_start ?? '09:00',
    period_end: input.period_end ?? '23:00',
    total_amount: totalAmount,
    entry_amount: entryAmount,
    remaining_amount: remainingAmount,
    cleaning_fee: input.cleaning_fee ?? 100,
    status: input.status ?? 'interesse_enviado',
    notes: input.notes ?? null,
  }
}

export async function fetchReservations(): Promise<Reservation[]> {
  if (!isSupabaseConfigured || !supabase) return mockReservations

  const { data, error } = await supabase.from('reservations').select('*').order('event_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as Reservation[]
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const payload = normalizeReservationPayload(input)

  if (!isSupabaseConfigured || !supabase) {
    return {
      id: `res-${Date.now()}`,
      guests_expected: null,
      entry_due_at: null,
      expires_at: null,
      public_link_token: `demo-token-${Date.now()}`,
      image_use_authorized: true,
      venue_address_snapshot: 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia - GO',
      capacity_snapshot: 100,
      created_by: 'demo-admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    }
  }

  const { data, error } = await supabase.from('reservations').insert(payload).select('*').single()
  if (error) throw error
  return data as Reservation
}

export async function updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
  if (!isSupabaseConfigured || !supabase) {
    const reservation = mockReservations.find((item) => item.id === id)
    if (!reservation) throw new Error('Reservation not found')
    return { ...reservation, ...updates, updated_at: new Date().toISOString() }
  }

  const normalizedUpdates = { ...updates }
  if (normalizedUpdates.event_date || normalizedUpdates.end_date || normalizedUpdates.days_count !== undefined) {
    const eventDate = normalizedUpdates.event_date ?? null
    const endDate = normalizedUpdates.end_date ?? null

    if (eventDate) {
      const daysCount = Math.max(
        Number(normalizedUpdates.days_count ?? differenceInDaysInclusive(eventDate, endDate)),
        1,
      )
      normalizedUpdates.days_count = daysCount
      normalizedUpdates.end_date = endDate ?? addDaysToDateString(eventDate, daysCount - 1)
    }
  }

  if (
    normalizedUpdates.total_amount !== undefined ||
    normalizedUpdates.entry_amount !== undefined ||
    normalizedUpdates.daily_rate !== undefined ||
    normalizedUpdates.days_count !== undefined
  ) {
    if (
      normalizedUpdates.total_amount === undefined &&
      normalizedUpdates.daily_rate !== undefined &&
      normalizedUpdates.days_count !== undefined
    ) {
      normalizedUpdates.total_amount = Number(normalizedUpdates.daily_rate ?? 0) * Number(normalizedUpdates.days_count ?? 1)
    }
    const total = normalizedUpdates.total_amount ?? null
    const entry = normalizedUpdates.entry_amount ?? null
    if (normalizedUpdates.remaining_amount === undefined && total !== null && entry !== null) {
      normalizedUpdates.remaining_amount = total - entry
    }
  }

  const { data, error } = await supabase
    .from('reservations')
    .update({ ...normalizedUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Reservation
}

export async function deleteReservation(reservationId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true }
  }

  return invokeEdgeFunction<{ ok: boolean }>('delete-admin-entity', {
    body: {
      entity: 'reservation',
      id: reservationId,
    },
  })
}

export async function fetchReservationLookupByToken(token: string): Promise<ReservationLookup | null> {
  if (!isSupabaseConfigured || !supabase) return mockLookupByToken(token)

  const { data, error } = await supabase.rpc('get_public_reservation_lookup', {
    p_token: token,
  })

  if (error) throw error
  if (!data) return null
  return data as ReservationLookup
}
