import { supabase } from './supabase'

export async function downloadPrivateFile(bucket, path, filename) {
  if (!supabase) throw new Error('The portal is not configured.')
  if (!path) throw new Error('This document has not been released yet.')
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error) throw error
  if (!data?.size) throw new Error('The stored document is empty. Contact Trinity for a replacement.')
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = (filename || path.split('/').pop() || 'document').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
