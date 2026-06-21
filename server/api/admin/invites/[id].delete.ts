import { eq } from 'drizzle-orm'
import { user, userInvitation } from '#server/db/schema/user'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:delete')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing invite id' })

  const db = useDb()

  const [existing] = await db.select().from(userInvitation).where(eq(userInvitation.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  if (existing.acceptedAt)
    throw createError({ statusCode: 400, statusMessage: 'Cannot cancel accepted invite' })

  await db.delete(userInvitation).where(eq(userInvitation.id, id))
  await db.delete(user).where(eq(user.id, existing.userId))
  return { success: true }
})
