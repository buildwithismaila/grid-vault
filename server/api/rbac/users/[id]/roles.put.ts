import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { role, userRole } from '#server/db/schema/rbac'
import { validateBody } from '#server/utils/validate'

const setUserRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:update')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const db = useDb()
  const body = await validateBody(event, setUserRolesSchema)

  // Verify all role IDs exist
  if (body.roleIds.length > 0) {
    const existing = await db.select({ id: role.id }).from(role).where(inArray(role.id, body.roleIds))
    if (existing.length !== body.roleIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'One or more role IDs are invalid' })
    }
  }

  // Replace all roles for the user
  await db.delete(userRole).where(eq(userRole.userId, id))

  if (body.roleIds.length > 0) {
    await db.insert(userRole).values(
      body.roleIds.map(roleId => ({ userId: id, roleId })),
    )
  }

  return { success: true }
})
