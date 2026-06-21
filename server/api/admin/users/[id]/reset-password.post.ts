import { eq } from 'drizzle-orm'
import { auth, passwordResetToken } from '#server/db/schema/auth'
import { user } from '#server/db/schema/user'
import { getRouterParamOrThrow } from '#server/utils/validate'
import { AUTH } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:update')
  const id = getRouterParamOrThrow(event, 'id')

  const db = useDb()

  const [existingUser] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  if (!existingUser)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (existingUser.isSuperadmin)
    throw createError({ statusCode: 403, statusMessage: 'Cannot reset Superadmin password' })

  const [existingAuth] = await db.select().from(auth).where(eq(auth.userId, id)).limit(1)
  if (!existingAuth)
    throw createError({ statusCode: 400, statusMessage: 'User has no auth record' })

  const { rawToken, tokenHash } = generateToken()

  // Send the email first so we don't create orphaned tokens if email fails
  await sendResetPasswordEmail(existingAuth.email, rawToken)

  await db.insert(passwordResetToken).values({
    userId: id,
    tokenHash,
    expiresAt: new Date(Date.now() + AUTH.RESET_TOKEN_EXPIRY_MS),
  })

  return {
    success: true,
    message: 'Password reset link generated',
    ...(import.meta.dev && { token: rawToken }),
  }
})
