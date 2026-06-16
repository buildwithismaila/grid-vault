import { permission } from '#server/db/schema/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:read')

  const db = useDb()
  return await db.select().from(permission).orderBy(permission.resource, permission.action)
})
