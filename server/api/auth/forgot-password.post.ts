import { eq } from 'drizzle-orm'
import { auth, passwordResetToken } from '#server/db/schema/auth'
import { forgotPasswordSchema } from '#shared/schemas/user'
import { AUTH } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  const { email } = await validateBody(event, forgotPasswordSchema)
  const db = useDb()

  const [existing] = await db
    .select({ userId: auth.userId })
    .from(auth)
    .where(eq(auth.email, email))
    .limit(1)

  if (existing) {
    const { rawToken, tokenHash } = generateToken()

    // Send the email first so we don't store orphaned tokens if email fails
    await sendResetPasswordEmail(email, rawToken)

    await db.insert(passwordResetToken).values({
      userId: existing.userId,
      tokenHash,
      expiresAt: new Date(Date.now() + AUTH.RESET_TOKEN_EXPIRY_MS),
    })
  }

  logAuditEvent(event, { action: 'PASSWORD_RESET_REQUESTED', resourceType: 'auth', details: { email } })
  return { success: true, message: 'If the email exists, a reset link has been sent' }
})
