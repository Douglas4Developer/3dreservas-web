import { mockLookupByToken, mockSignatures } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreateSignatureInput, Signature } from '../types/database'

const DEFAULT_LESSOR_SIGNATURE_NAME = 'Douglas Soares de Souza Ferreira'

function buildDouglasRubricDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220">
      <rect width="640" height="220" fill="white"/>
      <text
        x="70"
        y="118"
        font-family="Brush Script MT, Segoe Script, Lucida Handwriting, cursive"
        font-size="96"
        font-style="italic"
        font-weight="700"
        letter-spacing="2"
        fill="#0f172a"
        transform="rotate(-6 70 118)"
      >DSSF</text>
      <path d="M82 136 C168 150, 258 150, 420 132" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
      <text
        x="86"
        y="165"
        font-family="Brush Script MT, Segoe Script, Lucida Handwriting, cursive"
        font-size="40"
        font-style="italic"
        fill="#1f2937"
      >Douglas</text>
      <text x="86" y="203" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#334155">Douglas Soares de Souza Ferreira</text>
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
