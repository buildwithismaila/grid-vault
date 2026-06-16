import { eq } from 'drizzle-orm'
import { jobRole } from '#server/db/schema/org'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'job_role:delete')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing job role id' })

  const db = useDb()
  const [deleted] = await db.delete(jobRole).where(eq(jobRole.id, id)).returning()
  if (!deleted)
    throw createError({ statusCode: 404, statusMessage: 'Job role not found' })
  await invalidateCache('job-roles')
  return deleted
})
