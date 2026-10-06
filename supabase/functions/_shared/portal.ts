import { createClient } from 'npm:@supabase/supabase-js@2'
export const cors = { 'Access-Control-Allow-Origin': Deno.env.get('PORTAL_ORIGIN') || '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
export const dbClient = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
export async function authenticated(request: Request, action: string, limit = 30) {
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization') || '' } } })
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user || !user.email_confirmed_at) throw new Error('Sign in with a verified email address.')
  const db = dbClient()
  const { data: allowed, error: limitError } = await db.rpc('portal_consume_limit', { actor: user.id, action, maximum: limit })
  if (limitError || !allowed) throw new Error('Request limit reached or portal setup is incomplete. Try again later.')
  const { data: profile, error: profileError } = await db.from('portal_profiles').select('*').eq('id', user.id).single()
  if (profileError) throw new Error('Profile unavailable.')
  return { user, profile, db, client }
}
export const sha256 = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join('')
export function decodePng(value: unknown) {
  if (typeof value !== 'string' || value.length > 2_800_000 || !value.startsWith('data:image/png;base64,')) throw new Error('A PNG signature under 2 MB is required.')
  const bytes = Uint8Array.from(atob(value.slice(22)), c => c.charCodeAt(0))
  if (bytes.length > 2_097_152 || bytes.length < 24 || ![137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)) throw new Error('Invalid PNG signature.')
  const view = new DataView(bytes.buffer), width = view.getUint32(16), height = view.getUint32(20)
  if (!width || !height || width > 4096 || height > 4096 || width * height > 8_000_000) throw new Error('Signature image dimensions are too large.')
  return bytes
}
export async function verifyWebhook(raw: string, provided: string, secret: string | undefined) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(provided)) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const signature = Uint8Array.from(provided.match(/../g)!, h => parseInt(h, 16))
  return crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(raw))
}
