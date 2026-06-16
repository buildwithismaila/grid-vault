import { and, eq, gt, isNull } from 'drizzle-orm'
import { auth, passwordResetToken } from '#server/db/schema/auth'
import { resetPasswordSchema } from '#shared/schemas/user'

export default defineEventHandler(async (event) => {
  const { token, password } = await validateBody(event, resetPasswordSchema)
  const tokenHash = hashToken(token)
  const db = useDb()

  const [resetRecord] = await db
    .select()
    .from(passwordResetToken)
    .where(
      and(
        eq(passwordResetToken.tokenHash, tokenHash),
        isNull(passwordResetToken.usedAt),
        gt(passwordResetToken.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!resetRecord) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired reset token' })
  }

  const passwordHash = await hashPassword(password)

  await db.transaction(async (tx) => {
    await tx.update(auth)
      .set({ passwordHash })
      .where(eq(auth.userId, resetRecord.userId))

    await tx.update(passwordResetToken)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetToken.id, resetRecord.id))
  })

  return { success: true }
})
