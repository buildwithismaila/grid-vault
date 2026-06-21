import { eq, sql } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'
import { user } from '#server/db/schema/user'
import { loginSchema } from '#shared/schemas/user'
import { AUTH } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  const { email } = await validateBody(event, loginSchema)
  const db = useDb()

  const [row] = await db
    .select({ auth, user })
    .from(auth)
    .where(eq(auth.email, email))
    .innerJoin(user, eq(auth.userId, user.id))
    .limit(1)

  if (!row) {
    logAuditEvent(event, { action: 'LOGIN_FAILED', outcome: 'FAILURE', details: { email } })
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  if (row.auth.lockedUntil && row.auth.lockedUntil > new Date()) {
    logAuditEvent(event, { action: 'LOGIN_FAILED', outcome: 'FAILURE', details: { email, reason: 'account_locked' } })
    throw createError({ statusCode: 423, statusMessage: 'Account is locked' })
  }

  const { password } = await validateBody(event, loginSchema)
  const valid = await verifyPassword(row.auth.passwordHash, password)
  if (!valid) {
    // Atomic increment — prevents race condition from concurrent requests
    await db.update(auth).set({
      failedLoginAttempts: sql`${auth.failedLoginAttempts} + 1`,
    }).where(eq(auth.id, row.auth.id))

    const [updated] = await db.select({
      attempts: auth.failedLoginAttempts,
      lockedUntil: auth.lockedUntil,
    }).from(auth).where(eq(auth.id, row.auth.id)).limit(1)

    if (updated && updated.attempts >= AUTH.MAX_LOGIN_ATTEMPTS && !updated.lockedUntil) {
      await db.update(auth).set({
        lockedUntil: new Date(Date.now() + AUTH.LOCKOUT_DURATION_MS),
      }).where(eq(auth.id, row.auth.id))
      logAuditEvent(event, { action: 'ACCOUNT_LOCKED', outcome: 'FAILURE', details: { email, attempts: updated.attempts } })
    }

    logAuditEvent(event, { action: 'LOGIN_FAILED', outcome: 'FAILURE', details: { email } })
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  if (row.user.status !== 'ACTIVE')
    throw createError({ statusCode: 403, statusMessage: 'Account is not active' })

  await db.update(auth).set({
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: sql`now()`,
  }).where(eq(auth.id, row.auth.id))

  if (row.auth.mfaEnabled) {
    const mfaToken = await createMfaChallenge(row.auth.userId)
    return { mfaRequired: true, mfaToken }
  }

  const sessionUser = await buildSessionUserFromRow(row)
  await setUserSession(event, { user: sessionUser })

  logAuditEvent(event, { action: 'LOGIN_SUCCESS', resourceType: 'auth', details: { email } })
  return sessionUser
})
