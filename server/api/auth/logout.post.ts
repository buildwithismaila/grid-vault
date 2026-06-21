export default defineEventHandler(async (event) => {
  const user = event.context.user
  await clearUserSession(event)
  if (user) {
    logAuditEvent(event, { action: 'LOGOUT', details: { email: user.email } })
  }
  return { success: true }
})
