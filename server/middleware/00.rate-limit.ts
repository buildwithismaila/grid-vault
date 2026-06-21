const rules = [
  { path: '/api/auth/login', max: 5, window: 60, ban: 3600 },
  { path: '/api/auth/forgot-password', max: 3, window: 60, ban: 3600 },
  { path: '/api/auth/reset-password', max: 5, window: 60, ban: 3600 },
  { path: '/api/auth/accept-invite', max: 5, window: 60, ban: 3600 },
  { path: '/api/auth/invite', max: 10, window: 60, ban: 3600 },
  { path: '/api/auth/mfa/verify', max: 5, window: 60, ban: 3600 },
  { path: '/api/auth/mfa/challenge', max: 5, window: 60, ban: 3600 },
]

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  if (!url.pathname.startsWith('/api/'))
    return

  const rule = rules.find(r => r.path === url.pathname)
  if (!rule)
    return

  const storage = useStorage('shield')
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const banKey = `ban:${rule.path}:${ip}`
  const ipKey = `ip:${rule.path}:${ip}`

  const bannedUntil = await storage.getItem<number>(banKey)
  if (bannedUntil && Date.now() < bannedUntil) {
    setResponseHeader(event, 'Retry-After', Math.ceil((bannedUntil - Date.now()) / 1000))
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Try again later.' })
  }

  const now = Date.now()
  let entry: { count: number, time: number } | null = await storage.getItem(ipKey)
  if (!entry || (now - entry.time) / 1000 > rule.window) {
    entry = { count: 0, time: now }
  }

  entry.count++

  if (entry.count > rule.max) {
    await storage.setItem(banKey, now + rule.ban * 1000)
    await storage.removeItem(ipKey)
    setResponseHeader(event, 'Retry-After', rule.ban)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Try again later.' })
  }

  await storage.setItem(ipKey, entry)
})
