import { z } from 'zod'
import { jobRole } from '#server/db/schema/org'

const createSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: z.string().max(255).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'job_role:create')
  const db = useDb()
  const body = await validateBody(event, createSchema)
  const [created] = await db.insert(jobRole).values(body).returning()
  await invalidateCache('job-roles')
  return created
})
