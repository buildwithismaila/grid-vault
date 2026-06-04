import { permission } from '../../db/schema/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'setting:read')

  const db = useDb()
  return await db.select().from(permission).orderBy(permission.resource, permission.action)
})
