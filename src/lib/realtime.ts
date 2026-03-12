import { supabase } from './supabase'

export function subscribeToTables(tables: string[], onChange: () => void) {
  if (!supabase || tables.length === 0) return () => undefined

  const channel = supabase.channel(`realtime-${tables.join('-')}-${Date.now()}`)

  tables.forEach((table) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      () => onChange(),
    )
  })

  channel.subscribe()

  return () => {
    if (supabase) {
      void supabase.removeChannel(channel)
    }
  }
}
