export const staffRoles = ['board', 'admin', 'head', 'delegate', 'signatory', 'legal_reviewer']

export function portalLoadMessage(section, error) {
  const setup = ['PGRST205', 'PGRST204', '42P01', '42703', '42883'].includes(error?.code)
  return setup
    ? `${section} is unavailable because portal database setup is incomplete. Contact Trinity support. (${error.code})`
    : `${section} could not be loaded. Please retry. ${error?.message || 'Check your connection.'}`
}

// A failed optional feature must never turn successful account data into an empty list.
export async function loadPortalSnapshot(client, user, staffMode) {
  const { data: profile, error } = await client.from('portal_profiles').select('*').eq('id', user.id).single()
  if (error) throw new Error(portalLoadMessage('Your account profile', error))
  if (!profile) throw new Error('Your portal profile is missing. Contact Trinity to complete account setup.')
  const snapshot = { profile, errors: {}, applications: [], documents: [], agreements: [], notifications: [], letters: [], schedules: [], payments: [], receipts: [], people: [], templates: [], configuration: null, officers: [], activity: [], audit: [], canApprove: false }
  if (staffMode !== staffRoles.includes(profile.role)) return snapshot
  const jobs = []
  const add = (key, label, query) => jobs.push({ key, label, query })
  const own = table => client.from(table).select('*').eq('student_id', user.id)
  if (profile.role === 'student') {
    add('applications', 'Applications', own('student_applications').order('submitted_at', { ascending: false }))
    add('documents', 'Documents', own('student_documents').order('uploaded_at', { ascending: false }))
    add('agreements', 'Agreements', own('student_agreements').order('created_at', { ascending: false }))
    add('letters', 'Approval letters', own('approval_letters').order('created_at', { ascending: false }))
    add('schedules', 'Payment schedules', client.from('student_payment_schedules').select('*,payment_installments(*)').eq('student_id', user.id))
    add('payments', 'Payments', own('portal_payments').order('created_at', { ascending: false }))
    add('receipts', 'Receipts', client.from('payment_receipts').select('*'))
  } else if (profile.role !== 'legal_reviewer') {
    for (const [key, table, order] of [['applications','student_applications','submitted_at'], ['documents','student_documents','uploaded_at'], ['agreements','student_agreements','created_at'], ['letters','approval_letters','created_at'], ['payments','portal_payments','created_at']]) {
      add(key, key, client.from(table).select('*').order(order, { ascending: false }))
    }
    add('people', 'Student profiles', client.from('portal_profiles').select('*'))
    add('receipts', 'Receipts', client.from('payment_receipts').select('*'))
    add('activity', 'Application history', client.from('application_activity').select('*').order('created_at', { ascending: false }).limit(200))
    if (profile.role === 'board') add('officers', 'Approval permissions', client.from('authorized_approval_officers').select('*').eq('user_id', user.id))
  }
  add('notifications', 'Notifications', own('student_notifications').order('created_at', { ascending: false }))
  if (['admin', 'board', 'legal_reviewer'].includes(profile.role)) add('templates', 'Agreement templates', client.from('agreement_templates').select('*').order('created_at', { ascending: false }))
  if (['admin', 'legal_reviewer'].includes(profile.role)) add('configuration', 'Management settings', client.from('trinity_configuration').select('*').eq('id', true).single())
  if (profile.role === 'admin') {
    add('audit', 'Audit history', client.from('portal_audit_log').select('*').order('created_at', { ascending: false }).limit(200))
    add('officers', 'Approval permissions', client.from('authorized_approval_officers').select('*'))
    add('schedules', 'Payment schedules', client.from('student_payment_schedules').select('*,payment_installments(*)'))
  }
  await Promise.all(jobs.map(async ({key, label, query}) => {
    try {
      const { data, error } = await query
      if (error) snapshot.errors[key] = portalLoadMessage(label, error)
      else snapshot[key] = data ?? (key === 'configuration' ? null : [])
    } catch (error) { snapshot.errors[key] = portalLoadMessage(label, error) }
  }))
  snapshot.canApprove = profile.role === 'admin' || (profile.role === 'board' && snapshot.officers.some(row => row.user_id === user.id && row.active && row.can_approve_applications))
  return snapshot
}
