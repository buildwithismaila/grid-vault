import { eq } from 'drizzle-orm'
import { orgUnit } from '#server/db/schema/org'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'org_unit:delete')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing org unit id' })

  const db = useDb()
  const [deleted] = await db.delete(orgUnit).where(eq(orgUnit.id, id)).returning()
  if (!deleted)
    throw createError({ statusCode: 404, statusMessage: 'Org unit not found' })
  await invalidateCache('org-units')
  return deleted
})
