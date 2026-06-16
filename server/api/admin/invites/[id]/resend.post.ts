import { eq } from 'drizzle-orm'
import { userInvitation } from '#server/db/schema/user'
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

  const { rawToken, tokenHash } = generateToken()

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
