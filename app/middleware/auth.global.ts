export default defineNuxtRouteMiddleware(async (to) => {
  const publicPaths = ['/login', '/forgot-password', '/reset-password', '/accept-invite']

  if (publicPaths.some(path => to.path.startsWith(path)))
    return

  const { loggedIn, fetch } = useUserSession()
  await fetch()

  if (!loggedIn.value)
    return navigateTo('/login')
})
