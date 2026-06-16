import { jobRole } from '#server/db/schema/org'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'job_role:read')
  const db = useDb()
  return await db.select().from(jobRole).orderBy(jobRole.name)
})
