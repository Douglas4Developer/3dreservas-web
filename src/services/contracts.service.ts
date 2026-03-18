import { mockContracts } from '../lib/mock'
import { appUrl, invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Contract, ContractTermsJson } from '../types/database'

export async function fetchContracts(): Promise<Contract[]> {
  if (!isSupabaseConfigured || !supabase) return mockContracts

  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Contract[]
}

export async function generateContract(reservationId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      contract: mockContracts[0],
      previewUrl: mockContracts[0]?.file_path,
    }
  }

  return invokeEdgeFunction<{ contract: Contract; previewUrl?: string; viewUrl?: string; signUrl?: string }>('generate-contract', {
    body: { reservationId },
  })
}

export async function updateContract(
  id: string,
  updates: Partial<Contract> & { contract_terms_json?: ContractTermsJson | null },
): Promise<Contract> {
  if (!isSupabaseConfigured || !supabase) {
    const contract = mockContracts.find((item) => item.id === id)
    if (!contract) throw new Error('Contrato não encontrado.')
    return { ...contract, ...updates, updated_at: new Date().toISOString() } as Contract
  }

  const { data, error } = await supabase
    .from('contracts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Contract
}

export async function deleteContract(contractId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true }
  }

  return invokeEdgeFunction<{ ok: boolean }>('delete-admin-entity', {
    body: {
      entity: 'contract',
      id: contractId,
    },
  })
}

export async function getReservationLinks(reservationId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      statusUrl: `${appUrl}/minha-reserva/demo-token`,
      contractViewUrl: `${appUrl}/contrato/demo-view-token`,
      contractSignUrl: `${appUrl}/contrato/demo-sign-token`,
      reservationWhatsappUrl: 'https://wa.me/556284876724',
      contractWhatsappUrl: 'https://wa.me/556284876724',
    }
  }

  return invokeEdgeFunction<{
    statusUrl: string
    contractViewUrl: string | null
    contractSignUrl: string | null
    reservationWhatsappUrl: string
    contractWhatsappUrl: string | null
  }>('get-reservation-links', {
    body: { reservationId },
  })
}
