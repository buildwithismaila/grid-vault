import { z } from 'zod'
import { role } from '../../db/schema/rbac'
import { validateBody } from '../../utils/validate'

const createRoleSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(255).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'setting:create')

  const body = await validateBody(event, createRoleSchema)
  const db = useDb()

  const [created] = await db.insert(role).values({
    name: body.name,
    description: body.description,
  }).returning()

  return created
})
