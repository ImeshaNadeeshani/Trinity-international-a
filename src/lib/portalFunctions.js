import { supabase } from './supabase'

export async function invokePortal(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    const detail = error.context?.json ? await error.context.json().catch(() => null) : null
    throw new Error(detail?.error || error.message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}
