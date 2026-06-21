export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  // Attach the user to context for downstream handlers
  event.context.user = session?.user ?? null

  // Preload permissions for non-superadmin users
  if (session?.user && !session.user.isSuperadmin) {
    const perms = await getUserPermissions(session.user.id)
    event.context.permissions = perms
  }
  else if (session?.user) {
    event.context.permissions = [] // Superadmin bypasses checks anyway
  }
})
