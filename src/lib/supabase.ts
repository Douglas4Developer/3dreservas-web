import { createClient, type FunctionInvokeOptions, type Session, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const appUrl = import.meta.env.VITE_APP_URL || window.location.origin

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

function isJwtErrorMessage(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('invalid jwt') || normalized.includes('jwt') || normalized.includes('not authenticated')
}

async function validateSessionWithAuthServer(session: Session | null) {
  if (!supabase || !session?.access_token) return false

  const { data, error } = await supabase.auth.getUser(session.access_token)
  return !error && Boolean(data.user)
}

async function getCachedSession() {
  if (!supabase) return null
  const currentSession = await supabase.auth.getSession()
  if (currentSession.error) throw currentSession.error
  return currentSession.data.session ?? null
}

async function refreshAndValidateSession() {
  if (!supabase) return null

  const refreshed = await supabase.auth.refreshSession()
  if (refreshed.error) throw refreshed.error

  const refreshedSession = refreshed.data.session ?? null
  if (!refreshedSession?.access_token) return null

  const isValid = await validateSessionWithAuthServer(refreshedSession)
  if (!isValid) {
    await supabase.auth.signOut()
    throw new Error('Sua sessão do admin ficou inválida. Saia e entre novamente antes de usar os botões.')
  }

  return refreshedSession
}

async function getValidSession(): Promise<Session | null> {
  if (!supabase) return null

  const cachedSession = await getCachedSession()
  const expiresAt = cachedSession?.expires_at ? cachedSession.expires_at * 1000 : null
  const isExpiringSoon = Boolean(expiresAt && expiresAt <= Date.now() + 60_000)

  if (cachedSession?.access_token && !isExpiringSoon) {
    const isValid = await validateSessionWithAuthServer(cachedSession)
    if (isValid) return cachedSession
  }

  return refreshAndValidateSession()
}

function buildFunctionUrl(functionName: string) {
  if (!supabaseUrl) {
    throw new Error('URL do Supabase não configurada.')
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`
}

function normalizeHeaders(headers?: HeadersInit) {
  if (!headers) return new Headers()
  return new Headers(headers)
}

function buildRequestBody(body: FunctionInvokeOptions['body']) {
  if (body === undefined || body === null) return undefined
  if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || body instanceof URLSearchParams) {
    return body
  }
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

async function parseFunctionResponse(response: Response) {
  const rawText = await response.text()
  const contentType = response.headers.get('content-type') ?? ''

  if (!rawText) {
    return null
  }

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawText)
    } catch {
      return rawText
    }
  }

  try {
    return JSON.parse(rawText)
  } catch {
    return rawText
  }
}

async function performEdgeFunctionRequest<TResponse = unknown>(
  functionName: string,
  options: FunctionInvokeOptions | undefined,
  session: Session,
): Promise<TResponse> {
  const url = buildFunctionUrl(functionName)
  const headers = normalizeHeaders(options?.headers)
  const body = buildRequestBody(options?.body)

  headers.set('apikey', supabaseAnonKey ?? '')
  headers.set('Authorization', `Bearer ${session.access_token}`)

  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  })

  const payload = await parseFunctionResponse(response)

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : typeof payload === 'string'
          ? payload
          : `Falha ao chamar a função ${functionName}.`

    const error = new Error(message)
    ;(error as Error & { status?: number; payload?: unknown }).status = response.status
    ;(error as Error & { status?: number; payload?: unknown }).payload = payload
    throw error
  }

  return payload as TResponse
}

export async function invokeEdgeFunction<TResponse = unknown>(
  functionName: string,
  options?: FunctionInvokeOptions,
): Promise<TResponse> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado para invocar Edge Functions.')
  }

  let session = await getValidSession()

  if (!session?.access_token) {
    throw new Error('Sua sessão expirou. Entre novamente no admin e tente outra vez.')
  }

  try {
    return await performEdgeFunctionRequest<TResponse>(functionName, options, session)
  } catch (firstError) {
    const firstMessage = typeof (firstError as Error)?.message === 'string' ? (firstError as Error).message : ''
    const firstStatus = (firstError as Error & { status?: number })?.status

    if (firstStatus !== 401 && !isJwtErrorMessage(firstMessage)) {
      throw firstError
    }

    session = await refreshAndValidateSession()

    if (!session?.access_token) {
      throw new Error('Sua sessão expirou. Entre novamente no admin e tente outra vez.')
    }

    try {
      return await performEdgeFunctionRequest<TResponse>(functionName, options, session)
    } catch (retryError) {
      const retryMessage = typeof (retryError as Error)?.message === 'string' ? (retryError as Error).message : ''
      const retryStatus = (retryError as Error & { status?: number })?.status

      if (retryStatus === 401 || isJwtErrorMessage(retryMessage)) {
        await supabase.auth.signOut()
        throw new Error('Sessão inválida no admin. Faça login novamente e tente a ação outra vez.')
      }

      throw retryError
    }
  }
}
