import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { role } from '#server/db/schema/rbac'

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(255).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:update')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing role id' })

  const body = await validateBody(event, updateRoleSchema)
  const db = useDb()

  const [existing] = await db.select().from(role).where(eq(role.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Role not found' })
  if (existing.isSystem)
    throw createError({ statusCode: 400, statusMessage: 'Cannot modify system roles' })

  const [updated] = await db.update(role)
    .set(body)
    .where(eq(role.id, id))
    .returning()

  await invalidateCache('rbac-roles')
  return updated
})
