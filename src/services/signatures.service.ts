import { mockLookupByToken, mockSignatures } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreateSignatureInput, Signature } from '../types/database'

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
        evidence_json: {
          method: input.signature_data_url ? 'drawn_signature' : 'typed_name',
          signature_data_url: input.signature_data_url ?? null,
        },
        document_hash: lookup.contract.document_hash ?? null,
        created_at: new Date().toISOString(),
      } satisfies Signature,
      pdfUrl: lookup.contract.final_file_path ?? lookup.contract.file_path ?? null,
    }
  }

  return invokeEdgeFunction<{ signature: Signature; pdfUrl?: string | null }>('register-signature', {
    body: input,
  })
}

export async function registerAdminSignature(input: {
  contractId: string
  signer_name: string
  signer_document?: string
  signature_data_url?: string
}) {
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
        evidence_json: {
          method: input.signature_data_url ? 'drawn_signature' : 'typed_name',
          signature_data_url: input.signature_data_url ?? null,
        },
        document_hash: null,
        created_at: new Date().toISOString(),
      } satisfies Signature,
      pdfUrl: null,
    }
  }

  return invokeEdgeFunction<{ signature: Signature; pdfUrl?: string | null }>('register-signature', {
    body: {
      contractId: input.contractId,
      signer_role: 'admin',
      signer_name: input.signer_name,
      signer_document: input.signer_document,
      signature_data_url: input.signature_data_url,
    },
  })
}
