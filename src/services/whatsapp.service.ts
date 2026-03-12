import { mockWhatsappMessages } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { WhatsappMessage } from '../types/database'

export async function fetchWhatsappMessages(): Promise<WhatsappMessage[]> {
  if (!isSupabaseConfigured || !supabase) return mockWhatsappMessages

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return (data ?? []) as WhatsappMessage[]
}

export async function queueWhatsappTemplate(payload: {
  reservationId?: string
  leadId?: string
  phone: string
  templateName: string
  variables?: Record<string, string>
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      status: 'queued',
    }
  }

  return invokeEdgeFunction('send-whatsapp-template', {
    body: payload,
  })
}
