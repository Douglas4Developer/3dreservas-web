import { mockCalendar } from '../lib/mock'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CalendarDay } from '../types/database'

export async function getPublicCalendar(params: {
  from: string
  to: string
  spaceSlug?: string
}): Promise<CalendarDay[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockCalendar.filter((item) => item.event_date >= params.from && item.event_date <= params.to)
  }

  const { data, error } = await supabase.rpc('get_public_calendar', {
    p_space_slug: params.spaceSlug ?? '3deventos',
    p_from: params.from,
    p_to: params.to,
  })

  if (error) throw error
  return (data ?? []) as CalendarDay[]
}
