import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const appUrl = import.meta.env.VITE_APP_URL || window.location.origin

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function invokeEdgeFunction<T>(
  name: string,
  options?: { body?: unknown },
): Promise<T> {
  const { data: session } = await supabase!.auth.getSession()

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${
          session?.session?.access_token ??
          import.meta.env.VITE_SUPABASE_ANON_KEY
        }`,
      },
      body: JSON.stringify(options?.body ?? {}),
    },
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message ?? 'Erro ao executar função.')
  }

  return response.json()
}