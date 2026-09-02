import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

export async function insertSubmission(table, values) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key to .env.local.')
  }

  const { error } = await supabase.from(table).insert(values)
  if (error) throw error
}

export async function uploadEligibilityDocument(file, folder) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key to .env.local.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'file'
  const safeFolder = folder.replace(/[^a-zA-Z0-9-]/g, '-')
  const objectPath = `${safeFolder}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('eligibility-documents').upload(objectPath, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return { name: file.name, path: objectPath }
}
