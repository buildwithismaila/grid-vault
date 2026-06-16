import { orgUnit } from '#server/db/schema/org'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'org_unit:read')
  const db = useDb()
  return await db.select().from(orgUnit).orderBy(orgUnit.name)
})
