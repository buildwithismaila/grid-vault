import { eq } from 'drizzle-orm'
import { user, userInvitation } from '#server/db/schema/user'
import { AUTH } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:update')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing invite id' })

  const db = useDb()

  const [existing] = await db.select().from(userInvitation).where(eq(userInvitation.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  if (existing.acceptedAt)
    throw createError({ statusCode: 400, statusMessage: 'Invite already accepted' })

  const [invitedUser] = await db.select({ name: user.name }).from(user).where(eq(user.id, existing.userId)).limit(1)

  const { rawToken, tokenHash } = generateToken()

  await sendInviteEmail(existing.email, invitedUser?.name || 'User', rawToken)

  await db.update(userInvitation).set({
    tokenHash,
    expiresAt: new Date(Date.now() + AUTH.INVITE_EXPIRY_MS),
  }).where(eq(userInvitation.id, id))

  return {
    success: true,
    message: 'Invitation resent',
    ...(import.meta.dev && { token: rawToken }),
  }
})
