import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { adminClient, corsHeaders, jsonResponse } from '../_shared/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { data, error } = await adminClient.rpc('expire_open_reservations')
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse(data)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
