import { createClient, type FunctionInvokeOptions, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const appUrl = import.meta.env.VITE_APP_URL || window.location.origin

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function invokeEdgeFunction<TResponse = unknown>(
  functionName: string,
  options?: FunctionInvokeOptions,
): Promise<TResponse> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado para invocar Edge Functions.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  const headersObj: { [key: string]: string } = options?.headers ?? {}

  if (accessToken && !headersObj.Authorization) {
    headersObj.Authorization = `Bearer ${accessToken}`
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    ...options,
    headers: headersObj,
  })

  if (error) throw error
  return data as TResponse
}
