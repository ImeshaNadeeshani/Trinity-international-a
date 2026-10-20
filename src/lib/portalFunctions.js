import { supabase } from './supabase'

export async function invokePortal(name, body) {
  if (!supabase) throw new Error('The portal is not configured. Contact Trinity support.')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    const detail = error.context?.json ? await error.context.json().catch(() => null) : null
    throw new Error(detail?.error || error.message)
  }
  if (data?.error) throw new Error(data.error)
  if (!data || typeof data !== 'object') throw new Error('The portal service returned an invalid response. Please try again.')
  return data
}
