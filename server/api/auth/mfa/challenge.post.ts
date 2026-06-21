import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '#server/db/schema/auth'
import { user } from '#server/db/schema/user'

const challengeSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { mfaToken, code } = await validateBody(event, challengeSchema)
  const userId = await consumeMfaChallenge(mfaToken)
  if (!userId) {
    logAuditEvent(event, { action: 'MFA_CHALLENGE_FAILED', outcome: 'FAILURE', details: { reason: 'invalid_or_expired_challenge' } })
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired MFA challenge' })
  }

  const db = useDb()

  const [row] = await db
    .select({ auth, user })
    .from(auth)
    .where(eq(auth.userId, userId))
    .innerJoin(user, eq(auth.userId, user.id))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (!row.auth.mfaSecret)
    throw createError({ statusCode: 400, statusMessage: 'MFA not configured' })
  if (!row.auth.mfaEnabled)
    throw createError({ statusCode: 409, statusMessage: 'MFA is not enabled' })
  if (row.user.status !== 'ACTIVE')
    throw createError({ statusCode: 403, statusMessage: 'Account is not active' })

  if (!verifyMFAToken(code, row.auth.mfaSecret)) {
    logAuditEvent(event, { action: 'MFA_CHALLENGE_FAILED', outcome: 'FAILURE', details: { reason: 'invalid_code', userId } })
    throw createError({ statusCode: 401, statusMessage: 'Invalid verification code' })
  }

  const sessionUser = await buildSessionUserFromRow(row)
  await setUserSession(event, { user: sessionUser })

  logAuditEvent(event, { action: 'MFA_CHALLENGE', resourceType: 'auth', targetUserId: sessionUser.id })
  return sessionUser
})
