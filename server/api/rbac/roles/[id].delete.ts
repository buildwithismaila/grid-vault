import { eq } from 'drizzle-orm'
import { role } from '#server/db/schema/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:update')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing role id' })

  const db = useDb()

  const [existing] = await db.select({ id: role.id, name: role.name }).from(role).where(eq(role.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Role not found' })

  await db.delete(role).where(eq(role.id, id))
  await invalidateCache('rbac-roles')
  logAuditEvent(event, { action: 'ROLE_DELETED', resourceType: 'role', resourceId: id, details: { name: existing.name } })
  return { success: true }
})
