import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { role, userRole } from '#server/db/schema/rbac'
import { user } from '#server/db/schema/user'
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

  // Sync user.role if the primary role was removed or no longer matches
  const [currentUser] = await db.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1)
  if (currentUser && body.roleIds.length > 0) {
    const newRoles = await db
      .select({ name: role.name })
      .from(role)
      .where(inArray(role.id, body.roleIds))

    const newRoleNames = newRoles.map(r => r.name)
    if (!newRoleNames.includes(currentUser.role)) {
      const [firstRole] = newRoles
      if (firstRole) {
        await db.update(user).set({ role: firstRole.name }).where(eq(user.id, id))
      }
    }
  }
  else if (currentUser && body.roleIds.length === 0 && currentUser.role !== 'Superadmin') {
    await db.update(user).set({ role: 'Viewer' }).where(eq(user.id, id))
  }

  return { success: true }
})
