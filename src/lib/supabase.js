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
