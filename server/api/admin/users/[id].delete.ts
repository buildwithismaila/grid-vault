import { eq } from 'drizzle-orm'
import { user } from '#server/db/schema/user'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:delete')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const db = useDb()

  const [existing] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (existing.role === 'Superadmin')
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete Superadmin' })

  await db.delete(user).where(eq(user.id, id))

  return { success: true }
})
