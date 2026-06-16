import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { orgUnit } from '#server/db/schema/org'

const updateSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  type: z.enum(['HQ', 'REGION', 'AREA_OFFICE', 'SERVICE_CENTER']).optional(),
  parentId: z.string().uuid().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'org_unit:update')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing org unit id' })

  const db = useDb()
  const body = await validateBody(event, updateSchema)
  if (Object.keys(body).length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })

  const [updated] = await db.update(orgUnit).set(body).where(eq(orgUnit.id, id)).returning()
  if (!updated)
    throw createError({ statusCode: 404, statusMessage: 'Org unit not found' })
  await invalidateCache('org-units')
  return updated
})
