import { mockLookupByToken, mockSignatures } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreateSignatureInput, Signature } from '../types/database'

const DEFAULT_LESSOR_SIGNATURE_NAME = 'Douglas Soares de Souza Ferreira'

function buildDouglasRubricDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220">
      <rect width="640" height="220" fill="white"/>
      <path d="M86 145 C118 92, 158 54, 214 42 C177 88, 149 126, 132 176 C178 137, 230 103, 289 92 C260 123, 238 148, 226 174 C278 135, 329 112, 390 110" fill="none" stroke="#111827" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M108 174 C178 184, 259 186, 383 172" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
      <text x="88" y="205" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#111827">Douglas Soares de Souza Ferreira</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const defaultLessorSignature = {
  signer_name: DEFAULT_LESSOR_SIGNATURE_NAME,
  signature_data_url: buildDouglasRubricDataUrl(),
}

export async function fetchSignatures(contractId: string): Promise<Signature[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockSignatures.filter((item) => item.contract_id === contractId)
  }

  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('contract_id', contractId)
    .order('signed_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Signature[]
}

export async function registerPublicSignature(input: CreateSignatureInput) {
  if (!isSupabaseConfigured || !supabase) {
    const lookup = mockLookupByToken(input.token)
    if (!lookup?.contract) throw new Error('Contrato não encontrado para esse link.')

    return {
      signature: {
        id: `signature-${Date.now()}`,
        contract_id: lookup.contract.id,
        signer_role: 'client',
        signer_name: input.signer_name,
        signer_document: input.signer_document ?? null,
        signed_at: new Date().toISOString(),
        ip_address: '127.0.0.1',
        user_agent: 'Demo Browser',
        evidence_json: { method: 'typed_name', signature_data_url: input.signature_data_url ?? null },
        document_hash: lookup.contract.document_hash ?? null,
        created_at: new Date().toISOString(),
      } satisfies Signature,
    }
  }

  return invokeEdgeFunction<{ signature: Signature }>('register-signature', {
    body: {
      ...input,
      signer_role: 'client',
    },
    requiresAuth: false,
  })
}

export async function registerAdminSignature(input: { contractId: string; signer_name: string; signer_document?: string; signature_data_url?: string }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      signature: {
        id: `signature-admin-${Date.now()}`,
        contract_id: input.contractId,
        signer_role: 'admin',
        signer_name: input.signer_name,
        signer_document: input.signer_document ?? null,
        signed_at: new Date().toISOString(),
        ip_address: '127.0.0.1',
        user_agent: 'Demo Browser',
        evidence_json: { method: 'typed_name', signature_data_url: input.signature_data_url ?? null },
        document_hash: null,
        created_at: new Date().toISOString(),
      } satisfies Signature,
    }
  }

  return invokeEdgeFunction<{ signature: Signature }>('register-signature', {
    body: {
      contractId: input.contractId,
      signer_role: 'admin',
      signer_name: input.signer_name,
      signer_document: input.signer_document,
      signature_data_url: input.signature_data_url,
    },
  })
}
