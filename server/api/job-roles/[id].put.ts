import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { jobRole } from '#server/db/schema/org'

const updateSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(255).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'job_role:update')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing job role id' })

  const db = useDb()
  const body = await validateBody(event, updateSchema)
  if (Object.keys(body).length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })

  const [updated] = await db.update(jobRole).set(body).where(eq(jobRole.id, id)).returning()
  if (!updated)
    throw createError({ statusCode: 404, statusMessage: 'Job role not found' })
  await invalidateCache('job-roles')
  return updated
})
