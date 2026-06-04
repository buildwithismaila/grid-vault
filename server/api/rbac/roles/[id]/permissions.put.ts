import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { role, rolePermission } from '#server/db/schema/rbac'
import { validateBody } from '#server/utils/validate'

const setPermissionsSchema = z.object({
  permissionIds: z.array(z.uuid()),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'setting:update')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing role id' })

  const db = useDb()

  const [existing] = await db.select().from(role).where(eq(role.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Role not found' })
  if (existing.isSystem)
    throw createError({ statusCode: 400, statusMessage: 'Cannot modify system role permissions' })

  const body = await validateBody(event, setPermissionsSchema)

  // Replace all permissions for the role
  await db.delete(rolePermission).where(eq(rolePermission.roleId, id))

  if (body.permissionIds.length > 0) {
    await db.insert(rolePermission).values(
      body.permissionIds.map(permissionId => ({ roleId: id, permissionId })),
    )
  }

  return { success: true }
})
