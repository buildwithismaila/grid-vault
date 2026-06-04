import { eq } from 'drizzle-orm'
import { role } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'setting:delete')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing role id' })

  const db = useDb()

  const [existing] = await db.select().from(role).where(eq(role.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Role not found' })
  if (existing.isSystem)
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete system roles' })

  await db.delete(role).where(eq(role.id, id))
  return { success: true }
})
