export function checkoutUrl(value) {
  const message = 'The payment provider returned an invalid checkout link. Contact Trinity.'
  let url
  try {
    if (typeof value !== 'string' || !value.trim()) throw new Error(message)
    url = new URL(value)
  } catch { throw new Error(message) }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(message)
  return url.href
}
