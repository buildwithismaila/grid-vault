import { role } from '../../db/schema/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'setting:read')

  const db = useDb()
  return await db.select().from(role).orderBy(role.name)
})
