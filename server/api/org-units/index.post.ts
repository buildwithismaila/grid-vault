import { z } from 'zod'
import { orgUnit } from '#server/db/schema/org'

const createSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  type: z.enum(['HQ', 'REGION', 'AREA_OFFICE', 'SERVICE_CENTER']),
  parentId: z.string().uuid().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'org_unit:create')
  const db = useDb()
  const body = await validateBody(event, createSchema)
  const [created] = await db.insert(orgUnit).values(body).returning()
  await invalidateCache('org-units')
  return created
})
